import { Hono } from 'hono';
import { z } from 'zod';
import { requirePermission, type AppEnv } from '../lib/context';
import { clientIp, fail, parse } from '../lib/errors';
import { scopedDb } from '../lib/scoped-db';

export const branchRoutes = new Hono<AppEnv>();

const baseSchema = z.object({
  name: z.string().trim().min(2).max(80),
  address: z.string().trim().max(200).optional().nullable(),
  phone: z.string().trim().max(32).optional().nullable(),
  timezone: z.string().trim().min(3).max(64).optional(),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  hours: z.record(z.unknown()).optional(),
});

branchRoutes.get('/', requirePermission('branches.read'), async (c) => {
  const s = scopedDb(c.get('ctx'));
  const rows = await s.branches.list();
  return c.json({
    branches: rows.map((b) => ({ ...b, inScope: s.branchIds.includes(b.id) })),
  });
});

branchRoutes.post('/', requirePermission('branches.manage'), async (c) => {
  const ctx = c.get('ctx');
  const s = scopedDb(ctx);
  const parsed = parse<z.infer<typeof baseSchema>>(baseSchema, await c.req.json().catch(() => ({})));
  if (!parsed.ok) return fail(c, 400, 'validation_failed', 'Check the highlighted fields.', parsed.fields);

  const existing = await s.branches.list();
  if (existing.some((b) => b.name.toLowerCase() === parsed.data.name.toLowerCase())) {
    return fail(c, 409, 'name_taken', 'A branch with this name already exists.', {
      name: ['A branch with this name already exists.'],
    });
  }

  const created = await s.branches.create({
    name: parsed.data.name,
    address: parsed.data.address ?? null,
    phone: parsed.data.phone ?? null,
    timezone: parsed.data.timezone ?? 'Africa/Cairo',
    lat: parsed.data.lat != null ? String(parsed.data.lat) : null,
    lng: parsed.data.lng != null ? String(parsed.data.lng) : null,
    hours: parsed.data.hours ?? {},
  });

  await s.audit.record({
    action: 'branch.create',
    entity: 'branch',
    entityId: created.id,
    after: { name: created.name, address: created.address, phone: created.phone },
    ip: clientIp(c),
  });

  return c.json({ branch: created }, 201);
});

branchRoutes.patch('/:id', requirePermission('branches.manage'), async (c) => {
  const ctx = c.get('ctx');
  const s = scopedDb(ctx);
  const id = c.req.param('id');
  const parsed = parse<Partial<z.infer<typeof baseSchema>>>(baseSchema.partial(), await c.req.json().catch(() => ({})));
  if (!parsed.ok) return fail(c, 400, 'validation_failed', 'Check the highlighted fields.', parsed.fields);

  const before = await s.branches.byId(id);
  if (!before) return fail(c, 404, 'not_found', 'Branch not found.');

  const patch = {
    ...parsed.data,
    lat: parsed.data.lat != null ? String(parsed.data.lat) : undefined,
    lng: parsed.data.lng != null ? String(parsed.data.lng) : undefined,
  };
  const updated = await s.branches.update(id, patch as never);

  await s.audit.record({
    action: 'branch.update',
    entity: 'branch',
    entityId: id,
    before: { name: before.name, address: before.address, phone: before.phone, timezone: before.timezone },
    after: parsed.data as Record<string, unknown>,
    ip: clientIp(c),
  });

  return c.json({ branch: updated });
});

branchRoutes.delete('/:id', requirePermission('branches.manage'), async (c) => {
  const ctx = c.get('ctx');
  const s = scopedDb(ctx);
  const id = c.req.param('id');

  const before = await s.branches.byId(id);
  if (!before) return fail(c, 404, 'not_found', 'Branch not found.');

  await s.branches.softDelete(id);
  await s.audit.record({
    action: 'branch.delete',
    entity: 'branch',
    entityId: id,
    before: { name: before.name, address: before.address },
    ip: clientIp(c),
  });

  return c.json({ ok: true });
});
