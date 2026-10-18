import type { EvidenceLevel, GateCriterion, Risk } from './types';

export type CriterionStatus = 'cumple' | 'no_cumple' | 'sin_dato';
export type GateDecision = 'Escalar' | 'Continuar piloto' | 'Corregir' | 'Suspender';

export function evaluateCriterion(c: GateCriterion): CriterionStatus {
  if (c.measured === null || !Number.isFinite(c.measured)) return 'sin_dato';
  const ok = c.operator === '>=' ? c.measured >= c.threshold : c.measured <= c.threshold;
  return ok ? 'cumple' : 'no_cumple';
}

export interface DecisionResult {
  decision: GateDecision;
  reason: string;
  statuses: { id: string; label: string; status: CriterionStatus; critical: boolean }[];
}

/**
 * Regla de decisión (kill-fast):
 * 1. Falla un criterio crítico           → Suspender.
 * 2. Falla un criterio no crítico        → Corregir.
 * 3. Faltan mediciones (sin fallas)      → Continuar piloto (no hay evidencia para escalar).
 * 4. Todos los criterios se cumplen      → Escalar.
 */
export function gateDecision(criteria: GateCriterion[]): DecisionResult {
  const statuses = criteria.map((c) => ({ id: c.id, label: c.label, status: evaluateCriterion(c), critical: c.critical }));
  const failedCritical = statuses.filter((s) => s.status === 'no_cumple' && s.critical);
  const failed = statuses.filter((s) => s.status === 'no_cumple' && !s.critical);
  const missing = statuses.filter((s) => s.status === 'sin_dato');

  if (failedCritical.length) {
    return { decision: 'Suspender', reason: `Criterio crítico no cumplido: ${failedCritical.map((s) => s.label).join(', ')}.`, statuses };
  }
  if (failed.length) {
    return { decision: 'Corregir', reason: `Criterios no cumplidos: ${failed.map((s) => s.label).join(', ')}.`, statuses };
  }
  if (missing.length) {
    return { decision: 'Continuar piloto', reason: `Sin medición en ${missing.length} criterio(s): no hay evidencia suficiente para escalar.`, statuses };
  }
  return { decision: 'Escalar', reason: 'Todos los umbrales se cumplen con evidencia medida.', statuses };
}

const EVIDENCE_FACTOR: Record<EvidenceLevel, number> = { sin_evidencia: 1, parcial: 0.7, verificada: 0.4 };

/** Riesgo inherente = probabilidad × impacto (1–25). */
export function inherentRisk(r: Risk): number {
  return r.likelihood * r.impact;
}

/**
 * Riesgo residual: un control sólo diseñado reduce poco (×0,85);
 * la reducción depende de la evidencia de que el control funciona.
 */
export function residualRisk(r: Risk): number {
  const base = inherentRisk(r);
  if (!r.controlDesigned) return base;
  if (r.evidence === 'sin_evidencia') return base * 0.85;
  return base * EVIDENCE_FACTOR[r.evidence];
}

export function riskLevel(score: number): 'alto' | 'medio' | 'bajo' {
  if (score >= 15) return 'alto';
  if (score >= 8) return 'medio';
  return 'bajo';
}
