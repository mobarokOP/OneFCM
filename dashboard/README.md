# OpenFCM — Admin Dashboard

Modern admin console for **OpenFCM**, an open-source, self-hostable Android push‑notification platform (OneSignal‑style) built on Firebase Cloud Messaging.

Built with Vite + React 18 + TypeScript, Tailwind CSS v3, React Router v6, TanStack Query, axios, Recharts, react‑hook‑form + zod, Zustand and sonner.

## Features

- JWT auth (login / register) with axios interceptor and automatic 401 → `/login` redirect
- Sidebar + top‑bar layout, light/dark mode (system aware, header toggle)
- Global application switcher (persisted `appId`)
- Overview KPIs + delivery trend chart + recent notifications
- Applications CRUD + per‑app settings & rate limits
- Full notification composer (content, custom data, priority/ttl/channel, audience selector, schedule, live preview)
- Notification detail with stats + delivery logs
- Users, Devices (segment filter + search), Segments (filter builder), Topics
- Analytics: timeseries, by country, by Android version, sent→delivered→opened funnel
- Delivery logs, API keys (create once + copy / revoke), account settings
- Reusable design system: Button, Card, Input, Select, Modal, Table + pagination, Badge, StatCard, EmptyState, Skeleton, PageHeader
- Skeleton loaders, empty states, toast notifications, fully responsive

## Requirements

- Node.js 18+ (tested on Node 25)
- The OpenFCM backend running on `http://localhost:8000` (see `API_CONTRACT.md`)

## Setup

```bash
cd dashboard
npm install
```

Environment (already provided in `.env`):

```
VITE_API_BASE=http://localhost:8000/v1
```

## Scripts

```bash
npm run dev      # start dev server on http://localhost:5173 (proxies /v1 → :8000)
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build
npm run lint     # tsc --noEmit type check
```

## Dev proxy

`vite.config.ts` proxies `/v1` → `http://localhost:8000`, so the app works even if
`VITE_API_BASE` is set to a relative path. By default it calls the backend directly
via `VITE_API_BASE`.

## Project structure

```
src/
  api/         Typed API layer, one file per resource (matches API_CONTRACT.md)
  components/  ui/ (design system), layout/, charts/
  hooks/       useApps, useCurrentApp, useDebounce
  pages/       One file per route
  store/       Zustand stores: auth, selected app, theme
  types/       Shared TypeScript types
  lib/         utils (cn, formatting, clipboard)
```

## API contract

The API layer in `src/api/` is a direct mapping of `../API_CONTRACT.md`. List
endpoints tolerate both `{ data, meta }` and bare arrays; single resources are
unwrapped from `{ data }`. If an endpoint is not yet implemented on the backend,
the corresponding screen still renders its loading and empty states rather than
crashing.
