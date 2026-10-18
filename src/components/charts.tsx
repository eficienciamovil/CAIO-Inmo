import type { ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { fmtUSD } from '../engine/money';

/**
 * Paleta categórica para fondo oscuro (validada: banda de luminosidad, croma,
 * separación CVD ≥ 8 entre adyacentes y contraste ≥ 3:1 sobre #17171c).
 * Se asigna en orden fijo; el dorado se reserva para series únicas/destacadas.
 */
export const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
export const GOLD = '#c9a24b';
export const COST = SERIES[1];
export const BENEFIT = SERIES[0];
export const STATUS = { good: '#0ca30c', warning: '#fab219', serious: '#ec835a', critical: '#d03b3b' };

export const AXIS = { stroke: '#3a3a45', tick: { fill: '#a1a1aa', fontSize: 11 }, tickLine: false };
export const GRID = { stroke: '#2a2a33', strokeDasharray: '0', vertical: false };

export const usdTick = (v: number) => {
  const a = Math.abs(v);
  const s = a >= 1000 ? `${(a / 1000).toFixed(a >= 10000 ? 0 : 1)}k` : `${Math.round(a)}`;
  return `${v < 0 ? '−' : ''}$${s}`;
};

export function ChartFrame({ title, subtitle, height = 260, children, legend }: { title: string; subtitle?: string; height?: number; children: ReactNode; legend?: ReactNode }) {
  return (
    <figure className="card rounded-xl border border-ink-700 bg-ink-900/80 p-4">
      <figcaption className="mb-3">
        <h4 className="text-sm font-semibold text-white">{title}</h4>
        {subtitle && <p className="text-xs text-zinc-500">{subtitle}</p>}
        {legend && <div className="mt-2">{legend}</div>}
      </figcaption>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dashed?: boolean }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-300">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={i.dashed ? { border: `2px dashed ${i.color}` } : { background: i.color }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

interface TooltipPayload {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

/** Tooltip con texto en tinta neutra; el color sólo en la marca. */
export function UsdTooltip({ active, payload, label, labelPrefix = '', formatter }: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
  labelPrefix?: string;
  formatter?: (v: number, name: string) => string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-ink-600 bg-ink-950/95 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-zinc-200">{labelPrefix}{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey ?? p.name)} className="flex items-center gap-2 text-zinc-300">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-zinc-400">{p.name}:</span>
          <span className="ml-auto font-medium tabular-nums text-white">
            {typeof p.value === 'number' ? (formatter ? formatter(p.value, String(p.name)) : fmtUSD(p.value)) : p.value}
          </span>
        </p>
      ))}
    </div>
  );
}
