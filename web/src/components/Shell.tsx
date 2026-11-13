import { Building2, LayoutDashboard, ScrollText, ShieldCheck, Users, LogOut } from 'lucide-react';
import type { ComponentType } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { cn } from './ui';

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
  permission?: string;
  end?: boolean;
};

const NAV: NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/branches', label: 'Branches', icon: Building2, permission: 'branches.read' },
  { to: '/staff', label: 'Team', icon: Users, permission: 'staff.read' },
  { to: '/roles', label: 'Roles', icon: ShieldCheck, permission: 'roles.read' },
  { to: '/audit', label: 'Audit', icon: ScrollText, permission: 'audit.read' },
];

function Brand({ compact = false }: { compact?: boolean }) {
  const { me } = useAuth();
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-lime">
        <span className="num text-lg font-light">K</span>
      </span>
      {!compact ? (
        <div className="leading-tight">
          <p className="font-display text-lg font-light tracking-tight">{me?.tenant?.name ?? 'Kinetic'}</p>
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{me?.tenant?.plan ?? 'gym erp'}</p>
        </div>
      ) : null}
    </div>
  );
}

function UserChip() {
  const { me, signOut } = useAuth();
  const initials = (me?.staff.name ?? '?')
    .split(' ')
    .map((part) => part[0])
    .slice(0, 2)
    .join('');

  return (
    <div className="rounded-[22px] border border-white/70 bg-white/55 p-3">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">
          {initials}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[13px] font-medium">{me?.staff.name}</p>
          <p className="truncate text-[11px] text-muted">{me?.staff.roleName}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-pill py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted transition hover:bg-black/5 hover:text-ink"
      >
        <LogOut size={13} /> Sign out
      </button>
    </div>
  );
}

export default function Shell() {
  const { can, me } = useAuth();
  const items = NAV.filter((item) => !item.permission || can(item.permission));

  return (
    <div className="min-h-screen">
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 start-0 z-30 hidden w-[264px] flex-col justify-between p-5 lg:flex">
        <div className="glass flex h-full flex-col rounded-glass p-5">
          <Brand />
          <nav className="mt-9 flex flex-1 flex-col gap-1.5">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center gap-3 rounded-pill px-4 py-3 text-sm transition',
                    isActive ? 'bg-ink text-white shadow-[0_12px_30px_-16px_rgba(10,10,10,0.9)]' : 'text-muted hover:bg-black/5 hover:text-ink',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={17} strokeWidth={1.6} />
                    <span className="flex-1">{item.label}</span>
                    <span
                      className={cn('h-1.5 w-1.5 rounded-full transition', isActive ? 'bg-lime' : 'bg-transparent')}
                      aria-hidden
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <UserChip />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Brand />
        <span className="glass rounded-pill px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          {me?.staff.roleName}
        </span>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-4 pb-32 pt-4 sm:px-6 lg:ps-[300px] lg:pe-8 lg:pt-10 lg:pb-16">
        <Outlet />
      </main>

      {/* Mobile floating nav */}
      <nav className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-[min(94%,430px)] items-center justify-around rounded-pill bg-ink/95 px-2 py-2 shadow-float backdrop-blur-xl lg:hidden">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'flex min-w-[56px] flex-col items-center gap-1 rounded-pill px-2 py-2 text-[10px] transition',
                isActive ? 'text-lime' : 'text-white/55',
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={19} strokeWidth={isActive ? 2 : 1.6} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
