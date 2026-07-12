# OpenFCM — Infrastructure

DevOps layer for **OpenFCM**, an Android push-notification SaaS built on
**Laravel 11 (PHP 8.3) + React (Vite) + Redis 7 + MySQL 8**, delivering via
**Firebase Cloud Messaging HTTP v1**.

This directory contains everything needed to run the full stack with Docker.

```
docker-compose.yml            # production stack (all services)
docker-compose.override.yml   # local dev overrides (bind mounts + hot reload)
.env.example                  # every env var the stack consumes
.dockerignore                 # root build-context ignore
infra/
├── docker/
│   ├── backend/              # php-fpm 8.3 multi-stage image + php.ini + entrypoint
│   └── dashboard/            # node build -> nginx static image + SPA nginx.conf
├── nginx/default.conf        # edge reverse proxy (API + SPA + rate limits + headers)
├── supervisor/supervisord.conf # push queue workers + default worker
├── redis/redis.conf          # prod Redis defaults (AOF, maxmemory, LRU)
└── README.md
.github/workflows/
├── ci.yml                    # backend + dashboard CI
└── deploy.yml                # build/push images on tag (skeleton)
```

## Services

| Service     | Image / build              | Purpose                                                        | Ports (host) |
|-------------|----------------------------|----------------------------------------------------------------|--------------|
| `nginx`     | `nginx:1.27-alpine`        | Edge proxy: `/v1` `/api` → php-fpm, everything else → SPA       | 80 (443 opt) |
| `app`       | `infra/docker/backend`     | Laravel API on php-fpm 8.3                                      | internal     |
| `dashboard` | `infra/docker/dashboard`   | React SPA served static by nginx                               | internal     |
| `mysql`     | `mysql:8.0`                | Primary datastore                                              | 3306 (dev)   |
| `redis`     | `redis:7-alpine`           | Cache + queue + FCM OAuth token cache                          | 6379 (dev)   |
| `queue`     | `infra/docker/backend`     | `queue:work push` workers under supervisor                    | internal     |
| `scheduler` | `infra/docker/backend`     | `schedule:work` (promotes due scheduled sends)                 | internal     |

The **backend image is built once** and reused by `app`, `queue` and
`scheduler`, so the API, workers and scheduler all run identical code.

## Quick start

```bash
# 1. From the repo root, create your env file and fill in secrets.
cp .env.example .env
#    -> set DB_PASSWORD, DB_ROOT_PASSWORD, REDIS_PASSWORD, JWT_SECRET

# 2. Generate an APP_KEY (needed for encryption/sessions) and paste into .env.
docker compose run --rm app php artisan key:generate --show

# 3. Bring the stack up.
#    In DEV, docker-compose.override.yml is applied automatically (bind mounts,
#    Vite HMR on :5173, nginx on :8000, exposed MySQL/Redis).
docker compose up -d

# 4. Tail logs.
docker compose logs -f app queue
```

- Dashboard (dev, Vite HMR): <http://localhost:5173>
- API (dev): <http://localhost:8000/v1> (matches `API_CONTRACT.md` base URL)

### Production-like run (ignore dev overrides)

```bash
docker compose -f docker-compose.yml up -d
```

Edge nginx then serves the built SPA and the API on `HTTP_PORT` (default 80).

## Required environment variables

All variables are documented inline in [`.env.example`](../.env.example). The
must-set-before-boot secrets:

| Variable            | Why                                                        |
|---------------------|------------------------------------------------------------|
| `APP_KEY`           | Laravel encryption/session key (`php artisan key:generate`) |
| `DB_PASSWORD`       | MySQL app user password                                    |
| `DB_ROOT_PASSWORD`  | MySQL root password (used by healthcheck)                  |
| `REDIS_PASSWORD`    | Redis auth (enforced via `--requirepass`)                  |
| `JWT_SECRET`        | Signs dashboard admin JWTs                                 |

> **FCM note:** per-application Firebase **service-account JSON** credentials are
> uploaded in the dashboard and stored **encrypted in MySQL** (one Firebase
> project per application). They are *not* environment variables. Each send
> resolves the application's own service account, mints an OAuth token, and
> caches it in Redis (`API_CONTRACT.md` lifecycle step 3). `FCM_DEFAULT_PROJECT_ID`
> is only an optional global default for tooling.

## Scaling the push workers

Delivery is queue-based. The `push` queue (Redis) is drained by supervisor-managed
workers. Two independent knobs:

```bash
# Workers PER container (supervisor numprocs), set in .env:
QUEUE_WORKERS=8

# Number of worker CONTAINERS (horizontal scale):
docker compose up -d --scale queue=4
```

**Total concurrency = `QUEUE_WORKERS` × replicas** (e.g. 8 × 4 = 32 workers).
Because `scheduler` must never run more than once (duplicate dispatches), only
`queue` is safe to scale — leave `scheduler` at 1.

Batches are capped at ≤500 devices per `SendFcmBatchJob` (per the contract), so
scale worker count with send volume and FCM quota, not batch size.

## Operations

```bash
# Run an artisan command in the app container
docker compose exec app php artisan migrate:status

# Restart just the workers after a code deploy
docker compose restart queue scheduler

# Inspect the push queue depth
docker compose exec redis redis-cli -a "$REDIS_PASSWORD" llen queues:push
```

## Production checklist

- [ ] **TLS / HTTPS** — terminate TLS at a load balancer / Cloudflare / Traefik in
      front of `nginx`, **or** enable the 443 server block in
      `infra/nginx/default.conf` and mount certs into `infra/nginx/certs`. HSTS is
      already sent. The PRD mandates HTTPS-only.
- [ ] **Secret management** — do not ship a real `.env`. Inject secrets via your
      orchestrator (Docker/K8s secrets, SSM, Vault). Rotate `JWT_SECRET`,
      `APP_KEY`, DB and Redis passwords.
- [ ] **`APP_DEBUG=false`** and `APP_ENV=production` in prod.
- [ ] **Backups** — schedule `mysqldump` (or managed-DB snapshots) for MySQL and
      persist the Redis AOF (`redis_data` volume). Test restores.
- [ ] **Volumes** — ensure `mysql_data`, `redis_data`, `backend_storage` live on
      durable storage; back them up.
- [ ] **Resource limits** — set `deploy.resources` / cgroup limits per service;
      tune `QUEUE_WORKERS` to CPU.
- [ ] **Monitoring** — scrape the `/healthz` edge endpoint and container
      healthchecks; alert on queue depth (`queues:push`) and failed jobs.
- [ ] **Log shipping** — all services log to stdout/stderr; forward to your log
      platform.
- [ ] **Rate limits** — review the nginx `limit_req` zones and Laravel throttle
      middleware against real traffic (SDK ingest vs. auth vs. send).
- [ ] **DB migrations** — run automatically by the `app` container entrypoint on
      startup; for zero-downtime deploys prefer expand/contract migrations.
- [ ] **Image provenance** — pin base image digests and scan images in CI before
      promoting.

## How it fits together

```
                         ┌─────────────┐
  Android SDK  ─────┐    │             │  FastCGI (:9000)   ┌──────────┐
  REST API user ────┼──▶ │  nginx      │ ─── /v1 /api ────▶ │  app     │
  Dashboard user ───┘    │  (edge)     │                    │ php-fpm  │
                         │  TLS,gzip,  │ ─── /  (SPA) ─────▶ ┌──────────┐
                         │  headers,   │                    │dashboard │
                         │  rate limit │                    │  nginx   │
                         └─────────────┘                    └──────────┘
                                                                 │
             enqueue push jobs ──▶  Redis (queue `push`) ◀── queue:work (supervisor, xN)
                                        │                          │
                                   cache / OAuth token         FCM HTTP v1
                                        │                          │
                                     MySQL 8  ◀── delivery_logs, notifications, ...
                                        ▲
                              scheduler (schedule:work) promotes due `schedules`
```
