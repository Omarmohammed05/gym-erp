import { Plus, ShieldCheck, UserMinus } from 'lucide-react';
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
  Select,
  Spinner,
  cn,
} from '../components/ui';

type StaffRow = {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  roleId: string;
  roleName: string;
  active: boolean;
  branchIds: string[];
  branchNames: string[];
};

type BranchOption = { id: string; name: string };
type RoleOption = { id: string; name: string };

const EMPTY_FORM = { name: '', email: '', password: '', roleId: '', branchIds: [] as string[] };

export default function Staff() {
  const { can, me } = useAuth();
  const [staff, setStaff] = useState<StaffRow[] | null>(null);
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removing, setRemoving] = useState<StaffRow | null>(null);

  async function load() {
    try {
      const [staffData, roleData] = await Promise.all([
        api.get<{ staff: StaffRow[]; branches: BranchOption[] }>('/staff'),
        api.get<{ roles: RoleOption[] }>('/roles'),
      ]);
      setStaff(staffData.staff);
      setBranches(staffData.branches);
      setRoles(roleData.roles);
    } catch {
      setError('Could not load the team.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openCreate() {
    setForm({ ...EMPTY_FORM, roleId: roles.find((r) => r.name === 'Receptionist')?.id ?? roles[0]?.id ?? '' });
    setFields({});
    setFormError(null);
    setFormOpen(true);
  }

  async function submit() {
    setBusy(true);
    setFields({});
    setFormError(null);
    try {
      await api.post('/staff', {
        name: form.name,
        email: form.email,
        password: form.password,
        roleId: form.roleId,
        branchIds: form.branchIds,
      });
      setFormOpen(false);
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        setFormError(err.message);
        setFields(err.fields ?? {});
      } else {
        setFormError('Could not invite this teammate.');
      }
    } finally {
      setBusy(false);
    }
  }

  async function deactivate(person: StaffRow) {
    setBusy(true);
    try {
      await api.delete(`/staff/${person.id}`);
      setRemoving(null);
      await load();
    } catch {
      setError('Could not deactivate this teammate.');
    } finally {
      setBusy(false);
    }
  }

  const roleGroups = roles.map((role) => ({
    ...role,
    seats: (staff ?? []).filter((row) => row.roleId === role.id).length,
  }));

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Team"
        title="Staff & access"
        description="Invite teammates, give them a role, and scope them to the branches they run."
        actions={
          can('staff.manage') ? (
            <Button onClick={openCreate} disabled={roles.length === 0}>
              <Plus size={16} /> Invite teammate
            </Button>
          ) : null
        }
      />

      {error ? <GlassCard className="mb-5 p-5 text-sm text-[#93000a]">{error}</GlassCard> : null}

      <div className="mb-6 flex flex-wrap gap-2">
        {roleGroups.map((role) => (
          <span key={role.id} className="glass rounded-pill px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
            {role.name} · {role.seats}
          </span>
        ))}
      </div>

      {!staff ? (
        <GlassCard className="p-6">
          <Spinner label="Loading the team" />
        </GlassCard>
      ) : staff.length === 0 ? (
        <EmptyState title="No teammates yet" hint="Invite the front desk and managers to start." />
      ) : (
        <GlassCard className="overflow-hidden">
          <ul className="divide-y hairline">
            {staff.map((person) => (
              <li key={person.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-white">
                  {person.displayName
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')}
                </span>
                <div className="min-w-[180px] flex-1 leading-tight">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {person.displayName}
                    {person.id === me?.staff.id ? <Badge tone="lime">you</Badge> : null}
                  </p>
                  <p className="text-[12px] text-muted">{person.email}</p>
                </div>
                <Badge tone={person.roleName === 'Owner' ? 'dark' : 'neutral'}>
                  <ShieldCheck size={11} /> {person.roleName}
                </Badge>
                <div className="flex min-w-[150px] flex-wrap gap-1.5">
                  {person.branchNames.length === 0 ? (
                    <span className="text-[11px] text-muted">All branches</span>
                  ) : (
                    person.branchNames.map((name) => (
                      <span key={name} className="rounded-pill bg-black/[0.04] px-2.5 py-1 text-[11px] text-muted">
                        {name}
                      </span>
                    ))
                  )}
                </div>
                <span className={cn('flex items-center gap-1.5 text-[11px] font-semibold', person.active ? 'text-lime-deep' : 'text-muted')}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', person.active ? 'bg-lime-deep' : 'bg-muted/40')} />
                  {person.active ? 'Active' : 'Inactive'}
                </span>
                {can('staff.manage') && person.id !== me?.staff.id && person.active ? (
                  <Button variant="ghost" size="sm" onClick={() => setRemoving(person)}>
                    <UserMinus size={13} /> Deactivate
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </GlassCard>
      )}

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title="Invite a teammate"
        description="They sign in with this email and password."
        footer={
          <>
            <Button variant="ghost" onClick={() => setFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => void submit()}
              disabled={busy || !form.name || !form.email || form.password.length < 8 || !form.roleId}
            >
              {busy ? 'Inviting…' : 'Send invite'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Full name" error={fields.name?.[0]} htmlFor="staff-name">
            <Input
              id="staff-name"
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Mariam Fouad"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Work email" error={fields.email?.[0]} htmlFor="staff-email">
              <Input
                id="staff-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="mariam@gym.com"
              />
            </Field>
            <Field label="Temporary password" error={fields.password?.[0]} hint="At least 8 characters" htmlFor="staff-password">
              <Input
                id="staff-password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                placeholder="Welcome123!"
              />
            </Field>
          </div>
          <Field label="Role" error={fields.roleId?.[0]} htmlFor="staff-role">
            <Select
              id="staff-role"
              value={form.roleId}
              onChange={(event) => setForm({ ...form, roleId: event.target.value })}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </Select>
          </Field>
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Branch access</p>
            <div className="flex flex-wrap gap-2">
              {branches.map((branch) => {
                const checked = form.branchIds.includes(branch.id);
                return (
                  <button
                    key={branch.id}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        branchIds: checked
                          ? form.branchIds.filter((id) => id !== branch.id)
                          : [...form.branchIds, branch.id],
                      })
                    }
                    className={cn(
                      'rounded-pill px-4 py-2 text-[12px] font-medium transition',
                      checked ? 'bg-ink text-white' : 'border border-white/80 bg-white/55 text-muted hover:text-ink',
                    )}
                  >
                    {branch.name}
                  </button>
                );
              })}
            </div>
          </div>
          {formError ? <p className="text-sm text-[#93000a]">{formError}</p> : null}
        </div>
      </Modal>

      <Modal
        open={Boolean(removing)}
        onClose={() => setRemoving(null)}
        title="Deactivate this teammate?"
        description={removing ? `${removing.displayName} will lose access immediately. History is kept.` : ''}
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => removing && void deactivate(removing)} disabled={busy}>
              {busy ? 'Deactivating…' : 'Deactivate'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">You can re-activate them later from the same record.</p>
      </Modal>
    </div>
  );
}
