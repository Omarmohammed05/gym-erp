import { ArrowUpRight, MapPin, Building2, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, cairoTime } from '../lib/api';
import { useAuth } from '../lib/auth';
import { actionLabel, greetingForCairo, todayInCairo } from '../lib/format';
import { Badge, GlassCard, PageHeader, Spinner, StatCard } from '../components/ui';

type OverviewData = {
  counts: { branches: number; staff: number; roles: number; audit7d: number };
  branches: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    timezone: string;
    hours: Record<string, string>;
  }[];
  recent: {
    id: string;
    actorName: string | null;
    action: string;
    entity: string;
    at: string;
  }[];
  roleName: string;
};

export default function Overview() {
  const { me, can } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<OverviewData>('/overview')
      .then((next) => alive && setData(next))
      .catch(() => alive && setError('Could not load the overview.'));
    return () => {
      alive = false;
    };
  }, []);

  const firstName = (me?.staff.name ?? 'there').split(' ')[0];

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow={`${todayInCairo()} · Cairo`}
        title={`${greetingForCairo()}, ${firstName}`}
        description={
          data
            ? `${data.counts.staff} active teammates across ${data.counts.branches} branches, scoped by role and branch.`
            : 'Loading your gym snapshot.'
        }
        actions={<Badge tone="dark">{me?.staff.roleName}</Badge>}
      />

      {error ? (
        <GlassCard className="p-6 text-sm text-[#93000a]">{error}</GlassCard>
      ) : !data ? (
        <GlassCard className="p-6">
          <Spinner label="Reading tenant data" />
        </GlassCard>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Branches" value={data.counts.branches} hint="Open locations" />
            <StatCard label="Active team" value={data.counts.staff} hint="Seats with access" tone="pink" />
            <StatCard label="Roles" value={data.counts.roles} hint="Permission sets" />
            <StatCard label="Audit events" value={data.counts.audit7d} hint="Last 7 days" tone="pink" />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <GlassCard className="p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-light tracking-tight">Branch network</h2>
                  <p className="mt-1 text-sm text-muted">Every location runs on Cairo time.</p>
                </div>
                {can('branches.read') ? (
                  <Link
                    to="/branches"
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-muted transition hover:text-ink"
                  >
                    Manage <ArrowUpRight size={14} />
                  </Link>
                ) : null}
              </div>

              <div className="mt-5 space-y-3">
                {data.branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] border border-white/70 bg-white/50 px-4 py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-ink text-lime">
                        <Building2 size={17} strokeWidth={1.6} />
                      </span>
                      <div className="leading-tight">
                        <p className="text-sm font-medium">{branch.name}</p>
                        <p className="flex items-center gap-1 text-[12px] text-muted">
                          <MapPin size={12} /> {branch.address ?? 'Address pending'}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {Object.entries(branch.hours ?? {}).slice(0, 2).map(([day, time]) => (
                        <span
                          key={day}
                          className="rounded-pill bg-black/[0.04] px-3 py-1 text-[11px] capitalize text-muted"
                        >
                          {day}: {String(time)}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>

            <div className="space-y-6">
              <GlassCard className="p-6">
                <h2 className="font-display text-2xl font-light tracking-tight">Recent activity</h2>
                <p className="mt-1 text-sm text-muted">Sensitive actions, written once.</p>
                <ol className="mt-5 space-y-4">
                  {data.recent.length === 0 ? (
                    <li className="text-sm text-muted">No audit events yet.</li>
                  ) : (
                    data.recent.map((entry) => (
                      <li key={entry.id} className="flex items-start gap-3">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blush" aria-hidden />
                        <div className="leading-tight">
                          <p className="text-[13px]">
                            <span className="font-medium">{entry.actorName ?? 'System'}</span>{' '}
                            <span className="text-muted">{actionLabel(entry.action)}</span>
                          </p>
                          <p className="mt-0.5 text-[11px] text-muted">{cairoTime(entry.at)}</p>
                        </div>
                      </li>
                    ))
                  )}
                </ol>
              </GlassCard>

              <div className="glass-dark relative overflow-hidden rounded-glass p-6 text-white">
                <span
                  className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full"
                  style={{ background: 'radial-gradient(circle, rgba(212,245,90,0.35) 0%, rgba(212,245,90,0) 70%)' }}
                  aria-hidden
                />
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-lime">
                  <ShieldCheck size={14} /> Foundation slice
                </div>
                <p className="mt-3 font-display text-2xl font-light leading-snug">
                  Tenant isolation, roles and the audit trail are live.
                </p>
                <p className="mt-2 text-[13px] leading-relaxed text-white/65">
                  Members, plans, billing and Wallet passes build on this base in the next slices.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
