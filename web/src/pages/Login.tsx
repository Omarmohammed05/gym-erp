import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { ApiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Field, GlassCard, Input } from '../components/ui';

const DEMO_ACCOUNTS = [
  { label: 'Owner', email: 'owner@kinetic.eg' },
  { label: 'Manager', email: 'manager@kinetic.eg' },
  { label: 'Reception', email: 'reception@kinetic.eg' },
  { label: 'Accountant', email: 'accountant@kinetic.eg' },
];

const DEMO_PASSWORD = 'Kinetic123!';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('owner@kinetic.eg');
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(nextEmail = email, nextPassword = password) {
    setBusy(true);
    setError(null);
    try {
      await signIn(nextEmail.trim(), nextPassword);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-[1060px] items-center gap-10 lg:grid-cols-[1.02fr_0.98fr]">
        <section className="animate-rise">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-lime">
              <span className="num text-xl font-light">K</span>
            </span>
            <div className="leading-tight">
              <p className="font-display text-lg font-light tracking-tight">Kinetic Gym</p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted">gym erp · cairo</p>
            </div>
          </div>

          <h1 className="mt-10 font-display text-[46px] font-extralight leading-[1.05] tracking-tight sm:text-[58px]">
            Run the gym.
            <br />
            <span className="bg-gradient-to-r from-[#8e0048] via-blush to-[#ff8eb6] bg-clip-text text-transparent">
              Not the spreadsheet.
            </span>
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
            One calm system for branches, staff and permissions — the foundation of members, billing,
            check-in and Google Wallet passes.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            {['Tenant-scoped data', 'Server-side RBAC', 'Append-only audit'].map((item) => (
              <span
                key={item}
                className="glass inline-flex items-center gap-2 rounded-pill px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-lime" aria-hidden />
                {item}
              </span>
            ))}
          </div>
        </section>

        <GlassCard className="animate-rise p-6 sm:p-8">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            <Sparkles size={14} className="text-blush" />
            Staff sign in
          </div>
          <h2 className="mt-3 font-display text-3xl font-light tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-muted">Use your work email and password.</p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <Field label="Work email" htmlFor="email">
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@gym.com"
                required
              />
            </Field>
            <Field label="Password" htmlFor="password">
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </Field>

            {error ? (
              <p className="rounded-2xl bg-[#ffdad6] px-4 py-3 text-sm text-[#93000a]" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
              {!busy ? <ArrowRight size={16} /> : null}
            </Button>
          </form>

          <div className="mt-7 border-t hairline pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Demo team</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email);
                    setPassword(DEMO_PASSWORD);
                    void submit(account.email, DEMO_PASSWORD);
                  }}
                  className="rounded-pill border border-white/80 bg-white/55 px-3 py-2 text-[12px] font-medium text-muted transition hover:bg-white hover:text-ink"
                >
                  {account.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted">
              Password for all demo accounts: <span className="font-semibold text-ink">{DEMO_PASSWORD}</span>
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
