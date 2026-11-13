# gym-erp

Multi-tenant gym ERP for Egypt. This branch is the foundation slice: tenants, branches, staff, roles/permissions
and an append-only audit log, on a Hono + Postgres + React (Vite) stack.

## Run it

```bash
docker compose -f docker-compose.base44.yml up -d --build
```

Open <http://localhost:3000>. The one-shot `setup` service installs dependencies, generates and applies
migrations, and seeds a demo gym.

## Demo accounts

All use the password `Kinetic123!`:

| Email | Role |
| --- | --- |
| owner@kinetic.eg | Owner |
| manager@kinetic.eg | Manager |
| reception@kinetic.eg | Receptionist |
| accountant@kinetic.eg | Accountant |

## Develop

```bash
docker compose -f docker-compose.base44.yml exec -T app sh -lc 'npm run typecheck'
docker compose -f docker-compose.base44.yml exec -T app sh -lc 'npm run db:generate -w server'
```

Architecture notes, conventions and verification steps are in [AGENTS.md](./AGENTS.md).
Design references (Stitch exports) are in [docs/design](./docs/design).
