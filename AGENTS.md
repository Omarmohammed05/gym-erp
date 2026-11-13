# AGENTS.md — how this repo actually runs

## Shape
- `server/` — Hono API (Worker-compatible handlers), Better Auth for staff sessions, Drizzle ORM over Postgres.
- `web/` — React + Vite + Tailwind staff app (design tokens live in `docs/design/aura_kinetic_erp/DESIGN.md`).
- One container runs both: Vite on `:3000` proxies `/api` → Hono on `127.0.0.1:8000`. Do not split the browser across
  two hostnames — session cookies are same-site by design.

## Run
```bash
docker compose -f docker-compose.base44.yml up -d --build
```
`setup` is one-shot and idempotent: `npm install` → `drizzle-kit generate` → `drizzle-kit migrate` → seed.
`app` waits for it, then runs `npm run dev` (tsx watch + vite). Schema changes need no manual step: the next
`up` regenerates and applies migrations. Generated SQL lives in `server/migrations/` and is committed.

Host has no Node/Postgres. Run every command inside the container:
```bash
docker compose -f docker-compose.base44.yml exec -T app sh -lc 'npm run typecheck'
docker compose -f docker-compose.base44.yml exec -T app sh -lc 'npm run db:seed -w server'
```

## Demo data (seeded once, skipped if tenant `kinetic` exists)
| email | role | password |
|---|---|---|
| owner@kinetic.eg | Owner (all branches) | `Kinetic123!` |
| manager@kinetic.eg | Manager | `Kinetic123!` |
| reception@kinetic.eg | Receptionist (Zamalek) | `Kinetic123!` |
| accountant@kinetic.eg | Accountant (all branches) | `Kinetic123!` |

Tenant: **Kinetic Gym** (slug `kinetic`), branches Zamalek + New Cairo, six system roles.

## Non-obvious rules
- **Every handler reads the DB through `scopedDb(ctx)`** (`server/src/lib/scoped-db.ts`). It pins `tenant_id` and
  branch scope. Importing `db` directly in a route bypasses tenant isolation — don't.
- **Permissions** are strings checked with `requirePermission('x')` using the catalogue in `server/src/lib/rbac.ts`
  (also served at `GET /api/v1/roles/permissions` so the UI never duplicates it).
- **Audit log is append-only** — `scopedDb(ctx).audit.record(...)` after every money, permission, staff or branch change.
- **Better Auth tables** (`user`, `session`, `account`, `verification`) are hand-declared in `server/src/db/schema.ts`
  to keep one migration chain. If Better Auth is upgraded a major version, re-check those columns against its schema.
- **Vite host check**: the sandbox preview proxies a public hostname in, so `web/vite.config.ts` adds
  `3000-<BASE44_PUBLIC_HOST_SUFFIX>` to `allowedHosts` **only when `BASE44_PREVIEW_MODE === '1'`**. Other
  environments keep Vite's default. Without this the preview returns `403 Blocked request`.
- **`BETTER_AUTH_SECRET`** comes from `/run/base44/app.env` (last `env_file`, so it wins). `.env.base44-defaults`
  holds a development placeholder only.
- Local DB credentials are dev-only and inline in compose (`gym` / `gym_dev_password`), never in the secret store.

## Verify a change
```bash
curl -s localhost:8000/api/v1/health
curl -s -c /tmp/c.txt -X POST localhost:3000/api/auth/sign-in/email \
  -H 'content-type: application/json' -d '{"email":"owner@kinetic.eg","password":"Kinetic123!"}'
curl -s -b /tmp/c.txt localhost:3000/api/v1/me
```
Expected boundaries: anonymous `/api/v1/me` → 401; receptionist `POST /api/v1/branches` → 403.

## Not built yet
Cloudflare Workers/Neon deployment (needs a DB adapter swap), member PWA, i18n/RTL dictionaries, and slices 2–16
from the spec. The UI is English-only for now.
