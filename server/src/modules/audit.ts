import { Hono } from 'hono';
import { requirePermission, type AppEnv } from '../lib/context';
import { scopedDb } from '../lib/scoped-db';

export const auditRoutes = new Hono<AppEnv>();

auditRoutes.get('/', requirePermission('audit.read'), async (c) => {
  const s = scopedDb(c.get('ctx'));
  const raw = Number(c.req.query('limit') ?? 50);
  const limit = Number.isFinite(raw) ? Math.min(Math.max(raw, 1), 200) : 50;
  const entries = await s.audit.list(limit);
  return c.json({ entries });
});
