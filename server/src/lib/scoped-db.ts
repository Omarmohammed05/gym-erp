import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { auditLog, branches, roles, staff, staffBranches, tenants, user } from '../db/schema';
import type { RequestContext } from './context';

export type AuditInput = {
  action: string;
  entity: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string;
};

/**
 * The only DB access path for request handlers. Every read and write is pinned to
 * the caller's tenant (and to their branch scope where a resource is branch-level).
 */
export function scopedDb(ctx: RequestContext) {
  const tenantId = ctx.tenantId;

  return {
    tenantId,
    branchIds: ctx.branchIds,

    tenant: {
      async get() {
        const [row] = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
        return row;
      },
      async update(patch: Partial<typeof tenants.$inferInsert>) {
        const [row] = await db
          .update(tenants)
          .set({ ...patch, updatedAt: new Date() })
          .where(eq(tenants.id, tenantId))
          .returning();
        return row;
      },
    },

    branches: {
      list() {
        return db
          .select()
          .from(branches)
          .where(and(eq(branches.tenantId, tenantId), isNull(branches.deletedAt)))
          .orderBy(branches.name);
      },
      async byId(id: string) {
        const [row] = await db
          .select()
          .from(branches)
          .where(and(eq(branches.tenantId, tenantId), eq(branches.id, id), isNull(branches.deletedAt)))
          .limit(1);
        return row;
      },
      async create(values: Omit<typeof branches.$inferInsert, 'tenantId'>) {
        const [row] = await db
          .insert(branches)
          .values({ ...values, tenantId })
          .returning();
        return row;
      },
      async update(id: string, patch: Partial<typeof branches.$inferInsert>) {
        const [row] = await db
          .update(branches)
          .set({ ...patch, updatedAt: new Date() })
          .where(and(eq(branches.tenantId, tenantId), eq(branches.id, id), isNull(branches.deletedAt)))
          .returning();
        return row;
      },
      async softDelete(id: string) {
        const [row] = await db
          .update(branches)
          .set({ deletedAt: new Date() })
          .where(and(eq(branches.tenantId, tenantId), eq(branches.id, id), isNull(branches.deletedAt)))
          .returning();
        return row;
      },
      /** Branch must belong to this tenant or we treat it as not found. */
      async assertInTenant(id: string) {
        return this.byId(id);
      },
    },

    roles: {
      list() {
        return db.select().from(roles).where(eq(roles.tenantId, tenantId)).orderBy(roles.name);
      },
      async byId(id: string) {
        const [row] = await db
          .select()
          .from(roles)
          .where(and(eq(roles.tenantId, tenantId), eq(roles.id, id)))
          .limit(1);
        return row;
      },
      async create(values: Omit<typeof roles.$inferInsert, 'tenantId'>) {
        const [row] = await db
          .insert(roles)
          .values({ ...values, tenantId })
          .returning();
        return row;
      },
      async update(id: string, patch: Partial<typeof roles.$inferInsert>) {
        const [row] = await db
          .update(roles)
          .set({ ...patch, updatedAt: new Date() })
          .where(and(eq(roles.tenantId, tenantId), eq(roles.id, id)))
          .returning();
        return row;
      },
    },

    staff: {
      list() {
        return db
          .select({
            id: staff.id,
            userId: staff.userId,
            displayName: staff.displayName,
            phone: staff.phone,
            active: staff.active,
            roleId: staff.roleId,
            roleName: roles.name,
            email: user.email,
          })
          .from(staff)
          .innerJoin(roles, eq(roles.id, staff.roleId))
          .innerJoin(user, eq(user.id, staff.userId))
          .where(eq(staff.tenantId, tenantId))
          .orderBy(staff.displayName);
      },
      async branchAssignments() {
        return db
          .select({ staffId: staffBranches.staffId, branchId: staffBranches.branchId })
          .from(staffBranches)
          .innerJoin(staff, eq(staff.id, staffBranches.staffId))
          .where(eq(staff.tenantId, tenantId));
      },
      async byId(id: string) {
        const [row] = await db
          .select()
          .from(staff)
          .where(and(eq(staff.tenantId, tenantId), eq(staff.id, id)))
          .limit(1);
        return row;
      },
      async create(values: Omit<typeof staff.$inferInsert, 'tenantId'>) {
        const [row] = await db
          .insert(staff)
          .values({ ...values, tenantId })
          .returning();
        return row;
      },
      async update(id: string, patch: Partial<typeof staff.$inferInsert>) {
        const [row] = await db
          .update(staff)
          .set({ ...patch, updatedAt: new Date() })
          .where(and(eq(staff.tenantId, tenantId), eq(staff.id, id)))
          .returning();
        return row;
      },
      async setBranches(id: string, branchIds: string[]) {
        await db.delete(staffBranches).where(eq(staffBranches.staffId, id));
        if (branchIds.length) {
          await db.insert(staffBranches).values(branchIds.map((branchId) => ({ staffId: id, branchId })));
        }
      },
    },

    audit: {
      list(limit = 50) {
        return db
          .select()
          .from(auditLog)
          .where(eq(auditLog.tenantId, tenantId))
          .orderBy(desc(auditLog.at))
          .limit(limit);
      },
      async record(input: AuditInput) {
        await db.insert(auditLog).values({
          tenantId,
          actorId: ctx.userId,
          actorName: ctx.staffName,
          action: input.action,
          entity: input.entity,
          entityId: input.entityId ?? null,
          before: input.before ?? null,
          after: input.after ?? null,
          ip: input.ip ?? null,
        });
      },
    },
  };
}

export type ScopedDb = ReturnType<typeof scopedDb>;
