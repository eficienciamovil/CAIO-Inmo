import type { ValueConfig } from './types';
import { clamp, safeDiv } from './money';

export interface ValueDrivers {
  /** Llamadas entrantes totales de la organización (mes). */
  inboundCalls: number;
  /** % de llamadas atendidas por IA (0 si la voz está deshabilitada). */
  aiCallPct: number;
  /** Conversaciones entrantes por WhatsApp (mes). */
  waInbound: number;
  /** % de conversaciones de WhatsApp atendidas por IA (0 si el canal está deshabilitado). */
  waAiPct: number;
  /** % de interacciones IA derivadas a humanos. */
  transferPct: number;
  /** Adopción efectiva del equipo (0–100). */
  adoptionPct: number;
}

export interface FunnelSnapshot {
  inquiriesHandled: number;
  inquiriesLost: number;
  receptionHours: number;
  usefulLeads: number;
  visits: number;
  operations: number;
  contribution: number;
}

export interface ValueResult {
  inquiries: number;
  automatedInquiries: number;
  aiCoverageShare: number;
  offHoursInquiries: number;
  lostBaseline: number;
  recoveredInquiries: number;
  extraLeads: number;
  extraVisitsRecovered: number;
  extraVisitsUplift: number;
  extraOperations: number;
  freedHoursMonthly: number;
  freedHoursValueMonthly: number;
  /** 1. Ahorro de costos efectivamente evitables (mensual). */
  avoidableSavingsMonthly: number;
  /** 2. Capacidad operativa liberada monetizada (mensual). */
  capacityMonetizedMonthly: number;
  /** Capacidad liberada no monetizada (informativa, no suma). */
  capacityNotMonetizedMonthly: number;
  /** 3. Contribución incremental por nuevas operaciones (mensual). */
  contributionMonthly: number;
  adoptionFactor: number;
  /** 4. Beneficio económico bruto mensual en régimen (con factor de adopción). */
  grossMonthly: number;
  grossAnnual: number;
  baseline: FunnelSnapshot;
  withAI: FunnelSnapshot;
  /** Costo de cubrir fuera de horario con personas (alternativa, no beneficio). */
  humanOffHoursCostMonthly: number;
  mode: ValueConfig['benefitMode'];
  classificationNote: string;
}

/**
 * Factor de adopción: parte del beneficio que depende del uso real del equipo.
 *   factor = (1 − d) + d × adopción
 * con d = % de dependencia (hipótesis explícita y editable).
 */
export function adoptionFactor(dependencyPct: number, adoptionPct: number): number {
  const d = clamp(dependencyPct, 0, 100) / 100;
  const a = clamp(adoptionPct, 0, 100) / 100;
  return 1 - d + d * a;
}

export function computeValue(cfg: ValueConfig, d: ValueDrivers): ValueResult {
  const pct = (x: number) => clamp(x, 0, 100) / 100;
  const inquiries = Math.max(0, d.inboundCalls) + Math.max(0, d.waInbound);
  const automatedInquiries = d.inboundCalls * pct(d.aiCallPct) + d.waInbound * pct(d.waAiPct);
  const aiCoverageShare = safeDiv(automatedInquiries, inquiries) ?? 0;

  // Operación actual sin IA
  const offHoursInquiries = inquiries * pct(cfg.pctOffHours);
  const lostBaseline = offHoursInquiries * pct(cfg.pctLostOffHours);
  const handledBaseline = inquiries - lostBaseline;
  const leadsBase = handledBaseline * pct(cfg.usefulLeadPct);
  const visitsBase = leadsBase * pct(cfg.leadToVisitPct);
  const opsBase = visitsBase * pct(cfg.visitToClosePct);
  const receptionHoursBase = handledBaseline * Math.max(0, cfg.humanMinutesPerInquiry) / 60;

  // Con IA: se recuperan consultas fuera de horario en la proporción cubierta por IA
  const recoveredInquiries = lostBaseline * aiCoverageShare * pct(cfg.recoveryPct);
  const extraLeads = recoveredInquiries * pct(cfg.usefulLeadPct);
  const extraVisitsRecovered = extraLeads * pct(cfg.leadToVisitPct);
  const extraVisitsUplift = visitsBase * Math.max(0, cfg.visitUpliftPct) / 100;
  const extraOperations = (extraVisitsRecovered + extraVisitsUplift) * pct(cfg.visitToClosePct);

  // Horas liberadas: sólo consultas en horario que antes atendía una persona y que la IA resuelve sin derivar
  const businessShare = 1 - pct(cfg.pctOffHours);
  const freedHoursMonthly = automatedInquiries * businessShare * (1 - pct(d.transferPct)) * Math.max(0, cfg.humanMinutesPerInquiry) / 60;
  const freedHoursValueMonthly = freedHoursMonthly * Math.max(0, cfg.laborCostPerHour);

  const factor = adoptionFactor(cfg.adoptionDependencyPct, d.adoptionPct);

  let avoidable: number;
  let capacity: number;
  let capacityNot: number;
  let contribution: number;
  let gross: number;
  let note: string;

  if (cfg.benefitMode === 'presentacion') {
    // Cifras de la diapositiva 9 tal como fueron declaradas (hipótesis original, beneficio BRUTO).
    const savingsM = Math.max(0, cfg.presentationSavingsAnnual) / 12;
    const oppM = Math.max(0, cfg.presentationOpportunitiesAnnual) / 12;
    avoidable = cfg.staffKept ? 0 : savingsM;
    capacity = cfg.staffKept ? savingsM : 0;
    capacityNot = 0;
    contribution = oppM;
    gross = savingsM + oppM;
    note = cfg.staffKept
      ? 'Modo presentación: los USD 18.000 se muestran como declarados, pero con la plantilla constante son capacidad liberada, no ahorro de nómina.'
      : 'Modo presentación: cifras de la diapositiva 9 sin recalcular.';
  } else {
    avoidable = Math.max(0, cfg.avoidableCostsMonthly) + (cfg.staffKept ? 0 : freedHoursValueMonthly);
    if (!cfg.staffKept) {
      capacity = 0;
      capacityNot = 0;
    } else if (cfg.capacityTreatment === 'monetizar_productividad') {
      capacity = freedHoursValueMonthly * pct(cfg.productiveUsePct);
      capacityNot = freedHoursValueMonthly - capacity;
    } else {
      // 'no_monetizar' o 'ya_en_ventas' (el uso de esas horas ya está en la contribución incremental)
      capacity = 0;
      capacityNot = freedHoursValueMonthly;
    }
    contribution = extraOperations * Math.max(0, cfg.marginPerOperation);
    avoidable *= factor;
    capacity *= factor;
    contribution *= factor;
    gross = avoidable + capacity + contribution;
    note = cfg.staffKept
      ? 'Plantilla constante: las horas liberadas se clasifican como capacidad recuperada, no como ahorro de nómina.'
      : 'Reducción de estructura: las horas liberadas se valoran como costo evitable.';
  }

  const contributionBase = opsBase * Math.max(0, cfg.marginPerOperation);
  const baseline: FunnelSnapshot = {
    inquiriesHandled: handledBaseline,
    inquiriesLost: lostBaseline,
    receptionHours: receptionHoursBase,
    usefulLeads: leadsBase,
    visits: visitsBase,
    operations: opsBase,
    contribution: contributionBase,
  };
  const withAI: FunnelSnapshot = {
    inquiriesHandled: handledBaseline + recoveredInquiries,
    inquiriesLost: lostBaseline - recoveredInquiries,
    receptionHours: Math.max(0, receptionHoursBase - freedHoursMonthly),
    usefulLeads: leadsBase + extraLeads,
    visits: visitsBase + extraVisitsRecovered + extraVisitsUplift,
    operations: opsBase + extraOperations,
    contribution: contributionBase + extraOperations * Math.max(0, cfg.marginPerOperation),
  };

  return {
    inquiries,
    automatedInquiries,
    aiCoverageShare,
    offHoursInquiries,
    lostBaseline,
    recoveredInquiries,
    extraLeads,
    extraVisitsRecovered,
    extraVisitsUplift,
    extraOperations,
    freedHoursMonthly,
    freedHoursValueMonthly,
    avoidableSavingsMonthly: avoidable,
    capacityMonetizedMonthly: capacity,
    capacityNotMonetizedMonthly: capacityNot,
    contributionMonthly: contribution,
    adoptionFactor: cfg.benefitMode === 'presentacion' ? 1 : factor,
    grossMonthly: gross,
    grossAnnual: gross * 12,
    baseline,
    withAI,
    humanOffHoursCostMonthly: Math.max(0, cfg.offHoursCoverageHoursMonthly) * Math.max(0, cfg.laborCostPerHour) * (1 + Math.max(0, cfg.nightPremiumPct) / 100),
    mode: cfg.benefitMode,
    classificationNote: note,
  };
}
