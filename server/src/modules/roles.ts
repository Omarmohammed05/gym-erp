import { Hono } from 'hono';
import { z } from 'zod';
import { requirePermission, type AppEnv } from '../lib/context';
import { clientIp, fail, parse } from '../lib/errors';
import { PERMISSIONS, PERMISSION_KEYS } from '../lib/rbac';
import { scopedDb } from '../lib/scoped-db';

export const roleRoutes = new Hono<AppEnv>();

const permissionSchema = z.string().refine((v) => PERMISSION_KEYS.includes(v), 'Unknown permission');

const createSchema = z.object({
  name: z.string().trim().min(2).max(60),
  permissions: z.array(permissionSchema).max(PERMISSION_KEYS.length).default([]),
});

const patchSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  permissions: z.array(permissionSchema).max(PERMISSION_KEYS.length).optional(),
});

roleRoutes.get('/permissions', requirePermission('roles.read'), (c) => {
  return c.json({ permissions: PERMISSIONS });
});

roleRoutes.get('/', requirePermission('roles.read'), async (c) => {
  const s = scopedDb(c.get('ctx'));
  const [rows, staffRows] = await Promise.all([s.roles.list(), s.staff.list()]);
  const seats = new Map<string, number>();
  for (const row of staffRows) seats.set(row.roleId, (seats.get(row.roleId) ?? 0) + 1);

  return c.json({
    roles: rows.map((r) => ({ ...r, seats: seats.get(r.id) ?? 0 })),
  });
});

roleRoutes.post('/', requirePermission('roles.manage'), async (c) => {
  const ctx = c.get('ctx');
  const s = scopedDb(ctx);
  const parsed = parse<z.infer<typeof createSchema>>(createSchema, await c.req.json().catch(() => ({})));
  if (!parsed.ok) return fail(c, 400, 'validation_failed', 'Check the highlighted fields.', parsed.fields);

  const existing = await s.roles.list();
  if (existing.some((r) => r.name.toLowerCase() === parsed.data.name.toLowerCase())) {
    return fail(c, 409, 'name_taken', 'A role with this name already exists.', { name: ['A role with this name already exists.'] });
  }

  const created = await s.roles.create({
    name: parsed.data.name,
    permissions: [...new Set(parsed.data.permissions)],
  });
  await s.audit.record({
    action: 'role.create',
    entity: 'role',
    entityId: created.id,
    after: { name: created.name, permissions: created.permissions },
    ip: clientIp(c),
  });

  return c.json({ role: created }, 201);
});

roleRoutes.patch('/:id', requirePermission('roles.manage'), async (c) => {
  const ctx = c.get('ctx');
  const s = scopedDb(ctx);
  const id = c.req.param('id');
  const parsed = parse<z.infer<typeof patchSchema>>(patchSchema, await c.req.json().catch(() => ({})));
  if (!parsed.ok) return fail(c, 400, 'validation_failed', 'Check the highlighted fields.', parsed.fields);

  const before = await s.roles.byId(id);
  if (!before) return fail(c, 404, 'not_found', 'Role not found.');

  if (parsed.data.permissions) {
    // Guard rail: the last role that can manage roles must keep that power.
    const removingManage = !parsed.data.permissions.includes('roles.manage');
    const otherManagers = (await s.roles.list()).filter(
      (r) => r.id !== id && r.permissions.includes('roles.manage') && r.permissions.length > 0,
    );
    if (removingManage && otherManagers.length === 0 && before.permissions.includes('roles.manage')) {
      return fail(c, 400, 'last_role_manager', 'Keep at least one role that can manage roles.');
    }
  }

  const updated = await s.roles.update(id, {
    ...parsed.data,
    permissions: parsed.data.permissions ? [...new Set(parsed.data.permissions)] : undefined,
  });

  await s.audit.record({
    action: 'role.update',
    entity: 'role',
    entityId: id,
    before: { name: before.name, permissions: before.permissions },
    after: parsed.data as Record<string, unknown>,
    ip: clientIp(c),
  });

  return c.json({ role: updated });
});
