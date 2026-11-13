import { eq } from 'drizzle-orm';
import { auth } from '../auth';
import { db, pool } from '../db/client';
import { branches, roles, staff, staffBranches, tenants } from '../db/schema';
import { ROLE_PRESETS } from '../lib/rbac';

const DEMO_SLUG = 'kinetic';
const DEMO_PASSWORD = 'Kinetic123!';

const TEAM = [
  { name: 'Layla Hassan', email: 'owner@kinetic.eg', role: 'Owner' },
  { name: 'Omar Fathy', email: 'manager@kinetic.eg', role: 'Manager' },
  { name: 'Nour Adel', email: 'reception@kinetic.eg', role: 'Receptionist' },
  { name: 'Hany Samir', email: 'accountant@kinetic.eg', role: 'Accountant' },
];

async function main() {
  const [existing] = await db.select().from(tenants).where(eq(tenants.slug, DEMO_SLUG)).limit(1);
  if (existing) {
    console.log('[seed] demo tenant already present, skipping');
    return;
  }

  const [tenant] = await db
    .insert(tenants)
    .values({
      name: 'Kinetic Gym',
      slug: DEMO_SLUG,
      plan: 'growth',
      localeDefault: 'ar',
      vatRateBp: 1400,
    })
    .returning();

  const [zamalek, newCairo] = await db
    .insert(branches)
    .values([
      {
        tenantId: tenant.id,
        name: 'Zamalek',
        address: '26 July St, Zamalek, Cairo',
        phone: '+20 100 111 2233',
        lat: '30.060400',
        lng: '31.219700',
        hours: { weekdays: '06:00 – 23:00', friday: '10:00 – 20:00' },
      },
      {
        tenantId: tenant.id,
        name: 'New Cairo',
        address: '90th St, Fifth Settlement, Cairo',
        phone: '+20 100 444 5566',
        lat: '30.007400',
        lng: '31.491300',
        hours: { weekdays: '07:00 – 23:00', friday: '10:00 – 19:00' },
      },
    ])
    .returning();

  const roleRows = await db
    .insert(roles)
    .values(
      Object.entries(ROLE_PRESETS).map(([name, permissions]) => ({
        tenantId: tenant.id,
        name,
        permissions,
        isSystem: true,
      })),
    )
    .returning();
  const roleByName = new Map(roleRows.map((r) => [r.name, r.id]));

  for (const person of TEAM) {
    const created = await auth.api.signUpEmail({
      body: { email: person.email, password: DEMO_PASSWORD, name: person.name },
    });

    const [row] = await db
      .insert(staff)
      .values({
        tenantId: tenant.id,
        userId: created.user.id,
        roleId: roleByName.get(person.role)!,
        displayName: person.name,
        phone: null,
        active: true,
      })
      .returning();

    await db.insert(staffBranches).values(
      [zamalek.id, newCairo.id].map((branchId) => ({ staffId: row.id, branchId })),
    );
  }

  console.log(`[seed] created demo tenant "${tenant.name}" with ${TEAM.length} staff accounts`);
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (error) => {
    console.error('[seed] failed', error);
    await pool.end();
    process.exit(1);
  });
