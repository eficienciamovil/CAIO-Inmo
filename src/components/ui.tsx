import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { DataStatus, Explanation } from '../engine/types';
import { classifyResult, fmtNum, fmtPct, fmtUSD } from '../engine/money';

// ───────────────────────── Estado del dato ─────────────────────────

const STATUS_META: Record<DataStatus, { label: string; cls: string; title: string }> = {
  confirmado: { label: 'Confirmado', cls: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10', title: 'Dato aportado por el usuario (captura o cotización).' },
  presentacion: { label: 'Presentación', cls: 'border-gold-500/50 text-gold-300 bg-gold-500/10', title: 'Cifra de la presentación INMO-IA: hipótesis original, no validada.' },
  supuesto: { label: 'Supuesto', cls: 'border-amber-500/40 text-amber-300 bg-amber-500/10', title: 'Hipótesis a validar.' },
  historico: { label: 'Histórico · validar', cls: 'border-orange-500/40 text-orange-300 bg-orange-500/10', title: 'Tarifa histórica: confirmar vigencia antes de usarla.' },
  demo: { label: 'Demo', cls: 'border-sky-500/40 text-sky-300 bg-sky-500/10', title: 'Valor de demostración: reemplazar con cotización real.' },
  proyeccion: { label: 'Proyección', cls: 'border-violet-400/40 text-violet-300 bg-violet-500/10', title: 'Resultado proyectado por el modelo.' },
  real: { label: 'Medido', cls: 'border-emerald-400/60 text-emerald-200 bg-emerald-500/20', title: 'Resultado efectivamente medido.' },
};

export const STATUS_OPTIONS = Object.keys(STATUS_META) as DataStatus[];

export function StatusBadge({ status }: { status: DataStatus }) {
  const m = STATUS_META[status];
  return (
    <span title={m.title} className={`inline-flex items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${m.cls}`}>
      {m.label}
    </span>
  );
}

export function statusLabel(s: DataStatus): string {
  return STATUS_META[s].label;
}

// ───────────────────────── Drawer de explicación ─────────────────────────

const ExplainCtx = createContext<(e: Explanation | null) => void>(() => {});
export const useExplain = () => useContext(ExplainCtx);

export function ExplainProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Explanation | null>(null);
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && setCurrent(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  return (
    <ExplainCtx.Provider value={setCurrent}>
      {children}
      {current && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 no-print" onClick={() => setCurrent(null)}>
          <aside className="h-full w-full max-w-md overflow-y-auto border-l border-gold-600/30 bg-ink-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`Detalle de ${current.label}`}>
            <div className="mb-1 flex items-start justify-between gap-4">
              <p className="text-xs uppercase tracking-widest text-gold-400">¿De dónde sale este número?</p>
              <button className="text-zinc-400 hover:text-white" onClick={() => setCurrent(null)} aria-label="Cerrar">✕</button>
            </div>
            <h3 className="text-xl font-semibold text-white">{current.label}</h3>
            <div className="mt-3 flex items-center gap-3">
              <span className={`text-3xl font-semibold tabular-nums ${valueTone(current)}`}>{formatExplanation(current)}</span>
              {current.period && <PeriodTag period={current.period} />}
              <StatusBadge status={current.status} />
            </div>
            <h4 className="mt-6 text-xs uppercase tracking-widest text-zinc-400">Fórmula</h4>
            <p className="mt-2 rounded-lg border border-ink-700 bg-ink-950 p-3 font-mono text-sm leading-relaxed text-gold-300">{current.formula}</p>
            <h4 className="mt-6 text-xs uppercase tracking-widest text-zinc-400">Valores de entrada</h4>
            <dl className="mt-2 divide-y divide-ink-700 rounded-lg border border-ink-700">
              {current.inputs.map((i) => (
                <div key={i.label} className="flex justify-between gap-4 px-3 py-2 text-sm">
                  <dt className="text-zinc-400">{i.label}</dt>
                  <dd className="text-right font-medium text-zinc-100">{i.value}</dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      )}
    </ExplainCtx.Provider>
  );
}

function formatExplanation(e: Explanation): string {
  if (e.unit === 'usd') return fmtUSD(e.value);
  if (e.unit === 'pct') return fmtPct(e.value);
  if (e.unit === 'meses') return e.value === null ? 'No se recupera' : `${e.value} meses`;
  return fmtNum(e.value);
}

function valueTone(e: Explanation): string {
  if (e.unit !== 'usd' && e.unit !== 'pct') return 'text-white';
  const c = classifyResult(e.value);
  return c === 'perdida' ? 'text-red-400' : 'text-white';
}

// ───────────────────────── Primitivas ─────────────────────────

export function PeriodTag({ period }: { period: string }) {
  const label: Record<string, string> = { mensual: '/mes', anual: '/año', unico: 'único', horizonte: 'horizonte' };
  return <span className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-300">{label[period] ?? period}</span>;
}

export function Card({ title, subtitle, children, actions, className = '' }: { title?: ReactNode; subtitle?: ReactNode; children: ReactNode; actions?: ReactNode; className?: string }) {
  return (
    <section className={`card rounded-xl border border-ink-700 bg-ink-900/80 p-5 ${className}`}>
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-base font-semibold text-white">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-sm text-zinc-400">{subtitle}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ kicker, title, children }: { kicker: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-400">{kicker}</p>
      <h2 className="mt-1 text-2xl font-semibold text-white md:text-3xl">{title}</h2>
      {children && <div className="mt-2 max-w-4xl text-sm leading-relaxed text-zinc-400">{children}</div>}
    </div>
  );
}

export function Kpi({ label, value, period, explain, tone, hint, status }: {
  label: string;
  value: string;
  period?: string;
  explain?: Explanation;
  tone?: 'ganancia' | 'perdida' | 'neutro' | 'gold';
  hint?: ReactNode;
  status?: DataStatus;
}) {
  const open = useExplain();
  const color = tone === 'perdida' ? 'text-red-400' : tone === 'ganancia' ? 'text-emerald-300' : tone === 'gold' ? 'text-gold-300' : 'text-white';
  const Comp = explain ? 'button' : 'div';
  return (
    <Comp
      onClick={explain ? () => open(explain) : undefined}
      className={`card group flex flex-col rounded-xl border border-ink-700 bg-ink-900/80 p-4 text-left transition ${explain ? 'cursor-pointer hover:border-gold-500/60 hover:bg-ink-850' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-400">{label}</span>
        {period && <PeriodTag period={period} />}
      </div>
      <span className={`mt-2 text-2xl font-semibold tabular-nums ${color}`}>
        {tone === 'perdida' && <span className="sr-only">Pérdida: </span>}
        {value}
      </span>
      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
        {status && <StatusBadge status={status} />}
        {hint}
        {explain && <span className="ml-auto text-gold-500/70 opacity-0 transition group-hover:opacity-100 no-print">ver fórmula →</span>}
      </div>
    </Comp>
  );
}

export function Money({ value, decimals = true, signed = false }: { value: number | null; decimals?: boolean; signed?: boolean }) {
  const c = classifyResult(value);
  const cls = signed ? (c === 'perdida' ? 'text-red-400' : c === 'ganancia' ? 'text-emerald-300' : '') : value !== null && value < -0.005 ? 'text-red-400' : '';
  return <span className={`tabular-nums ${cls}`}>{fmtUSD(value, decimals)}</span>;
}

interface NumberFieldProps {
  label: ReactNode;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  slider?: boolean;
  hint?: ReactNode;
  status?: DataStatus;
  compact?: boolean;
}

/** Slider + input numérico sincronizados. Los valores se acotan a [min, max] al confirmar. */
export function NumberField({ label, value, onChange, min = 0, max, step = 1, unit, slider = false, hint, status, compact }: NumberFieldProps) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const commit = (raw: string) => {
    const n = Number(raw.replace(',', '.'));
    if (!Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    const c = Math.min(max ?? Infinity, Math.max(min, n));
    setText(String(c));
    if (c !== value) onChange(c);
  };
  return (
    <label className={`block ${compact ? '' : 'mb-3'}`}>
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-sm text-zinc-300">{label}</span>
        {status && <StatusBadge status={status} />}
      </div>
      <div className="flex items-center gap-3">
        {slider && max !== undefined && (
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className="range flex-1"
            aria-label={typeof label === 'string' ? label : undefined}
          />
        )}
        <div className={`flex items-center rounded-md border border-ink-600 bg-ink-950 focus-within:border-gold-500 ${slider ? 'w-32' : 'w-full'}`}>
          <input
            type="text"
            inputMode="decimal"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              const n = Number(e.target.value.replace(',', '.'));
              if (e.target.value !== '' && Number.isFinite(n) && n >= min && n <= (max ?? Infinity)) onChange(n);
            }}
            onBlur={(e) => commit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commit((e.target as HTMLInputElement).value)}
            className="w-full bg-transparent px-2 py-1.5 text-right text-sm tabular-nums text-white outline-none"
          />
          {unit && <span className="pr-2 text-xs text-zinc-500">{unit}</span>}
        </div>
      </div>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </label>
  );
}

/** Input numérico compacto para tablas. */
export function CellNumber({ value, onChange, step = 1, min = 0, width = 'w-20' }: { value: number; onChange: (v: number) => void; step?: number; min?: number; width?: string }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <input
      type="text"
      inputMode="decimal"
      value={text}
      step={step}
      onChange={(e) => {
        setText(e.target.value);
        const n = Number(e.target.value.replace(',', '.'));
        if (e.target.value !== '' && Number.isFinite(n) && n >= min) onChange(n);
      }}
      onBlur={() => setText(String(value))}
      className={`${width} rounded border border-ink-600 bg-ink-950 px-1.5 py-1 text-right text-sm tabular-nums text-white outline-none focus:border-gold-500`}
    />
  );
}

export function CellText({ value, onChange, width = 'w-full' }: { value: string; onChange: (v: string) => void; width?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${width} rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-zinc-100 outline-none hover:border-ink-600 focus:border-gold-500 focus:bg-ink-950`}
    />
  );
}

export function Select<T extends string>({ value, onChange, options, label, compact }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label?: ReactNode; compact?: boolean }) {
  const el = (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className="w-full rounded-md border border-ink-600 bg-ink-950 px-2 py-1.5 text-sm text-white outline-none focus:border-gold-500"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
  if (!label) return el;
  return (
    <label className={`block ${compact ? '' : 'mb-3'}`}>
      <span className="mb-1 block text-sm text-zinc-300">{label}</span>
      {el}
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode }) {
  return (
    <label className="mb-3 flex cursor-pointer items-start gap-3">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 h-5 w-9 shrink-0 rounded-full border transition ${checked ? 'border-gold-500 bg-gold-500/80' : 'border-ink-600 bg-ink-700'}`}
      >
        <span className={`block h-4 w-4 rounded-full bg-white shadow transition ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </button>
      <span>
        <span className="text-sm text-zinc-200">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>}
      </span>
    </label>
  );
}

export function Note({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'gold' | 'danger'; children: ReactNode }) {
  const cls = {
    info: 'border-sky-500/30 bg-sky-500/5 text-sky-100',
    warn: 'border-amber-500/40 bg-amber-500/5 text-amber-100',
    gold: 'border-gold-500/40 bg-gold-500/5 text-gold-300',
    danger: 'border-red-500/40 bg-red-500/10 text-red-100',
  }[tone];
  return <div className={`rounded-lg border px-4 py-3 text-sm leading-relaxed ${cls}`}>{children}</div>;
}

export function Button({ children, onClick, variant = 'ghost', title }: { children: ReactNode; onClick: () => void; variant?: 'ghost' | 'gold' | 'danger'; title?: string }) {
  const cls = {
    ghost: 'border-ink-600 text-zinc-200 hover:border-gold-500 hover:text-white',
    gold: 'border-gold-500 bg-gold-500/90 text-ink-950 hover:bg-gold-400',
    danger: 'border-red-500/50 text-red-300 hover:bg-red-500/10',
  }[variant];
  return (
    <button type="button" title={title} onClick={onClick} className={`rounded-md border px-3 py-1.5 text-sm font-medium transition ${cls}`}>
      {children}
    </button>
  );
}

export function Table({ head, children, foot }: { head: ReactNode[]; children: ReactNode; foot?: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max text-sm">
        <thead>
          <tr className="border-b border-ink-700 text-left text-xs uppercase tracking-wider text-zinc-400">
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-2 py-2 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-800">{children}</tbody>
        {foot && <tfoot className="border-t border-gold-600/40 font-semibold text-white">{foot}</tfoot>}
      </table>
    </div>
  );
}

export function Grid({ children, cols = 4 }: { children: ReactNode; cols?: 2 | 3 | 4 | 5 }) {
  const c = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-2 xl:grid-cols-4', 5: 'md:grid-cols-3 xl:grid-cols-5' }[cols];
  return <div className={`grid grid-cols-1 gap-4 ${c}`}>{children}</div>;
}

export function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-ink-800 py-1.5 text-sm last:border-0">
      <span className="text-zinc-400">{label}</span>
      <span className="text-right font-medium text-zinc-100">{children}</span>
    </div>
  );
}
