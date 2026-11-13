export const ACTION_LABELS: Record<string, string> = {
  'branch.create': 'created a branch',
  'branch.update': 'updated a branch',
  'branch.delete': 'closed a branch',
  'staff.create': 'invited a team member',
  'staff.update': 'updated a team member',
  'staff.deactivate': 'deactivated a team member',
  'role.create': 'created a role',
  'role.update': 'changed role permissions',
  'tenant.update': 'updated gym settings',
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replace(/[._]/g, ' ');
}

export function greetingForCairo(): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Africa/Cairo' }).format(new Date()),
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function todayInCairo(): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Africa/Cairo',
  }).format(new Date());
}
