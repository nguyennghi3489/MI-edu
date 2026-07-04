# EduPlatform

Two independent apps, deployed separately. AWS deploy deferred — Docker for now.

- `apps/api` — NestJS + Prisma + PostgreSQL (BE)
- `apps/web` — Nuxt 4, SPA mode (FE; teacher + student screens, PWA later)

Ports: web on 3000 (Nuxt default), api on 3001 (`PORT` env overrides).

## apps/api

```sh
cd apps/api
npm install
docker compose up -d          # Postgres on localhost:5433
npx prisma migrate dev        # run migrations
npm run start:dev             # http://localhost:3001/api/health
```

## apps/web

```sh
cd apps/web
npm install
npm run dev                   # http://localhost:3000 (proxies /api to :3001)
```
# MI-edu
