import { Hono } from 'hono';
import { z } from 'zod';
import { auth } from '../auth';
import { requirePermission, type AppEnv } from '../lib/context';
import { clientIp, fail, parse } from '../lib/errors';
import { scopedDb } from '../lib/scoped-db';

export const staffRoutes = new Hono<AppEnv>();

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(128),
  phone: z.string().trim().max(32).optional().nullable(),
  roleId: z.string().uuid(),
  branchIds: z.array(z.string().uuid()).max(50).default([]),
});

const patchSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(32).optional().nullable(),
  roleId: z.string().uuid().optional(),
  active: z.boolean().optional(),
  branchIds: z.array(z.string().uuid()).max(50).optional(),
});

staffRoutes.get('/', requirePermission('staff.read'), async (c) => {
  const s = scopedDb(c.get('ctx'));
  const [rows, assignments, branchRows] = await Promise.all([
    s.staff.list(),
    s.staff.branchAssignments(),
    s.branches.list(),
  ]);

  const branchName = new Map(branchRows.map((b) => [b.id, b.name]));
  const byStaff = new Map<string, string[]>();
  for (const a of assignments) {
    byStaff.set(a.staffId, [...(byStaff.get(a.staffId) ?? []), a.branchId]);
  }

  return c.json({
    staff: rows.map((r) => ({
      ...r,
      branchIds: byStaff.get(r.id) ?? [],
      branchNames: (byStaff.get(r.id) ?? []).map((id) => branchName.get(id)).filter(Boolean),
    })),
    branches: branchRows.map((b) => ({ id: b.id, name: b.name })),
  });
});

staffRoutes.post('/', requirePermission('staff.manage'), async (c) => {
  const ctx = c.get('ctx');
  const s = scopedDb(ctx);
  const parsed = parse<z.infer<typeof createSchema>>(createSchema, await c.req.json().catch(() => ({})));
  if (!parsed.ok) return fail(c, 400, 'validation_failed', 'Check the highlighted fields.', parsed.fields);

  const role = await s.roles.byId(parsed.data.roleId);
  if (!role) return fail(c, 400, 'validation_failed', 'Choose a role from this gym.', { roleId: ['Unknown role.'] });

  const branchRows = await s.branches.list();
  const validIds = new Set(branchRows.map((b) => b.id));
  const badBranch = parsed.data.branchIds.find((id) => !validIds.has(id));
  if (badBranch) return fail(c, 400, 'validation_failed', 'That branch is not part of this gym.', { branchIds: ['Unknown branch.'] });

  let userId: string;
  try {
    const created = await auth.api.signUpEmail({
      body: {
        email: parsed.data.email.toLowerCase(),
        password: parsed.data.password,
        name: parsed.data.name,
      },
    });
    userId = created.user.id;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not create the sign-in account.';
    const duplicate = /exist|already/i.test(message);
    return fail(
      c,
      duplicate ? 409 : 400,
      duplicate ? 'email_taken' : 'account_failed',
      duplicate ? 'An account with this email already exists.' : message,
      { email: [duplicate ? 'An account with this email already exists.' : message] },
    );
  }

  const row = await s.staff.create({
    userId,
    roleId: role.id,
    displayName: parsed.data.name,
    phone: parsed.data.phone ?? null,
  });
  await s.staff.setBranches(row.id, parsed.data.branchIds);
  await s.audit.record({
    action: 'staff.create',
    entity: 'staff',
    entityId: row.id,
    after: { displayName: row.displayName, email: parsed.data.email, role: role.name, branchIds: parsed.data.branchIds },
    ip: clientIp(c),
  });

  return c.json({ staff: { ...row, roleName: role.name, branchIds: parsed.data.branchIds } }, 201);
});

staffRoutes.patch('/:id', requirePermission('staff.manage'), async (c) => {
  const ctx = c.get('ctx');
  const s = scopedDb(ctx);
  const id = c.req.param('id');
  const parsed = parse<z.infer<typeof patchSchema>>(patchSchema, await c.req.json().catch(() => ({})));
  if (!parsed.ok) return fail(c, 400, 'validation_failed', 'Check the highlighted fields.', parsed.fields);

  const before = await s.staff.byId(id);
  if (!before) return fail(c, 404, 'not_found', 'Staff member not found.');

  if (id === ctx.staffId && (parsed.data.active === false || parsed.data.roleId)) {
    return fail(c, 400, 'self_lockout', 'You cannot deactivate or change the role of your own account.');
  }

  if (parsed.data.roleId) {
    const role = await s.roles.byId(parsed.data.roleId);
    if (!role) return fail(c, 400, 'validation_failed', 'Choose a role from this gym.', { roleId: ['Unknown role.'] });
  }

  if (parsed.data.branchIds) {
    const branchRows = await s.branches.list();
    const validIds = new Set(branchRows.map((b) => b.id));
    if (parsed.data.branchIds.some((b) => !validIds.has(b))) {
      return fail(c, 400, 'validation_failed', 'That branch is not part of this gym.', { branchIds: ['Unknown branch.'] });
    }
  }

  const { branchIds, ...patch } = parsed.data;
  const updated = await s.staff.update(id, patch);
  if (branchIds) await s.staff.setBranches(id, branchIds);

  await s.audit.record({
    action: 'staff.update',
    entity: 'staff',
    entityId: id,
    before: { displayName: before.displayName, roleId: before.roleId, active: before.active },
    after: parsed.data as Record<string, unknown>,
    ip: clientIp(c),
  });

  return c.json({ staff: updated });
});

staffRoutes.delete('/:id', requirePermission('staff.manage'), async (c) => {
  const ctx = c.get('ctx');
  const s = scopedDb(ctx);
  const id = c.req.param('id');

  if (id === ctx.staffId) return fail(c, 400, 'self_lockout', 'You cannot deactivate your own account.');

  const before = await s.staff.byId(id);
  if (!before) return fail(c, 404, 'not_found', 'Staff member not found.');

  await s.staff.update(id, { active: false });
  await s.audit.record({
    action: 'staff.deactivate',
    entity: 'staff',
    entityId: id,
    before: { displayName: before.displayName, active: before.active },
    after: { active: false },
    ip: clientIp(c),
  });

  return c.json({ ok: true });
});
