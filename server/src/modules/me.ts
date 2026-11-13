import { Hono } from 'hono';
import type { AppEnv } from '../lib/context';
import { scopedDb } from '../lib/scoped-db';

export const meRoutes = new Hono<AppEnv>();

meRoutes.get('/', async (c) => {
  const ctx = c.get('ctx');
  const s = scopedDb(ctx);
  const tenant = await s.tenant.get();

  return c.json({
    user: { id: ctx.userId, name: ctx.userName, email: ctx.userEmail },
    staff: {
      id: ctx.staffId,
      name: ctx.staffName,
      roleId: ctx.roleId,
      roleName: ctx.roleName,
      permissions: [...ctx.permissions],
    },
    tenant: tenant
      ? {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          plan: tenant.plan,
          status: tenant.status,
          localeDefault: tenant.localeDefault,
          currency: tenant.currency,
          vatRateBp: tenant.vatRateBp,
        }
      : null,
    branchIds: ctx.branchIds,
  });
});
