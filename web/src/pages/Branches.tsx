import { Pencil, Plus, Power, MapPin, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  Badge,
  Button,
  EmptyState,
  Field,
  GlassCard,
  Input,
  Modal,
  PageHeader,
  Spinner,
  Select,
} from '../components/ui';

type Branch = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  hours: Record<string, string>;
};

const TIMEZONES = ['Africa/Cairo', 'Africa/Alexandria', 'Asia/Riyadh', 'Asia/Dubai'];

export default function Branches() {
  const { can } = useAuth();
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [closing, setClosing] = useState<Branch | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState({ name: '', address: '', phone: '', timezone: 'Africa/Cairo' });

  async function load() {
    try {
      const data = await api.get<{ branches: Branch[] }>('/branches');
      setBranches(data.branches);
    } catch {
      setError('Could not load branches.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ name: '', address: '', phone: '', timezone: 'Africa/Cairo' });
    setFields({});
    setFormError(null);
    setFormOpen(true);
  }

  function openEdit(branch: Branch) {
    setEditing(branch);
    setForm({
      name: branch.name,
      address: branch.address ?? '',
      phone: branch.phone ?? '',
      timezone: branch.timezone,
    });
    setFields({});
    setFormError(null);
    setFormOpen(true);
  }

  async function submit() {
    setBusy(true);
    setFormError(null);
    setFields({});
    try {
      const payload = {
        name: form.name,
        address: form.address || null,
        phone: form.phone || null,
        timezone: form.timezone,
      };
      if (editing) {
        await api.patch(`/branches/${editing.id}`, payload);
      } else {
        await api.post('/branches', payload);
      }
      setFormOpen(false);
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        setFields(err.fields ?? {});
      } else {
        setFormError('Could not save the branch.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function close(branch: Branch) {
    setBusy(true);
    try {
      await api.delete(`/branches/${branch.id}`);
      setClosing(null);
      await load();
    } catch {
      setError('Could not close the branch.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Operations"
        title="Branches"
        description="Each branch carries its own opening hours, location and staff roster."
        actions={
          can('branches.manage') ? (
            <Button onClick={openCreate}>
              <Plus size={16} /> New branch
            </Button>
          ) : null
        }
      />

      {error ? <GlassCard className="mb-5 p-5 text-sm text-[#93000a]">{error}</GlassCard> : null}

      {!branches ? (
        <GlassCard className="p-6">
          <Spinner label="Loading branches" />
        </GlassCard>
      ) : branches.length === 0 ? (
        <EmptyState
          title="No branches yet"
          hint="Add the first location so staff and members can be scoped to it."
          action={
            can('branches.manage') ? (
              <Button onClick={openCreate}>
                <Plus size={16} /> New branch
              </Button>
            ) : null
          }
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {branches.map((branch) => (
            <GlassCard key={branch.id} className="flex flex-col p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-light tracking-tight">{branch.name}</h2>
                  <p className="mt-1 flex items-center gap-1.5 text-[13px] text-muted">
                    <MapPin size={13} /> {branch.address ?? 'Address pending'}
                  </p>
                </div>
                <Badge tone="lime">
                  <Clock size={11} /> {branch.timezone.replace('Africa/', '')}
                </Badge>
              </div>

              <div className="mt-5 space-y-2 text-[13px]">
                {branch.phone ? (
                  <p className="text-muted">
                    <span className="text-ink">Phone</span> · {branch.phone}
                  </p>
                ) : null}
                {Object.entries(branch.hours ?? {}).map(([day, time]) => (
                  <p key={day} className="flex items-center justify-between border-b hairline pb-2 last:border-0">
                    <span className="capitalize text-muted">{day}</span>
                    <span className="num">{String(time)}</span>
                  </p>
                ))}
              </div>

              {can('branches.manage') ? (
                <div className="mt-5 flex gap-2 border-t hairline pt-4">
                  <Button variant="glass" size="sm" onClick={() => openEdit(branch)}>
                    <Pencil size={13} /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setClosing(branch)}>
                    <Power size={13} /> Close branch
                  </Button>
                </div>
              ) : null}
            </GlassCard>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit branch' : 'New branch'}
        description={editing ? 'Update the location details.' : 'Add a location to this gym.'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={busy || form.name.trim().length < 2}>
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Create branch'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Branch name" error={fields.name?.[0]} htmlFor="branch-name">
            <Input
              id="branch-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Zamalek"
            />
          </Field>
          <Field label="Address" error={fields.address?.[0]} htmlFor="branch-address">
            <Input
              id="branch-address"
              value={form.address}
              onChange={(event) => setForm({ ...form, address: event.target.value })}
              placeholder="26 July St, Zamalek, Cairo"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Phone" error={fields.phone?.[0]} htmlFor="branch-phone">
              <Input
                id="branch-phone"
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                placeholder="+20 100 000 0000"
              />
            </Field>
            <Field label="Timezone" htmlFor="branch-tz">
              <Select
                id="branch-tz"
                value={form.timezone}
                onChange={(event) => setForm({ ...form, timezone: event.target.value })}
              >
                {TIMEZONES.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          {formError ? <p className="text-sm text-[#93000a]">{formError}</p> : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(closing)}
        onClose={() => setClosing(null)}
        title="Close this branch?"
        description={closing ? `${closing.name} will stop accepting check-ins. The record stays in the audit log.` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setClosing(null)}>
              Keep branch
            </Button>
            <Button variant="danger" onClick={() => closing && void close(closing)} disabled={busy}>
              {busy ? 'Closing…' : 'Close this branch'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          This is a soft close. History, staff assignments and reports remain intact.
        </p>
      </Modal>
    </div>
  );
}
