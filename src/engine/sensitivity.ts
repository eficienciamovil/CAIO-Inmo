import type { ScenarioInput } from './types';
import { simulate } from './simulate';

export interface SensitivityVar {
  id: string;
  label: string;
  apply: (s: ScenarioInput, factor: number) => void;
}

const setAdoption = (s: ScenarioInput, factor: number) => {
  const ind = s.culture.indicators.find((i) => i.id === 'uso_activo');
  if (!ind) return;
  if (ind.measured !== null) ind.measured = Math.min(100, ind.measured * factor);
  else ind.target = Math.min(100, ind.target * factor);
};

/** Variables del análisis de sensibilidad. `factor` multiplica el valor base (0,8 = −20%). */
export const SENSITIVITY_VARS: SensitivityVar[] = [
  {
    id: 'llamadas',
    label: 'Cantidad de llamadas',
    apply: (s, f) => {
      s.voice.inboundCalls *= f;
      s.voice.outboundCalls *= f;
      s.voice.inboundPerBranch *= f;
      s.voice.outboundPerBranch *= f;
    },
  },
  {
    id: 'duracion',
    label: 'Duración promedio',
    apply: (s, f) => {
      s.voice.inboundDurationMin *= f;
      s.voice.outboundDurationMin *= f;
    },
  },
  { id: 'tarifa', label: 'Costo por minuto (Retell)', apply: (s, f) => { s.voice.retellPerMin *= f; } },
  {
    id: 'automatizacion',
    label: 'Tasa de automatización',
    apply: (s, f) => {
      s.voice.aiHandledPct = Math.min(100, s.voice.aiHandledPct * f);
      s.whatsapp.aiCoveragePct = Math.min(100, s.whatsapp.aiCoveragePct * f);
    },
  },
  { id: 'adopcion', label: 'Adopción por empleados', apply: setAdoption },
  { id: 'conversion', label: 'Conversión comercial', apply: (s, f) => { s.value.visitToClosePct = Math.min(100, s.value.visitToClosePct * f); } },
  { id: 'margen', label: 'Margen por operación', apply: (s, f) => { s.value.marginPerOperation *= f; } },
  {
    id: 'capacitacion',
    label: 'Costos de capacitación',
    apply: (s, f) => {
      s.training.instructorRate *= f;
      s.training.materialsPerParticipant *= f;
      s.training.feePerParticipant *= f;
      for (const a of s.activities) {
        if (a.isTraining) {
          a.hourlyRate *= f;
          a.externalCost *= f;
        }
      }
    },
  },
];

export interface SensitivityRow {
  id: string;
  label: string;
  low: number | null;
  base: number | null;
  high: number | null;
  /** Amplitud del efecto (para ordenar el tornado). */
  swing: number;
}

export type SensitivityMetric = 'roi' | 'npv' | 'netYear1';

function metricOf(input: ScenarioInput, metric: SensitivityMetric): number | null {
  const r = simulate(input);
  if (metric === 'roi') return r.finance.roiHorizon;
  if (metric === 'npv') return r.finance.npv;
  return r.finance.netYear1;
}

/** Tornado: cada variable se mueve ±delta% manteniendo el resto constante. */
export function sensitivity(input: ScenarioInput, deltaPct = 20, metric: SensitivityMetric = 'roi'): SensitivityRow[] {
  const base = metricOf(input, metric);
  return SENSITIVITY_VARS.map((v) => {
    const lowInput = structuredClone(input);
    v.apply(lowInput, 1 - deltaPct / 100);
    const highInput = structuredClone(input);
    v.apply(highInput, 1 + deltaPct / 100);
    const low = metricOf(lowInput, metric);
    const high = metricOf(highInput, metric);
    const swing = Math.abs((high ?? 0) - (low ?? 0));
    return { id: v.id, label: v.label, low, base, high, swing };
  }).sort((a, b) => b.swing - a.swing);
}

/** Curva de una variable: valor del indicador para varios multiplicadores. */
export function sensitivityCurve(input: ScenarioInput, varId: string, factors: number[], metric: SensitivityMetric = 'roi') {
  const v = SENSITIVITY_VARS.find((x) => x.id === varId);
  if (!v) return [];
  return factors.map((f) => {
    const s = structuredClone(input);
    v.apply(s, f);
    return { factor: f, value: metricOf(s, metric) };
  });
}
