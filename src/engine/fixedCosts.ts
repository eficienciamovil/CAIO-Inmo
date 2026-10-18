import type { CostLine } from './types';
import { sum, toMonthly } from './money';

export interface Drivers {
  employees: number;
  branches: number;
}

/** Cantidad efectiva según el multiplicador de la línea. */
export function effectiveQuantity(line: CostLine, d: Drivers): number {
  const base = Math.max(0, line.quantity);
  if (line.driver === 'por_empleado') return base * d.employees;
  if (line.driver === 'por_sucursal') return base * d.branches;
  return base;
}

/** Subtotal por período de la línea (cantidad efectiva × precio unitario). */
export function lineAmount(line: CostLine, d: Drivers): number {
  return effectiveQuantity(line, d) * Math.max(0, line.unitPrice);
}

export function lineMonthly(line: CostLine, d: Drivers): number {
  return toMonthly(lineAmount(line, d), line.periodicity);
}

export function lineAnnual(line: CostLine, d: Drivers): number {
  return lineMonthly(line, d) * 12;
}

export interface FixedSummary {
  fixedMonthly: number;
  semifixedMonthly: number;
  oneOffTotal: number;
  byLine: { id: string; concept: string; category: string; monthly: number; annual: number; oneOff: number }[];
  /** Costo fijo+semifijo recurrente activo en el mes m. */
  recurringInMonth: (m: number) => { fixed: number; semifixed: number };
  /** Desembolsos únicos del mes m. */
  oneOffInMonth: (m: number) => number;
}

/**
 * Los cargos no mensuales se prorratean en el equivalente mensual
 * (criterio devengado para comparar meses entre sí).
 */
export function summarizeFixed(lines: CostLine[], d: Drivers): FixedSummary {
  const recurring = lines.filter((l) => l.periodicity !== 'unico');
  const oneOff = lines.filter((l) => l.periodicity === 'unico');
  const monthlyOf = (cat: 'fijo' | 'semifijo', m?: number) =>
    sum(recurring.filter((l) => l.category === cat && (m === undefined || l.startMonth <= m)).map((l) => lineMonthly(l, d)));

  return {
    fixedMonthly: monthlyOf('fijo'),
    semifixedMonthly: monthlyOf('semifijo'),
    oneOffTotal: sum(oneOff.map((l) => lineAmount(l, d))),
    byLine: lines.map((l) => ({
      id: l.id,
      concept: l.concept,
      category: l.category,
      monthly: lineMonthly(l, d),
      annual: lineAnnual(l, d),
      oneOff: l.periodicity === 'unico' ? lineAmount(l, d) : 0,
    })),
    recurringInMonth: (m) => ({ fixed: monthlyOf('fijo', m), semifixed: monthlyOf('semifijo', m) }),
    oneOffInMonth: (m) => sum(oneOff.filter((l) => l.startMonth === m).map((l) => lineAmount(l, d))),
  };
}
