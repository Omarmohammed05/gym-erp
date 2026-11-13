import { clsx, type ClassValue } from 'clsx';
import { X } from 'lucide-react';
import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'lime' | 'glass' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
};

export function Button({ className, variant = 'primary', size = 'md', ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-pill font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50',
        size === 'md' ? 'h-11 px-6 text-sm' : 'h-9 px-4 text-[13px]',
        variant === 'primary' && 'bg-ink text-white hover:shadow-[0_10px_30px_-12px_rgba(60,90,18,0.9)] hover:bg-[#1c1b1b]',
        variant === 'lime' && 'bg-lime text-lime-deep hover:bg-[#c7ea4b]',
        variant === 'glass' && 'glass text-ink hover:bg-white/85',
        variant === 'ghost' && 'text-muted hover:bg-black/5 hover:text-ink',
        variant === 'danger' && 'bg-[#ffdad6] text-[#93000a] hover:bg-[#ffc9c3]',
        className,
      )}
    />
  );
}

export function GlassCard({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('glass rounded-glass', className)}>{children}</div>;
}

export function Field({
  label,
  error,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <label className="block" htmlFor={htmlFor}>
      <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-[#93000a]">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={cn(
        'h-12 w-full rounded-pill border border-white/80 bg-white/60 px-5 text-sm text-ink placeholder:text-muted/70',
        'outline-none transition focus:bg-white focus:ring-[3px] focus:ring-lime/45',
        className,
      )}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={cn(
        'h-12 w-full appearance-none rounded-pill border border-white/80 bg-white/60 px-5 text-sm text-ink',
        'outline-none transition focus:bg-white focus:ring-[3px] focus:ring-lime/45',
        className,
      )}
    >
      {children}
    </select>
  );
}

export function Badge({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: 'neutral' | 'lime' | 'pink' | 'danger' | 'dark';
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-[11px] font-semibold',
        tone === 'neutral' && 'bg-black/[0.05] text-muted',
        tone === 'lime' && 'bg-lime/45 text-lime-deep',
        tone === 'pink' && 'bg-blush-soft/70 text-[#8e0048]',
        tone === 'danger' && 'bg-[#ffdad6] text-[#93000a]',
        tone === 'dark' && 'bg-ink text-white',
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-ink/25 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'animate-rise relative w-full overflow-hidden rounded-glass border border-white/90 bg-white/95 shadow-float backdrop-blur-xl',
          wide ? 'max-w-3xl' : 'max-w-xl',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b hairline px-6 py-5">
          <div>
            <h2 className="font-display text-2xl font-light tracking-tight">{title}</h2>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-muted transition hover:bg-black/5 hover:text-ink"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
        {footer ? <div className="flex justify-end gap-3 border-t hairline bg-white/60 px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-muted" role="status" aria-live="polite">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/15 border-t-ink" />
      {label}
    </div>
  );
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-glass border border-dashed border-black/10 px-6 py-12 text-center">
      <p className="font-display text-xl font-light">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-muted">{hint}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

function sparkPath(values: number[]): string {
  if (values.length < 2) return '0,18 100,18';
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 32 - ((value - min) / span) * 26;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function StatCard({
  label,
  value,
  hint,
  series,
  tone = 'lime',
}: {
  label: string;
  value: string | number;
  hint?: string;
  series?: number[];
  tone?: 'lime' | 'pink';
}) {
  const stroke = tone === 'lime' ? '#3c5a12' : '#ff5c9a';
  return (
    <GlassCard className="flex min-h-[148px] flex-col justify-between p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</span>
        <span
          className={cn('mt-1 h-2 w-2 rounded-full', tone === 'lime' ? 'bg-lime' : 'bg-blush')}
          aria-hidden
        />
      </div>
      <div className="flex items-end justify-between gap-4">
        <span className="num text-[52px] font-extralight leading-none">{value}</span>
        {series && series.length > 1 ? (
          <svg viewBox="0 0 100 36" className="h-10 w-24" role="img" aria-label={`${label} trend`}>
            <polyline
              points={sparkPath(series)}
              fill="none"
              stroke={stroke}
              strokeWidth={1.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </div>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </GlassCard>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-[34px] font-light leading-tight tracking-tight sm:text-[42px]">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </div>
  );
}
