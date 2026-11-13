/**
 * Permission catalogue. Roles are rows in the DB whose `permissions` array holds
 * these keys; checks always run server-side against the caller's loaded role.
 */
export type PermissionMeta = {
  key: string;
  label: string;
  group: string;
  description: string;
};

export const PERMISSIONS: PermissionMeta[] = [
  { key: 'tenant.read', label: 'View tenant', group: 'Tenant', description: 'See gym settings and branding' },
  { key: 'tenant.manage', label: 'Manage tenant', group: 'Tenant', description: 'Edit settings, plans, branding' },
  { key: 'branches.read', label: 'View branches', group: 'Branches', description: 'See branch list and details' },
  { key: 'branches.manage', label: 'Manage branches', group: 'Branches', description: 'Create, edit and close branches' },
  { key: 'branches.all', label: 'All branches', group: 'Branches', description: 'Scope covers every branch in the tenant' },
  { key: 'staff.read', label: 'View staff', group: 'Team', description: 'See the team directory' },
  { key: 'staff.manage', label: 'Manage staff', group: 'Team', description: 'Invite staff, assign roles and branches' },
  { key: 'roles.read', label: 'View roles', group: 'Team', description: 'See roles and their permissions' },
  { key: 'roles.manage', label: 'Manage roles', group: 'Team', description: 'Create roles and change permissions' },
  { key: 'audit.read', label: 'View audit log', group: 'Trust', description: 'See the sensitive-action trail' },
  { key: 'members.read', label: 'View members', group: 'Members', description: 'Search and open member profiles' },
  { key: 'members.write', label: 'Manage members', group: 'Members', description: 'Create and edit member profiles' },
  { key: 'checkin.do', label: 'Check-in members', group: 'Operations', description: 'Scan a pass and allow entry' },
  { key: 'checkin.override', label: 'Override check-in', group: 'Operations', description: 'Force an entry with a reason' },
  { key: 'memberships.sell', label: 'Sell memberships', group: 'Money', description: 'Sell and renew plans' },
  { key: 'payments.refund', label: 'Refund payments', group: 'Money', description: 'Refund or void a payment' },
  { key: 'reports.revenue', label: 'Revenue reports', group: 'Reports', description: 'See revenue and balances' },
  { key: 'settings.manage', label: 'Manage settings', group: 'Tenant', description: 'Policies, VAT and automations' },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key);

export function hasPermission(permissions: Iterable<string>, permission: string): boolean {
  for (const p of permissions) if (p === permission) return true;
  return false;
}

/** Preset permission sets used when seeding the demo tenant. */
export const ROLE_PRESETS: Record<string, string[]> = {
  Owner: PERMISSION_KEYS,
  Manager: [
    'tenant.read',
    'branches.read',
    'staff.read',
    'staff.manage',
    'roles.read',
    'audit.read',
    'members.read',
    'members.write',
    'checkin.do',
    'checkin.override',
    'memberships.sell',
    'reports.revenue',
  ],
  Receptionist: ['branches.read', 'members.read', 'members.write', 'checkin.do', 'memberships.sell'],
  Trainer: ['branches.read', 'members.read', 'checkin.do'],
  Accountant: ['tenant.read', 'branches.read', 'branches.all', 'audit.read', 'payments.refund', 'reports.revenue'],
  Sales: ['branches.read', 'members.read', 'members.write'],
};
