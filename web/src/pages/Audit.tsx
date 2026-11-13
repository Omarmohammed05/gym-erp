import { Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api, cairoTime } from '../lib/api';
import { actionLabel } from '../lib/format';
import { Badge, EmptyState, GlassCard, PageHeader, Spinner } from '../components/ui';

type Entry = {
  id: string;
  actorName: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  at: string;
};

export default function Audit() {
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<{ entries: Entry[] }>('/audit-log?limit=100')
      .then((data) => alive && setEntries(data.entries))
      .catch(() => alive && setError('Could not load the audit log.'));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Trust"
        title="Audit log"
        description="Sensitive actions are append-only: written once, never edited or deleted."
        actions={
          <Badge tone="neutral">
            <Lock size={11} /> append-only
          </Badge>
        }
      />

      {error ? <GlassCard className="p-5 text-sm text-[#93000a]">{error}</GlassCard> : null}

      {!entries ? (
        <GlassCard className="p-6">
          <Spinner label="Loading audit trail" />
        </GlassCard>
      ) : entries.length === 0 ? (
        <EmptyState title="Nothing logged yet" hint="Create a branch or invite a teammate to see events here." />
      ) : (
        <GlassCard className="overflow-hidden">
          <ul className="divide-y hairline">
            {entries.map((entry) => (
              <li key={entry.id} className="px-5 py-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[13px]">
                    <span className="font-medium">{entry.actorName ?? 'System'}</span>{' '}
                    <span className="text-muted">{actionLabel(entry.action)}</span>
                    {entry.entityId ? (
                      <span className="ms-2 rounded-pill bg-black/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-muted">
                        {entry.entity}
                      </span>
                    ) : null}
                  </p>
                  <p className="num text-[11px] text-muted">{cairoTime(entry.at)} · Cairo</p>
                </div>

                {entry.before || entry.after ? (
                  <details className="mt-2 group">
                    <summary className="cursor-pointer text-[11px] font-semibold uppercase tracking-[0.08em] text-muted transition hover:text-ink">
                      before / after
                    </summary>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {(['before', 'after'] as const).map((side) => (
                        <pre
                          key={side}
                          className="max-h-40 overflow-auto rounded-2xl bg-black/[0.035] p-3 text-[11px] leading-relaxed text-muted"
                        >
                          {side}: {JSON.stringify(entry[side] ?? {}, null, 2)}
                        </pre>
                      ))}
                    </div>
                  </details>
                ) : null}
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}
