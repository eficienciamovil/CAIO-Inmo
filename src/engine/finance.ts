import { safeDiv } from './money';

/** ROI = (Beneficios acumulados − Costos acumulados) / Costos acumulados × 100. */
export function roi(benefits: number, costs: number): number | null {
  const r = safeDiv(benefits - costs, costs);
  return r === null ? null : r * 100;
}

/** Primer mes (1-based) en que el flujo neto acumulado deja de ser negativo, habiendo existido inversión. */
export function paybackMonth(netFlows: number[]): number | null {
  let cum = 0;
  let invested = false;
  for (let i = 0; i < netFlows.length; i++) {
    cum += netFlows[i];
    if (cum < 0) invested = true;
    if (invested && cum >= 0) return i + 1;
  }
  // El flujo acumulado nunca fue negativo: la inversión se cubre desde el primer mes.
  if (!invested && netFlows.length > 0 && cum >= 0) return 1;
  return null;
}

export function monthlyRate(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

/** VAN con flujos mensuales al final de cada mes, descontados con la tasa anual equivalente. */
export function npv(annualRatePct: number, flows: number[]): number {
  const r = monthlyRate(annualRatePct);
  return flows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + r, i + 1), 0);
}

function npvAtMonthly(r: number, flows: number[]): number {
  return flows.reduce((acc, cf, i) => acc + cf / Math.pow(1 + r, i + 1), 0);
}

/**
 * TIR anual equivalente (bisección sobre la tasa mensual).
 * Devuelve null si no hay cambio de signo en los flujos o no converge en el rango.
 */
export function irrAnnual(flows: number[]): number | null {
  const hasNeg = flows.some((f) => f < 0);
  const hasPos = flows.some((f) => f > 0);
  if (!hasNeg || !hasPos) return null;
  let lo = -0.99;
  let hi = 1;
  let fLo = npvAtMonthly(lo, flows);
  const fHi = npvAtMonthly(hi, flows);
  if (fLo * fHi > 0) return null;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npvAtMonthly(mid, flows);
    if (Math.abs(fMid) < 1e-7) {
      lo = hi = mid;
      break;
    }
    if (fLo * fMid < 0) {
      hi = mid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  const rm = (lo + hi) / 2;
  return (Math.pow(1 + rm, 12) - 1) * 100;
}

export interface BreakEvenAnswer {
  totalCost: number;
  otherBenefits: number;
  gapToCover: number;
  marginPerOperation: number;
  operationsTotal: number | null;
  operationsPerMonth: number | null;
  operationsPerMonthNoOtherBenefits: number | null;
  verifiableSavingsPerMonth: number | null;
  months: number;
}

/**
 * "¿Cuántas operaciones comerciales adicionales, o cuánto ahorro verificable, se necesitan para cubrir la inversión?"
 * Costo total del horizonte (inversión + OpEx) − beneficios no comerciales del horizonte = brecha.
 * Operaciones = brecha / contribución marginal por operación.
 * Ahorro verificable alternativo = costo total / meses del horizonte.
 */
export function breakEven(totalCost: number, otherBenefits: number, margin: number, months: number): BreakEvenAnswer {
  const gap = Math.max(0, totalCost - otherBenefits);
  const ops = safeDiv(gap, margin);
  return {
    totalCost,
    otherBenefits,
    gapToCover: gap,
    marginPerOperation: margin,
    operationsTotal: ops === null ? null : Math.ceil(ops * 100) / 100,
    operationsPerMonth: ops === null ? null : ops / months,
    operationsPerMonthNoOtherBenefits: (() => {
      const x = safeDiv(totalCost, margin);
      return x === null ? null : x / months;
    })(),
    verifiableSavingsPerMonth: safeDiv(totalCost, months),
    months,
  };
}
