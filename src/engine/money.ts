import type { Periodicity } from './types';

/** Meses que cubre cada periodicidad. 'unico' no tiene equivalente mensual. */
export const PERIOD_MONTHS: Record<Periodicity, number> = {
  unico: 0,
  mensual: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

/** Convierte un importe periódico a su equivalente mensual. 'unico' → 0. */
export function toMonthly(amount: number, periodicity: Periodicity): number {
  const months = PERIOD_MONTHS[periodicity];
  return months === 0 ? 0 : amount / months;
}

/** División segura: devuelve null si el divisor es 0 o no es finito. */
export function safeDiv(a: number, b: number): number | null {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return null;
  return a / b;
}

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Cantidad de sesiones necesarias, redondeando hacia arriba según la capacidad. */
export function sessionsNeeded(participants: number, capacity: number): number {
  if (participants <= 0) return 0;
  if (capacity <= 0) return participants; // capacidad inválida: una sesión por persona
  return Math.ceil(participants / capacity);
}

export const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/** Redondeo a centavos para evitar ruido de coma flotante en reportes. */
export const round2 = (x: number): number => Math.round((x + Number.EPSILON) * 100) / 100;

/** Rampa lineal: 0 antes de `start`, luego crece hasta 1 en `rampMonths` meses. */
export function rampFactor(month: number, start: number, rampMonths: number): number {
  if (month < start) return 0;
  if (rampMonths <= 1) return 1;
  return Math.min(1, (month - start + 1) / rampMonths);
}

export type ResultSign = 'ganancia' | 'perdida' | 'neutro';

/** Clasifica un resultado: un negativo nunca se presenta como ganancia. */
export function classifyResult(value: number | null): ResultSign {
  if (value === null || Math.abs(value) < 0.005) return 'neutro';
  return value > 0 ? 'ganancia' : 'perdida';
}

const usd = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd0 = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
const num = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });

/** Formato USD con signo explícito para negativos. null → "n/d". */
export function fmtUSD(value: number | null, decimals = true): string {
  if (value === null || !Number.isFinite(value)) return 'n/d';
  const f = decimals ? usd : usd0;
  const s = f.format(Math.abs(value));
  return value < -0.005 ? `−${s}` : s;
}

export function fmtNum(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'n/d';
  return value < 0 ? `−${num.format(Math.abs(value))}` : num.format(value);
}

export function fmtPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'n/d';
  return `${fmtNum(value)}%`;
}
