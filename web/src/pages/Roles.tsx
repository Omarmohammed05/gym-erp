import { Check, Plus, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { ApiError, api } from '../lib/api';
import { useAuth } from '../lib/auth';
import {
  Badge,
  Button,
  Field,
  GlassCard,
  Input,
  Modal,
  PageHeader,
  Spinner,
  cn,
} from '../components/ui';

type Role = { id: string; name: string; permissions: string[]; seats: number; isSystem: boolean };
type PermissionMeta = { key: string; label: string; group: string; description: string };

export default function Roles() {
  const { can } = useAuth();
  const [roles, setRoles] = useState<Role[] | null>(null);
  const [catalogue, setCatalogue] = useState<PermissionMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Role | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    try {
      const [roleData, permissionData] = await Promise.all([
        api.get<{ roles: Role[] }>('/roles'),
        api.get<{ permissions: PermissionMeta[] }>('/roles/permissions'),
      ]);
      setRoles(roleData.roles);
      setCatalogue(permissionData.permissions);
    } catch {
      setError('Could not load roles.');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const grouped = useMemo(() => {
    const groups = new Map<string, PermissionMeta[]>();
    for (const permission of catalogue) {
      groups.set(permission.group, [...(groups.get(permission.group) ?? []), permission]);
    }
    return [...groups.entries()];
  }, [catalogue]);

  const labels = useMemo(() => new Map(catalogue.map((p) => [p.key, p.label])), [catalogue]);

  function openEdit(role: Role) {
    setEditing(role);
    setCreating(false);
    setName(role.name);
    setSelected(role.permissions);
    setFormError(null);
  }

  function openCreate() {
    setEditing(null);
    setCreating(true);
    setName('');
    setSelected(['branches.read', 'members.read']);
    setFormError(null);
  }

  function close() {
    setEditing(null);
    setCreating(false);
    setFormError(null);
  }

  async function save() {
    setBusy(true);
    setFormError(null);
    try {
      if (editing) {
        await api.patch(`/roles/${editing.id}`, { name, permissions: selected });
      } else {
        await api.post('/roles', { name, permissions: selected });
      }
      close();
      await load();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save this role.');
    } finally {
      setBusy(false);
    }
  }

  const open = Boolean(editing) || creating;

  return (
    <div className="animate-rise">
      <PageHeader
        eyebrow="Trust"
        title="Roles & permissions"
        description="Permissions are checked on the server for every request. Branch scope sits beside them."
        actions={
          can('roles.manage') ? (
            <Button onClick={openCreate}>
              <Plus size={16} /> New role
            </Button>
          ) : null
        }
      />

      {error ? <GlassCard className="mb-5 p-5 text-sm text-[#93000a]">{error}</GlassCard> : null}

      {!roles ? (
        <GlassCard className="p-6">
          <Spinner label="Loading roles" />
        </GlassCard>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <GlassCard key={role.id} className="flex flex-col p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-2xl font-light tracking-tight">{role.name}</h2>
                  <p className="mt-1 text-[12px] text-muted">
                    {role.seats} {role.seats === 1 ? 'teammate' : 'teammates'} · {role.permissions.length} permissions
                  </p>
                </div>
                <Badge tone={role.name === 'Owner' ? 'dark' : 'neutral'}>
                  <ShieldCheck size={11} /> {role.isSystem ? 'system' : 'custom'}
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-1.5">
                {role.permissions.slice(0, 5).map((permission) => (
                  <span key={permission} className="rounded-pill bg-black/[0.04] px-2.5 py-1 text-[11px] text-muted">
                    {labels.get(permission) ?? permission}
                  </span>
                ))}
                {role.permissions.length > 5 ? (
                  <span className="rounded-pill bg-lime/50 px-2.5 py-1 text-[11px] font-semibold text-lime-deep">
                    +{role.permissions.length - 5}
                  </span>
                ) : null}
              </div>

              {can('roles.manage') ? (
                <div className="mt-5 border-t hairline pt-4">
                  <Button variant="glass" size="sm" onClick={() => openEdit(role)}>
                    Edit permissions
                  </Button>
                </div>
              ) : null}
            </GlassCard>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={close}
        wide
        title={editing ? `Edit ${editing.name}` : 'New role'}
        description="Pick exactly what this role can do. Changes are audited."
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button onClick={() => void save()} disabled={busy || name.trim().length < 2}>
              {busy ? 'Saving…' : editing ? 'Save permissions' : 'Create role'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Field label="Role name" htmlFor="role-name">
            <Input id="role-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Shift supervisor" />
          </Field>

          <div className="space-y-4">
            {grouped.map(([group, permissions]) => (
              <div key={group}>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{group}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {permissions.map((permission) => {
                    const checked = selected.includes(permission.key);
                    return (
                      <button
                        key={permission.key}
                        type="button"
                        onClick={() =>
                          setSelected(
                            checked
                              ? selected.filter((key) => key !== permission.key)
                              : [...selected, permission.key],
                          )
                        }
                        className={cn(
                          'flex items-start gap-3 rounded-[18px] border px-3.5 py-3 text-start transition',
                          checked
                            ? 'border-lime-deep/30 bg-lime/25'
                            : 'border-white/80 bg-white/45 hover:bg-white/70',
                        )}
                      >
                        <span
                          className={cn(
                            'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[6px] border',
                            checked ? 'border-lime-deep bg-ink text-lime' : 'border-black/20',
                          )}
                          aria-hidden
                        >
                          {checked ? <Check size={11} /> : null}
                        </span>
                        <span className="leading-tight">
                          <span className="block text-[13px] font-medium">{permission.label}</span>
                          <span className="mt-0.5 block text-[11px] text-muted">{permission.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {formError ? <p className="text-sm text-[#93000a]">{formError}</p> : null}
        </div>
      </Modal>
    </div>
  );
}
