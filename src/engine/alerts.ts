import type { ScenarioInput } from './types';
import { simulate, type ScenarioResult } from './simulate';
import { dependencyIssues } from './capex';
import { fmtPct, fmtUSD } from './money';

export type AlertLevel = 'critica' | 'advertencia' | 'info';

export interface Alert {
  id: string;
  level: AlertLevel;
  message: string;
}

/** Crecimiento de volumen usado para comparar costos variables vs beneficios. */
const VOLUME_STEP = 1.1;

export function variableVsBenefitGrowth(input: ScenarioInput, base: ScenarioResult) {
  const s = structuredClone(input);
  s.voice.inboundCalls *= VOLUME_STEP;
  s.voice.outboundCalls *= VOLUME_STEP;
  s.voice.inboundPerBranch *= VOLUME_STEP;
  s.voice.outboundPerBranch *= VOLUME_STEP;
  s.whatsapp.inboundConversations *= VOLUME_STEP;
  for (const k of Object.keys(s.whatsapp.volumes) as (keyof typeof s.whatsapp.volumes)[]) s.whatsapp.volumes[k] *= VOLUME_STEP;
  const r = simulate(s);
  return {
    deltaVariable: r.consolidated.variableMonthly - base.consolidated.variableMonthly,
    deltaBenefit: r.value.grossMonthly - base.value.grossMonthly,
  };
}

export function computeAlerts(r: ScenarioResult): Alert[] {
  const { input, consolidated: c, finance: f } = r;
  const out: Alert[] = [];
  const H = input.general.horizonMonths;

  if (input.general.budgetLimitYear1 > 0 && c.costYear1 > input.general.budgetLimitYear1) {
    out.push({ id: 'budget', level: 'critica', message: `El costo del año 1 (${fmtUSD(c.costYear1)}) excede el límite de presupuesto (${fmtUSD(input.general.budgetLimitYear1)}).` });
  }
  if (f.roiHorizon !== null && f.roiHorizon < 0) {
    out.push({ id: 'roi', level: 'critica', message: `ROI acumulado negativo a ${H} meses (${fmtPct(f.roiHorizon)}): el proyecto destruye valor con estos supuestos.` });
  }
  if (f.paybackMonth === null) {
    out.push({ id: 'payback', level: 'critica', message: `La inversión no se recupera dentro del horizonte de ${H} meses.` });
  } else if (f.paybackMonth > H) {
    out.push({ id: 'payback', level: 'critica', message: `El período de recuperación (${f.paybackMonth} meses) excede el horizonte.` });
  }
  if (f.netAnnualSteady < 0) {
    out.push({ id: 'neto', level: 'critica', message: `En régimen, el OpEx anual supera al beneficio bruto: pérdida operativa de ${fmtUSD(f.netAnnualSteady)}/año.` });
  }
  if (r.adoption.value < input.culture.adoptionAlertThreshold) {
    out.push({ id: 'adopcion', level: 'advertencia', message: `Adopción efectiva (${fmtPct(r.adoption.value)}) por debajo del umbral (${fmtPct(input.culture.adoptionAlertThreshold)}).` });
  }
  const growth = variableVsBenefitGrowth(input, r);
  if (growth.deltaVariable > growth.deltaBenefit + 0.01) {
    out.push({ id: 'escala', level: 'advertencia', message: `Con +10% de volumen, los costos variables crecen ${fmtUSD(growth.deltaVariable)}/mes y los beneficios ${fmtUSD(growth.deltaBenefit)}/mes: el volumen adicional no se paga solo.` });
  }
  for (const issue of r.whatsapp.issues) out.push({ id: `wa-${issue}`, level: 'advertencia', message: issue });
  for (const issue of dependencyIssues(input.stages, input.activities)) out.push({ id: `dep-${issue}`, level: 'advertencia', message: issue });

  const unconfirmedAmount = r.dataQuality.unconfirmed.reduce((a, u) => a + u.amount, 0);
  if (c.costYear1 > 0 && unconfirmedAmount / c.costYear1 > 0.05) {
    out.push({
      id: 'datos',
      level: 'advertencia',
      message: `Faltan datos confirmados: ${fmtUSD(unconfirmedAmount)} del costo del año 1 se basa en supuestos, valores demo o tarifas históricas (${r.dataQuality.unconfirmed.length} partidas).`,
    });
  }
  if (input.value.benefitMode === 'modelo' && input.value.staffKept && input.value.capacityTreatment === 'monetizar_productividad' && r.value.capacityMonetizedMonthly > 0) {
    out.push({ id: 'capacidad', level: 'info', message: 'Se monetiza capacidad liberada: requiere una hipótesis verificable de aprovechamiento productivo (no es ahorro de nómina).' });
  }
  if (!input.value.hasBaseline) {
    out.push({ id: 'baseline', level: 'advertencia', message: 'Sin línea base de 4 semanas: los resultados no pueden atribuirse a la IA (diap. 5 y 10).' });
  }
  if (input.value.benefitMode === 'presentacion') {
    out.push({ id: 'presentacion', level: 'info', message: 'Modo presentación: los USD 30.000 son beneficio BRUTO declarado, no ahorro neto. El neto descuenta el OpEx.' });
  }
  if (r.decision.decision === 'Suspender') {
    out.push({ id: 'gate', level: 'critica', message: `Puerta de decisión: SUSPENDER. ${r.decision.reason}` });
  }
  return out;
}
