import type { DataStatus, Explanation, ScenarioInput } from './types';
import { clamp, fmtNum, fmtPct, fmtUSD, rampFactor, safeDiv, sum } from './money';
import { summarizeCapex, type CapexSummary } from './capex';
import { summarizeFixed, type FixedSummary } from './fixedCosts';
import { computeTraining, type TrainingResult } from './training';
import { CALL_LIMITS, computeVoice, type VoiceResult } from './voice';
import { computeWhatsApp, type WhatsAppResult } from './whatsapp';
import { computeValue, type ValueResult } from './value';
import { compositeIndex, effectiveAdoption, type AdoptionInfo, type CompositeIndex } from './culture';
import { breakEven, irrAnnual, npv, paybackMonth, roi, type BreakEvenAnswer } from './finance';
import { gateDecision, type DecisionResult } from './governance';

export const LIMITS = {
  employees: [1, 100],
  branches: [1, 20],
  inboundCalls: CALL_LIMITS.inbound,
  outboundCalls: CALL_LIMITS.outbound,
} as const;

/** Serie de 36 meses: siempre se calcula completa; el horizonte elige cuántos meses entran en ROI/VAN. */
export const SERIES_MONTHS = 36;

/** Normaliza valores fuera de rango (no muta el input). */
export function sanitize(input: ScenarioInput): ScenarioInput {
  const s: ScenarioInput = structuredClone(input);
  s.general.employees = Math.round(clamp(s.general.employees, LIMITS.employees[0], LIMITS.employees[1]));
  s.general.branches = Math.round(clamp(s.general.branches, LIMITS.branches[0], LIMITS.branches[1]));
  s.general.horizonMonths = clamp(Math.round(s.general.horizonMonths), 12, SERIES_MONTHS);
  s.voice.inboundCalls = clamp(s.voice.inboundCalls, LIMITS.inboundCalls[0], LIMITS.inboundCalls[1]);
  s.voice.outboundCalls = clamp(s.voice.outboundCalls, LIMITS.outboundCalls[0], LIMITS.outboundCalls[1]);
  s.voice.inboundPerBranch = Math.max(0, s.voice.inboundPerBranch);
  s.voice.outboundPerBranch = Math.max(0, s.voice.outboundPerBranch);
  for (const k of ['aiHandledPct', 'humanTransferPct', 'failedPct'] as const) s.voice[k] = clamp(s.voice[k], 0, 100);
  for (const k of ['inboundDurationMin', 'outboundDurationMin', 'retellPerMin', 'telephonyInboundPerMin', 'telephonyOutboundPerMin', 'perOutboundCallFee', 'connectionFeeMonthly', 'addonsMonthly', 'retriesPerFailed', 'failedAttemptMin'] as const) {
    s.voice[k] = Math.max(0, s.voice[k]);
  }
  s.training.pctToTrain = clamp(s.training.pctToTrain, 0, 100);
  for (const a of s.activities) {
    a.hours = Math.max(0, a.hours);
    a.hourlyRate = Math.max(0, a.hourlyRate);
    a.externalCost = Math.max(0, a.externalCost);
    a.month = clamp(Math.round(a.month), 1, SERIES_MONTHS);
  }
  for (const l of s.fixedLines) {
    l.quantity = Math.max(0, l.quantity);
    l.unitPrice = Math.max(0, l.unitPrice);
    l.startMonth = clamp(Math.round(l.startMonth), 1, SERIES_MONTHS);
  }
  return s;
}

export interface MonthRow {
  month: number;
  capex: number;
  trainingInitial: number;
  oneOff: number;
  fixed: number;
  semifixed: number;
  trainingRecurring: number;
  capexRecurring: number;
  eleven: number;
  voice: number;
  whatsapp: number;
  otherVariable: number;
  variable: number;
  opex: number;
  investment: number;
  totalCost: number;
  savings: number;
  capacity: number;
  contribution: number;
  benefits: number;
  net: number;
  cumulative: number;
  /** Gasto contable (P&L) si la inversión se activa y amortiza. */
  accountingExpense: number;
}

export interface Consolidated {
  initialInvestment: number;
  fixedMonthly: number;
  semifixedMonthly: number;
  variableMonthly: number;
  opexMonthly: number;
  opexAnnualSteady: number;
  opexYear1: number;
  /** Presupuesto del año 1 = inversión inicial + OpEx anual. */
  costYear1: number;
  /** Desembolso de caja de los meses 1–12 según la serie (arranques, rampas y fechas). */
  cashYear1: number;
  cost3Years: number;
  costHorizon: number;
  costPerBranchYear1: number | null;
  costPerEmployeeYear1: number | null;
  costPerAICall: number | null;
  costPerUsefulLead: number | null;
  costPerVisit: number | null;
  accountingYear1: number;
  opexByCategory: { name: string; value: number }[];
}

export interface FinanceResult {
  benefitsHorizon: number;
  costsHorizon: number;
  netHorizon: number;
  roiHorizon: number | null;
  roiYear1: number | null;
  benefitsYear1: number;
  netYear1: number;
  netAnnualSteady: number;
  paybackMonth: number | null;
  npv: number;
  irr: number | null;
  breakEven: BreakEvenAnswer;
  opsToCoverOpexMonthly: number | null;
  recovery: RecoveryAnswer;
}

/** Ventas adicionales necesarias para recuperar el costo del año 1 (criterio del informe AMBA). */
export interface RecoveryAnswer {
  target: number;
  marginPreTax: number;
  marginAfterTax: number;
  salesPreTax: number | null;
  salesAfterTax: number | null;
  months: number;
  salesPerYearAfterTax: number | null;
}

export function salesToRecover(target: number, margin: number, marginAfterTax: number, months: number): RecoveryAnswer {
  const pre = safeDiv(target, margin);
  const post = safeDiv(target, marginAfterTax);
  const salesAfterTax = post === null ? null : Math.ceil(post - 1e-9);
  return {
    target,
    marginPreTax: margin,
    marginAfterTax,
    salesPreTax: pre === null ? null : Math.ceil(pre - 1e-9),
    salesAfterTax,
    months,
    salesPerYearAfterTax: salesAfterTax === null ? null : Math.ceil(salesAfterTax / (months / 12)),
  };
}

export interface DataQuality {
  /** Partidas no confirmadas con impacto en costos. */
  unconfirmed: { area: string; item: string; status: DataStatus; amount: number }[];
  confirmedShareYear1: number | null;
}

export interface ScenarioResult {
  input: ScenarioInput;
  capex: CapexSummary;
  fixed: FixedSummary;
  training: TrainingResult;
  voice: VoiceResult;
  whatsapp: WhatsAppResult;
  otherVariableMonthly: number;
  value: ValueResult;
  adoption: AdoptionInfo;
  cultureIndex: { baseline: CompositeIndex; target: CompositeIndex; measured: CompositeIndex };
  months: MonthRow[];
  consolidated: Consolidated;
  finance: FinanceResult;
  decision: DecisionResult;
  dataQuality: DataQuality;
  explain: Record<string, Explanation>;
}

export function simulate(raw: ScenarioInput): ScenarioResult {
  const input = sanitize(raw);
  const { general, rollout } = input;
  const drivers = { employees: general.employees, branches: general.branches };

  const training = computeTraining(input.training, general.employees);
  const capex = summarizeCapex(input.stages, input.activities, input.training.includedInCapex);
  const fixed = summarizeFixed(input.fixedLines, drivers);
  const voice = computeVoice(input.voice, input.eleven, general.branches);
  const whatsapp = computeWhatsApp(input.whatsapp);
  const adoption = effectiveAdoption(input.culture);

  const aiCalls = voice.aiInboundCalls + voice.aiOutboundCalls;
  const llmFull = (input.otherVariable.llmPer1kInteractions * (aiCalls + whatsapp.aiConversations)) / 1000;
  const transcriptionFull = input.otherVariable.transcriptionPerMin * voice.totalAIMin;
  const otherVariableMonthly = llmFull + transcriptionFull + input.otherVariable.storageMonthly;

  const value = computeValue(input.value, {
    inboundCalls: voice.volumes.inbound,
    aiCallPct: input.voice.enabled ? input.voice.aiHandledPct : 0,
    waInbound: input.whatsapp.enabled ? input.whatsapp.inboundConversations : 0,
    waAiPct: input.whatsapp.enabled ? input.whatsapp.aiCoveragePct : 0,
    transferPct: input.voice.humanTransferPct,
    adoptionPct: adoption.value,
    branches: general.branches,
  });

  // ───── Serie mensual ─────
  const firstChannel = Math.min(
    input.whatsapp.enabled ? rollout.whatsappStartMonth : Infinity,
    input.voice.enabled ? rollout.voiceStartMonth : Infinity,
  );
  const storageStart = Number.isFinite(firstChannel) ? firstChannel : Infinity;
  const accountingActivate = general.capexAccounting === 'activar';
  const amort = Math.max(1, general.amortizationMonths);

  const months: MonthRow[] = [];
  let cumulative = 0;
  const investmentByMonth: number[] = [];
  for (let m = 1; m <= SERIES_MONTHS; m++) {
    const rv = input.voice.enabled ? rampFactor(m, rollout.voiceStartMonth, rollout.rampMonths) : 0;
    const rw = input.whatsapp.enabled ? rampFactor(m, rollout.whatsappStartMonth, rollout.rampMonths) : 0;
    const rb = rampFactor(m, rollout.benefitStartMonth, rollout.benefitRampMonths);

    const capexM = capex.oneTimeByMonth(m);
    const trainingInitial = m === input.training.month ? training.initialCounted : 0;
    const oneOff = fixed.oneOffInMonth(m);
    const { fixed: fixedM, semifixed } = fixed.recurringInMonth(m);
    // Capacitación recurrente (refuerzos y rotación): presupuesto anual prorrateado desde el mes 1.
    const trainingRecurring = training.recurringMonthly;
    const capexRecurring = capex.recurringByMonth(m);
    const voiceLive = input.voice.enabled && m >= rollout.voiceStartMonth;
    const eleven = voiceLive || (!input.voice.enabled && input.eleven.subscriptionActive && m >= rollout.voiceStartMonth)
      ? voice.elevenSubscription
      : 0;
    const voiceVar = (voice.variableTotal - voice.fixedRetell) * rv + (voiceLive ? voice.fixedRetell : 0);
    const waVar = whatsapp.total * rw;
    const otherVar = (input.otherVariable.llmPer1kInteractions * (aiCalls * rv + whatsapp.aiConversations * rw)) / 1000
      + transcriptionFull * rv
      + (m >= storageStart ? input.otherVariable.storageMonthly : 0);
    const variable = voiceVar + waVar + otherVar;
    const opex = fixedM + semifixed + trainingRecurring + capexRecurring + eleven + variable;
    const investment = capexM + trainingInitial + oneOff;
    investmentByMonth.push(investment);
    const totalCost = investment + opex;

    const savings = value.avoidableSavingsMonthly * rb;
    const capacity = value.capacityMonetizedMonthly * rb;
    const contribution = value.contributionMonthly * rb;
    const benefits = savings + capacity + contribution;
    const net = benefits - totalCost;
    cumulative += net;

    // Contable: si se activa, la inversión se amortiza linealmente desde el mes siguiente.
    let amortization = 0;
    if (accountingActivate) {
      for (let k = 1; k < m; k++) {
        if (m - k <= amort) amortization += investmentByMonth[k - 1] / amort;
      }
    }
    const accountingExpense = opex + (accountingActivate ? amortization : investment);

    months.push({
      month: m, capex: capexM, trainingInitial, oneOff, fixed: fixedM, semifixed, trainingRecurring, capexRecurring,
      eleven, voice: voiceVar, whatsapp: waVar, otherVariable: otherVar, variable, opex, investment, totalCost,
      savings, capacity, contribution, benefits, net, cumulative, accountingExpense,
    });
  }

  const H = general.horizonMonths;
  const slice = (n: number) => months.slice(0, n);
  const sumOf = (rows: MonthRow[], k: keyof MonthRow) => sum(rows.map((r) => r[k] as number));

  // ───── Consolidador ─────
  const initialInvestment = capex.totalOneTime + training.initialCounted + fixed.oneOffTotal;
  const variableMonthly = voice.variableTotal + whatsapp.total + otherVariableMonthly;
  const fixedMonthly = fixed.fixedMonthly + voice.elevenSubscription;
  const semifixedMonthly = fixed.semifixedMonthly + training.recurringMonthly + capex.recurringMonthly;
  const opexMonthly = fixedMonthly + semifixedMonthly + variableMonthly;
  const y1 = slice(12);
  const cashYear1 = sumOf(y1, 'totalCost');
  const opexYear1 = sumOf(y1, 'opex');
  const cost3Years = sumOf(slice(36), 'totalCost');
  const costHorizon = sumOf(slice(H), 'totalCost');

  const consolidated: Consolidated = {
    initialInvestment,
    fixedMonthly,
    semifixedMonthly,
    variableMonthly,
    opexMonthly,
    opexAnnualSteady: opexMonthly * 12,
    opexYear1,
    costYear1: initialInvestment + opexMonthly * 12,
    cashYear1,
    cost3Years,
    costHorizon,
    costPerBranchYear1: safeDiv(initialInvestment + opexMonthly * 12, general.branches),
    costPerEmployeeYear1: safeDiv(initialInvestment + opexMonthly * 12, general.employees),
    costPerAICall: safeDiv(voice.variableTotal, aiCalls),
    costPerUsefulLead: safeDiv(opexMonthly, value.withAI.usefulLeads),
    costPerVisit: safeDiv(opexMonthly, value.withAI.visits),
    accountingYear1: sumOf(y1, 'accountingExpense'),
    opexByCategory: [
      { name: 'Fijos', value: fixed.fixedMonthly },
      { name: 'ElevenLabs (abono)', value: voice.elevenSubscription },
      { name: 'Semifijos', value: fixed.semifixedMonthly },
      { name: 'Capacitación recurrente', value: training.recurringMonthly },
      { name: 'Etapas recurrentes', value: capex.recurringMonthly },
      { name: 'Voz (Retell + telefonía)', value: voice.variableTotal },
      { name: 'WhatsApp', value: whatsapp.total },
      { name: 'LLM y almacenamiento', value: otherVariableMonthly },
    ].filter((c) => c.value > 0.004),
  };

  // ───── Finanzas ─────
  const horizonRows = slice(H);
  const benefitsHorizon = sumOf(horizonRows, 'benefits');
  const netFlows = horizonRows.map((r) => r.net);
  const benefitsYear1 = sumOf(y1, 'benefits');
  const nonCommercialHorizon = sumOf(horizonRows, 'savings') + sumOf(horizonRows, 'capacity');
  const finance: FinanceResult = {
    benefitsHorizon,
    costsHorizon: costHorizon,
    netHorizon: benefitsHorizon - costHorizon,
    roiHorizon: roi(benefitsHorizon, costHorizon),
    roiYear1: roi(benefitsYear1, cashYear1),
    benefitsYear1,
    netYear1: benefitsYear1 - cashYear1,
    netAnnualSteady: value.grossAnnual - consolidated.opexAnnualSteady,
    paybackMonth: paybackMonth(netFlows),
    npv: npv(general.discountRateAnnualPct, netFlows),
    irr: irrAnnual(netFlows),
    breakEven: breakEven(costHorizon, nonCommercialHorizon, value.margin, H),
    opsToCoverOpexMonthly: safeDiv(opexMonthly, value.margin),
    recovery: salesToRecover(consolidated.costYear1, value.margin, value.marginAfterTax, H),
  };

  const cultureIndex = {
    baseline: compositeIndex(input.culture.indicators, 'baseline'),
    target: compositeIndex(input.culture.indicators, 'target'),
    measured: compositeIndex(input.culture.indicators, 'measured'),
  };

  const decision = gateDecision(input.governance.criteria);
  const dataQuality = assessDataQuality(input, { capex, fixed, voice, whatsapp, training, drivers });
  const confirmedCost = sum(dataQuality.unconfirmed.map((u) => u.amount));
  dataQuality.confirmedShareYear1 = consolidated.costYear1 > 0 ? Math.max(0, 1 - confirmedCost / consolidated.costYear1) * 100 : null;

  const result: ScenarioResult = {
    input, capex, fixed, training, voice, whatsapp, otherVariableMonthly, value, adoption, cultureIndex,
    months, consolidated, finance, decision, dataQuality, explain: {},
  };
  result.explain = buildExplanations(result);
  return result;
}

const UNCONFIRMED: DataStatus[] = ['supuesto', 'demo', 'historico', 'presentacion'];

function assessDataQuality(
  input: ScenarioInput,
  ctx: { capex: CapexSummary; fixed: FixedSummary; voice: VoiceResult; whatsapp: WhatsAppResult; training: TrainingResult; drivers: { employees: number; branches: number } },
): DataQuality {
  const unconfirmed: DataQuality['unconfirmed'] = [];
  const counted = input.activities.filter((a) => input.training.includedInCapex || !a.isTraining);
  for (const a of counted) {
    const amount = a.hours * a.hourlyRate + a.externalCost;
    if (UNCONFIRMED.includes(a.status) && amount > 0 && a.month <= 12) {
      unconfirmed.push({ area: 'CapEx', item: a.name, status: a.status, amount: a.recurrence === 'unico' ? amount : amount * Math.max(0, 13 - a.month) });
    }
  }
  for (const l of input.fixedLines) {
    const line = ctx.fixed.byLine.find((b) => b.id === l.id);
    if (!line) continue;
    const amount = l.periodicity === 'unico' ? line.oneOff : line.monthly * Math.max(0, 13 - l.startMonth);
    if (UNCONFIRMED.includes(l.status) && amount > 0) unconfirmed.push({ area: 'Fijos/semifijos', item: l.concept, status: l.status, amount });
  }
  const plan = ctx.voice.plan;
  if (plan && UNCONFIRMED.includes(plan.status) && ctx.voice.elevenSubscription > 0) {
    unconfirmed.push({ area: 'ElevenLabs', item: `Plan ${plan.name}`, status: plan.status, amount: ctx.voice.elevenSubscription * 12 });
  }
  if (input.eleven.mode !== 'integrado') {
    unconfirmed.push({ area: 'Voz', item: 'Componente de voz incluido en la tarifa Retell', status: 'supuesto', amount: 0 });
  }
  for (const line of ctx.whatsapp.lines) {
    if (line.rate && UNCONFIRMED.includes(line.rate.status) && line.cost > 0) {
      unconfirmed.push({ area: 'WhatsApp', item: `Tarifa ${line.rate.country} · ${line.category}`, status: line.rate.status, amount: line.cost * 12 });
    }
  }
  return { unconfirmed, confirmedShareYear1: null };
}

function buildExplanations(r: ScenarioResult): Record<string, Explanation> {
  const { input, consolidated: c, finance: f, value: v, voice, training } = r;
  const H = input.general.horizonMonths;
  const opexInputs = [
    { label: 'Fijos (incluye abono ElevenLabs)', value: fmtUSD(c.fixedMonthly) },
    { label: 'Semifijos (incluye capacitación recurrente y etapas recurrentes)', value: fmtUSD(c.semifixedMonthly) },
    { label: 'Variables (voz + WhatsApp + LLM/almacenamiento)', value: fmtUSD(c.variableMonthly) },
  ];
  return {
    inversion: {
      label: 'Inversión inicial',
      value: c.initialInvestment,
      unit: 'usd',
      period: 'unico',
      formula: 'Σ actividades únicas (Horas × Tarifa + Externos) + capacitación inicial (si no está en CapEx) + desembolsos únicos',
      inputs: [
        { label: 'CapEx por etapas (únicos)', value: fmtUSD(r.capex.totalOneTime) },
        { label: 'Capacitación inicial contada aparte', value: training.includedInCapex ? 'Incluida en CapEx (no se suma de nuevo)' : fmtUSD(training.initialCounted) },
        { label: 'Desembolsos únicos de la tabla de costos', value: fmtUSD(r.fixed.oneOffTotal) },
      ],
      status: 'proyeccion',
    },
    opexMensual: {
      label: 'OpEx mensual en régimen',
      value: c.opexMonthly,
      unit: 'usd',
      period: 'mensual',
      formula: 'OpEx mensual = Fijos + Semifijos + Variables (con volumen pleno, después de la rampa)',
      inputs: opexInputs,
      status: 'proyeccion',
    },
    costoAnio1: {
      label: 'Costo total del primer año',
      value: c.costYear1,
      unit: 'usd',
      period: 'anual',
      formula: 'Costo año 1 = Inversión inicial + OpEx anual (fijos + semifijos + variables)',
      inputs: [
        { label: 'Inversión inicial', value: fmtUSD(c.initialInvestment) },
        { label: 'OpEx anual', value: fmtUSD(c.opexAnnualSteady) },
        { label: 'Desembolso de caja meses 1–12 (serie mensual)', value: fmtUSD(c.cashYear1) },
      ],
      status: 'proyeccion',
    },
    beneficioBruto: {
      label: 'Beneficio económico bruto anual (régimen)',
      value: v.grossAnnual,
      unit: 'usd',
      period: 'anual',
      formula: v.mode === 'presentacion'
        ? 'Cifras de la diapositiva 9: USD 18.000 (horas operativas) + USD 12.000 (leads fuera de horario). Beneficio BRUTO, antes de OpEx.'
        : v.mode === 'crecimiento'
          ? 'Ventas adicionales/año × contribución por venta. Ventas adicionales = ventas por sucursal/mes × sucursales × 12 × % crecimiento. Contribución = precio × comisión × (1 − costos variables).'
          : '12 × [Ahorro evitable + Capacidad monetizada + Contribución incremental] × factor de adopción',
      inputs: [
        { label: 'Ventas adicionales por año', value: fmtNum(v.extraOperations * 12) },
        { label: 'Contribución por venta (antes de impuestos)', value: fmtUSD(v.margin, false) },
        { label: 'Ahorro evitable mensual', value: fmtUSD(v.avoidableSavingsMonthly) },
        { label: 'Capacidad liberada monetizada mensual', value: fmtUSD(v.capacityMonetizedMonthly) },
        { label: 'Contribución incremental mensual', value: fmtUSD(v.contributionMonthly) },
        { label: 'Factor de adopción', value: fmtNum(v.adoptionFactor * 100) + '%' },
        { label: 'Clasificación', value: v.classificationNote },
      ],
      status: v.mode === 'presentacion' ? 'presentacion' : 'proyeccion',
    },
    beneficioNeto: {
      label: 'Beneficio neto anual (régimen)',
      value: f.netAnnualSteady,
      unit: 'usd',
      period: 'anual',
      formula: 'Beneficio neto = Beneficio bruto anual − OpEx anual en régimen (sin inversión inicial)',
      inputs: [
        { label: 'Beneficio bruto anual', value: fmtUSD(v.grossAnnual) },
        { label: 'OpEx anual en régimen', value: fmtUSD(c.opexAnnualSteady) },
      ],
      status: 'proyeccion',
    },
    roi: {
      label: `ROI acumulado (${H} meses)`,
      value: f.roiHorizon,
      unit: 'pct',
      period: 'horizonte',
      formula: 'ROI = (Beneficios acumulados − Costos acumulados) / Costos acumulados × 100',
      inputs: [
        { label: 'Beneficios acumulados', value: fmtUSD(f.benefitsHorizon) },
        { label: 'Costos acumulados (inversión + OpEx)', value: fmtUSD(f.costsHorizon) },
        { label: 'Horizonte', value: `${H} meses` },
      ],
      status: 'proyeccion',
    },
    payback: {
      label: 'Período de recuperación',
      value: f.paybackMonth,
      unit: 'meses',
      period: '',
      formula: 'Primer mes en que el flujo neto acumulado (beneficios − inversión − OpEx) vuelve a ser ≥ 0',
      inputs: [
        { label: 'Flujo acumulado al mes 12', value: fmtUSD(r.months[11].cumulative) },
        { label: `Flujo acumulado al mes ${H}`, value: fmtUSD(r.months[H - 1].cumulative) },
        { label: 'Arranque de beneficios', value: `mes ${input.rollout.benefitStartMonth}, rampa de ${input.rollout.benefitRampMonths} meses` },
      ],
      status: 'proyeccion',
    },
    van: {
      label: `VAN (${H} meses)`,
      value: f.npv,
      unit: 'usd',
      period: 'horizonte',
      formula: 'VAN = Σ Flujo neto_m / (1 + r_m)^m, con r_m = (1 + tasa anual)^(1/12) − 1',
      inputs: [{ label: 'Tasa de descuento anual', value: fmtPct(input.general.discountRateAnnualPct) }],
      status: 'proyeccion',
    },
    tir: {
      label: 'TIR anual equivalente',
      value: f.irr,
      unit: 'pct',
      period: 'anual',
      formula: 'Tasa mensual que hace VAN = 0 (bisección), anualizada: (1 + r_m)^12 − 1. n/d si los flujos no cambian de signo.',
      inputs: [{ label: 'Flujos considerados', value: `${H} meses` }],
      status: 'proyeccion',
    },
    llamadas: {
      label: 'Costo mensual de voz',
      value: voice.variableTotal,
      unit: 'usd',
      period: 'mensual',
      formula: 'Minutos IA = Entrantes × Duración × %IA + Salientes × Duración × %IA + reintentos; Costo = Minutos × tarifa efectiva + telefonía + cargos',
      inputs: [
        { label: 'Llamadas entrantes / salientes', value: `${fmtNum(voice.volumes.inbound)} / ${fmtNum(voice.volumes.outbound)}${voice.volumes.perBranch ? ' (modo por sucursal)' : ' (total organización)'}` },
        { label: 'Minutos IA', value: fmtNum(voice.totalAIMin) },
        { label: 'Tarifa Retell', value: `USD ${input.voice.retellPerMin}/min` },
        { label: 'Modo ElevenLabs', value: input.eleven.mode },
        { label: 'Excedente ElevenLabs', value: fmtUSD(voice.elevenOverage) },
      ],
      status: 'proyeccion',
    },
    adopcion: {
      label: 'Adopción cultural (índice compuesto)',
      value: r.cultureIndex.measured.value ?? r.cultureIndex.target.value,
      unit: 'num',
      period: '',
      formula: 'Índice = Σ (peso × puntaje 0–100) / Σ pesos. Los indicadores "menor es mejor" se invierten (100 − v).',
      inputs: [
        { label: 'Fuente', value: r.cultureIndex.measured.value !== null ? 'Medición' : `Objetivo proyectado (faltan ${r.cultureIndex.measured.missing.length} mediciones)` },
        { label: 'Línea base', value: fmtNum(r.cultureIndex.baseline.value) },
        { label: 'Uso activo usado en el modelo económico', value: `${fmtNum(r.adoption.value)}% (${r.adoption.source})` },
      ],
      status: r.cultureIndex.measured.value !== null ? 'real' : 'proyeccion',
    },
    costoPorLead: {
      label: 'Costo IA por lead útil',
      value: c.costPerUsefulLead,
      unit: 'usd',
      period: 'mensual',
      formula: 'OpEx mensual / leads útiles mensuales con IA',
      inputs: [
        { label: 'OpEx mensual', value: fmtUSD(c.opexMonthly) },
        { label: 'Leads útiles / mes', value: fmtNum(v.withAI.usefulLeads) },
      ],
      status: 'proyeccion',
    },
  };
}
