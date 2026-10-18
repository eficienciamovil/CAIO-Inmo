import type { CultureConfig, CultureIndicator, CxIndicator, PsychoDimension } from './types';
import { clamp } from './money';

export type Moment = 'baseline' | 'target' | 'measured';

/** Puntaje 0–100 de un indicador: si es "menor es mejor" se invierte (100 − v). */
export function indicatorScore(ind: CultureIndicator, value: number): number {
  const v = clamp(value, 0, 100);
  return ind.invert ? 100 - v : v;
}

export interface CompositeIndex {
  value: number | null;
  /** Indicadores sin medición (sólo para 'measured'). */
  missing: string[];
  components: { id: string; label: string; score: number | null; weight: number; weightShare: number }[];
}

/**
 * Índice compuesto = Σ (peso × puntaje) / Σ pesos.
 * No es una medida científica: es una síntesis con pesos configurables.
 * Si falta alguna medición, el índice medido es null (no se inventan datos observados).
 */
export function compositeIndex(indicators: CultureIndicator[], moment: Moment): CompositeIndex {
  const active = indicators.filter((i) => i.weight > 0);
  const totalWeight = active.reduce((a, i) => a + i.weight, 0);
  const missing: string[] = [];
  const components = indicators.map((i) => {
    const raw = moment === 'measured' ? i.measured : i[moment];
    if (raw === null && i.weight > 0) missing.push(i.label);
    return {
      id: i.id,
      label: i.label,
      score: raw === null ? null : indicatorScore(i, raw),
      weight: i.weight,
      weightShare: totalWeight > 0 && i.weight > 0 ? i.weight / totalWeight : 0,
    };
  });
  if (totalWeight === 0 || missing.length > 0) return { value: null, missing, components };
  const value = components.reduce((a, c) => a + (c.score ?? 0) * c.weightShare, 0);
  return { value, missing, components };
}

export interface AdoptionInfo {
  value: number;
  source: 'real' | 'proyeccion';
}

/** Adopción efectiva usada por el modelo económico: medida si existe, si no el objetivo proyectado. */
export function effectiveAdoption(culture: CultureConfig): AdoptionInfo {
  const ind = culture.indicators.find((i) => i.id === 'uso_activo');
  if (!ind) return { value: 0, source: 'proyeccion' };
  if (ind.measured !== null) return { value: clamp(ind.measured, 0, 100), source: 'real' };
  return { value: clamp(ind.target, 0, 100), source: 'proyeccion' };
}

/** Variación objetivo vs línea base de un indicador de CX, con signo según dirección deseada. */
export function cxImprovement(c: CxIndicator, moment: 'target' | 'measured'): number | null {
  const v = moment === 'target' ? c.target : c.measured;
  if (v === null) return null;
  const delta = v - c.baseline;
  return c.higherIsBetter ? delta : -delta;
}

/** Proyección lineal trimestral de un indicador entre línea base y objetivo (no es dato medido). */
export function linearProjection(baseline: number, target: number, periods: number): number[] {
  if (periods <= 1) return [target];
  return Array.from({ length: periods }, (_, i) => baseline + ((target - baseline) * i) / (periods - 1));
}

export function psychoAverage(dims: PsychoDimension[], moment: 'before' | 'after'): number | null {
  const vals = dims.map((d) => d[moment]);
  if (vals.some((v) => v === null) || vals.length === 0) return null;
  return (vals as number[]).reduce((a, b) => a + b, 0) / vals.length;
}
