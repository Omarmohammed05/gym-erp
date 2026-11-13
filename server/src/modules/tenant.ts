import { Hono } from 'hono';
import { z } from 'zod';
import { clientIp, fail, parse } from '../lib/errors';
import { requirePermission, type AppEnv } from '../lib/context';
import { scopedDb } from '../lib/scoped-db';

export const tenantRoutes = new Hono<AppEnv>();

tenantRoutes.get('/', requirePermission('tenant.read'), async (c) => {
  const s = scopedDb(c.get('ctx'));
  return c.json({ tenant: await s.tenant.get() });
});

const patchSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  localeDefault: z.enum(['ar', 'en']).optional(),
  vatRateBp: z.number().int().min(0).max(10000).optional(),
  settings: z.record(z.unknown()).optional(),
});

tenantRoutes.patch('/', requirePermission('tenant.manage'), async (c) => {
  const ctx = c.get('ctx');
  const s = scopedDb(ctx);
  const parsed = parse<z.infer<typeof patchSchema>>(patchSchema, await c.req.json().catch(() => ({})));
  if (!parsed.ok) return fail(c, 400, 'validation_failed', 'Check the highlighted fields.', parsed.fields);

  const before = await s.tenant.get();
  if (!before) return fail(c, 404, 'not_found', 'Tenant not found.');

  const updated = await s.tenant.update(parsed.data);
  await s.audit.record({
    action: 'tenant.update',
    entity: 'tenant',
    entityId: updated.id,
    before: { name: before.name, localeDefault: before.localeDefault, vatRateBp: before.vatRateBp },
    after: parsed.data as Record<string, unknown>,
    ip: clientIp(c),
  });

  return c.json({ tenant: updated });
});
