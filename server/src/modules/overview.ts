import { Hono } from 'hono';
import type { AppEnv } from '../lib/context';
import { scopedDb } from '../lib/scoped-db';

export const overviewRoutes = new Hono<AppEnv>();

/** One light call that feeds the dashboard: counts, branch cards, recent activity. */
overviewRoutes.get('/', async (c) => {
  const ctx = c.get('ctx');
  const s = scopedDb(ctx);

  const [branchRows, staffRows, roleRows, auditRows] = await Promise.all([
    s.branches.list(),
    s.staff.list(),
    s.roles.list(),
    s.audit.list(60),
  ]);

  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const audit7d = auditRows.filter((a) => new Date(a.at).getTime() >= weekAgo).length;

  return c.json({
    counts: {
      branches: branchRows.length,
      staff: staffRows.filter((s) => s.active).length,
      roles: roleRows.length,
      audit7d,
    },
    branches: branchRows.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      phone: b.phone,
      timezone: b.timezone,
      hours: b.hours,
    })),
    recent: auditRows.slice(0, 8),
    roleName: ctx.roleName,
  });
});
