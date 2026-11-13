import { createMiddleware } from 'hono/factory';
import { and, eq, isNull } from 'drizzle-orm';
import { auth } from '../auth';
import { db } from '../db/client';
import { branches, roles, staff, staffBranches } from '../db/schema';
import { fail } from './errors';

export type RequestContext = {
  userId: string;
  userName: string;
  userEmail: string;
  tenantId: string;
  staffId: string;
  staffName: string;
  roleId: string;
  roleName: string;
  permissions: Set<string>;
  branchIds: string[];
};

export type AppEnv = { Variables: { ctx: RequestContext } };

/**
 * Resolves the caller once per request: Better Auth session -> staff row -> role
 * permissions -> branch scope. Every guarded handler receives this context.
 */
export const withContext = createMiddleware<AppEnv>(async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    return fail(c, 401, 'unauthenticated', 'Sign in to continue.');
  }

  const [row] = await db
    .select({
      staffId: staff.id,
      staffName: staff.displayName,
      tenantId: staff.tenantId,
      active: staff.active,
      roleId: roles.id,
      roleName: roles.name,
      permissions: roles.permissions,
    })
    .from(staff)
    .innerJoin(roles, eq(roles.id, staff.roleId))
    .where(eq(staff.userId, session.user.id))
    .limit(1);

  if (!row) {
    return fail(c, 403, 'not_staff', 'This account is not part of a gym team.');
  }
  if (!row.active) {
    return fail(c, 403, 'staff_inactive', 'This staff account is deactivated.');
  }

  const permissions = new Set(row.permissions ?? []);
  const assigned = await db
    .select({ branchId: staffBranches.branchId })
    .from(staffBranches)
    .where(eq(staffBranches.staffId, row.staffId));

  let branchIds = assigned.map((b) => b.branchId);
  if (permissions.has('branches.all')) {
    const all = await db
      .select({ id: branches.id })
      .from(branches)
      .where(and(eq(branches.tenantId, row.tenantId), isNull(branches.deletedAt)));
    branchIds = all.map((b) => b.id);
  }

  c.set('ctx', {
    userId: session.user.id,
    userName: session.user.name,
    userEmail: session.user.email,
    tenantId: row.tenantId,
    staffId: row.staffId,
    staffName: row.staffName,
    roleId: row.roleId,
    roleName: row.roleName,
    permissions,
    branchIds,
  });

  await next();
});

export function requirePermission(permission: string) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const ctx = c.get('ctx');
    if (!ctx.permissions.has(permission)) {
      return fail(c, 403, 'forbidden', `Your role (${ctx.roleName}) cannot perform this action.`);
    }
    await next();
  });
}
