# =============================================================================
# OpenFCM backend image — Laravel 11 API on php-fpm 8.3
# -----------------------------------------------------------------------------
# Multi-stage:
#   1. composer   — resolve PHP dependencies with the composer CLI
#   2. base       — php-fpm 8.3 + required extensions + non-root user (shared)
#   3. development— base + xdebug + full (dev) deps, source bind-mounted
#   4. production — base + baked code + optimized autoloader/caches (default)
#
# Built from the repo ROOT (context: .) so we can COPY backend/ in.
# =============================================================================

ARG PHP_VERSION=8.3

# -----------------------------------------------------------------------------
# Stage 1 — composer dependencies (cached independently of source changes)
# -----------------------------------------------------------------------------
FROM composer:2 AS composer

WORKDIR /app

# Copy only the manifests first so `composer install` is cached until they change.
COPY backend/composer.json backend/composer.lock ./

# Install production deps only. Scripts are skipped here because artisan needs
# the full app tree (copied later); we run package:discover in the final stage.
RUN composer install \
        --no-dev \
        --no-scripts \
        --no-autoloader \
        --prefer-dist \
        --no-interaction \
        --no-progress

# -----------------------------------------------------------------------------
# Stage 2 — base runtime: php-fpm 8.3 with the extensions Laravel + this app need
# -----------------------------------------------------------------------------
FROM php:${PHP_VERSION}-fpm-bookworm AS base

# System libraries required to build the PHP extensions below.
RUN apt-get update && apt-get install -y --no-install-recommends \
        git \
        unzip \
        libzip-dev \
        libicu-dev \
        libpng-dev \
        libonig-dev \
        libxml2-dev \
        procps \
        wget \
    && rm -rf /var/lib/apt/lists/*

# Core extensions:
#   pdo_mysql — MySQL 8 driver
#   pcntl     — required by queue:work (signal handling / graceful restart)
#   opcache   — bytecode cache (tuned in php.ini)
#   bcmath/intl/zip/gd/mbstring — common Laravel + payload/image needs
RUN docker-php-ext-configure intl \
    && docker-php-ext-install -j"$(nproc)" \
        pdo_mysql \
        pcntl \
        bcmath \
        intl \
        zip \
        gd \
        opcache

# phpredis (Redis client) via PECL — matches REDIS_CLIENT=phpredis.
RUN pecl install redis \
    && docker-php-ext-enable redis

# Production PHP + opcache tuning.
COPY infra/docker/backend/php.ini /usr/local/etc/php/conf.d/zz-openfcm.ini

# Lightweight php-fpm healthcheck helper used by the compose healthchecks.
COPY infra/docker/backend/php-fpm-healthcheck.sh /usr/bin/php-fpm-healthcheck
RUN chmod +x /usr/bin/php-fpm-healthcheck

# Supervisor is used by the `queue` service to run multiple workers.
RUN apt-get update && apt-get install -y --no-install-recommends supervisor \
    && rm -rf /var/lib/apt/lists/*

# Bring the composer binary in so devs / entrypoints can run it if needed.
COPY --from=composer /usr/bin/composer /usr/bin/composer

# ---- Non-root user -----------------------------------------------------------
# php-fpm workers must not run as root. We create an unprivileged `openfcm`
# user and repoint the default www-data pool to it.
RUN groupadd -g 1000 openfcm \
    && useradd -u 1000 -g openfcm -m -s /bin/bash openfcm
RUN sed -i 's/^user = www-data/user = openfcm/; s/^group = www-data/group = openfcm/' \
        /usr/local/etc/php-fpm.d/www.conf

WORKDIR /var/www/html

# Entrypoint runs migrations/caches on the `app` role, then execs the CMD.
COPY infra/docker/backend/entrypoint.sh /usr/local/bin/entrypoint
RUN chmod +x /usr/local/bin/entrypoint
ENTRYPOINT ["entrypoint"]

# -----------------------------------------------------------------------------
# Stage 3 — development: xdebug + writable bind-mounted source (see override)
# -----------------------------------------------------------------------------
FROM base AS development

RUN pecl install xdebug \
    && docker-php-ext-enable xdebug

ENV APP_ENV=local
USER openfcm
# Source is bind-mounted by docker-compose.override.yml; nothing baked in.
CMD ["php-fpm"]

# -----------------------------------------------------------------------------
# Stage 4 — production (default target): bake code + optimized autoloader
# -----------------------------------------------------------------------------
FROM base AS production

ENV APP_ENV=production

# Vendored dependencies from stage 1.
COPY --from=composer /app/vendor ./vendor
# Application source.
COPY backend/ ./

# Regenerate the optimized, authoritative autoloader now the full tree exists.
RUN composer dump-autoload --optimize --classmap-authoritative --no-dev

# Laravel needs storage/ and bootstrap/cache writable by the runtime user.
RUN chown -R openfcm:openfcm /var/www/html \
    && chmod -R ug+rwX storage bootstrap/cache

USER openfcm
EXPOSE 9000
CMD ["php-fpm"]
