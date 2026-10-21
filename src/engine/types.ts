/**
 * Tipos del modelo INMO-IA.
 * El motor (src/engine) es puro: recibe un ScenarioInput y devuelve un ScenarioResult.
 * Ninguna función del motor usa números aleatorios ni depende de React.
 */

/** Estado de origen de un dato: se muestra como etiqueta en la UI. */
export type DataStatus =
  | 'confirmado' // tarifa/cotización aportada por el usuario (captura, factura)
  | 'presentacion' // cifra de la presentación INMO-IA: hipótesis original, no validada
  | 'supuesto' // hipótesis a validar
  | 'historico' // tarifa histórica: validar vigencia antes de usar
  | 'demo' // valor de demostración editable
  | 'proyeccion' // resultado proyectado por el modelo
  | 'real'; // resultado medido

export type Periodicity = 'unico' | 'mensual' | 'trimestral' | 'semestral' | 'anual';

/** Multiplicador de cantidad de una línea de costo. */
export type CostDriver = 'fijo' | 'por_empleado' | 'por_sucursal';

export type CostCategory = 'fijo' | 'semifijo';

// ───────────────────────── Bloque I: CapEx ─────────────────────────

export interface Stage {
  id: number;
  name: string;
  quarter: string;
  /** Etapas de las que depende (ids). */
  dependsOn: number[];
}

export interface CapexActivity {
  id: string;
  stageId: number;
  name: string;
  hours: number;
  hourlyRate: number;
  externalCost: number;
  owner: string;
  /** Mes de ejecución (1 = primer mes del proyecto). */
  month: number;
  /** 'unico' = inversión; 'recurrente' = se repite cada mes desde `month` (va a OpEx). */
  recurrence: 'unico' | 'recurrente';
  /** Marca la partida de formación inicial (para evitar doble conteo con el bloque de capacitación). */
  isTraining?: boolean;
  /** Subgrupo dentro de la etapa: se muestra con subtotal propio. */
  subgroup?: string;
  status: DataStatus;
}

// ───────────────────── Bloque II: fijos y semifijos ─────────────────────

export interface CostLine {
  id: string;
  concept: string;
  provider: string;
  quantity: number;
  unitPrice: number;
  periodicity: Periodicity;
  driver: CostDriver;
  category: CostCategory;
  /** Mes desde el que se paga (1..36). Para 'unico', mes del desembolso. */
  startMonth: number;
  status: DataStatus;
  note?: string;
}

export interface TrainingConfig {
  /** true = la formación inicial ya está presupuestada en CapEx (no se suma de nuevo). */
  includedInCapex: boolean;
  pctToTrain: number;
  hoursPerEmployee: number;
  instructorRate: number;
  sessionCapacity: number;
  materialsPerParticipant: number;
  feePerParticipant: number;
  opportunityCostPerHour: number;
  /** Suma el costo de oportunidad (horas de empleados) al costo económico. No es caja. */
  includeOpportunityCost: boolean;
  refresherSessionsPerYear: number;
  refresherHours: number;
  turnoverPctAnnual: number;
  trainNewHires: boolean;
  /** Mes de la formación inicial. */
  month: number;
}

// ───────────────────── Bloque III: variables ─────────────────────

export type CallMode = 'total' | 'por_sucursal';

export interface VoiceConfig {
  enabled: boolean;
  callMode: CallMode;
  inboundCalls: number;
  outboundCalls: number;
  inboundPerBranch: number;
  outboundPerBranch: number;
  inboundDurationMin: number;
  outboundDurationMin: number;
  aiHandledPct: number;
  humanTransferPct: number;
  /** % de llamadas salientes que no se concretan (no atiende, buzón). */
  failedPct: number;
  retriesPerFailed: number;
  /** Minutos facturados por intento fallido. */
  failedAttemptMin: number;
  retellPerMin: number;
  telephonyInboundPerMin: number;
  telephonyOutboundPerMin: number;
  perOutboundCallFee: number;
  connectionFeeMonthly: number;
  addonsMonthly: number;
}

export type ElevenMode = 'integrado' | 'independiente' | 'mixto';

export interface ElevenPlan {
  id: string;
  name: string;
  monthly: number;
  includedMinutes: number;
  overagePerMin: number;
  status: DataStatus;
}

export interface ElevenConfig {
  mode: ElevenMode;
  plans: ElevenPlan[];
  planId: string;
  /** Abono activo aunque la voz vaya integrada (p. ej. clonación de voces). */
  subscriptionActive: boolean;
  /** Modo mixto: % de minutos IA cuya voz se factura por ElevenLabs. */
  mixSharePct: number;
  /** Parte de la tarifa Retell que corresponde a la voz; se descuenta cuando la voz va por ElevenLabs. */
  retellVoiceComponentPerMin: number;
}

export type WaCategory = 'marketing' | 'utilidad' | 'autenticacion' | 'servicio';

export interface WaRate {
  country: string;
  category: WaCategory | '';
  pricePerMessage: number;
  effectiveDate: string | null;
  source: string;
  status: DataStatus;
}

export interface WhatsAppConfig {
  enabled: boolean;
  /** cloud_api = API oficial de Meta (cobro por mensaje); no_oficial = Evolution/Baileys sin cargos de Meta (riesgo de términos de uso). */
  channel: 'cloud_api' | 'no_oficial';
  country: string;
  rates: WaRate[];
  /** Mensajes enviados por categoría al mes. */
  volumes: Record<WaCategory, number>;
  /** % de plantillas de utilidad enviadas dentro de la ventana de servicio (no facturables). */
  utilityInWindowPct: number;
  providerFeePerMessage: number;
  /** Conversaciones entrantes de clientes al mes (consultas por WhatsApp). */
  inboundConversations: number;
  /** % de esas conversaciones que atiende la IA. */
  aiCoveragePct: number;
}

export interface OtherVariableConfig {
  llmPer1kInteractions: number;
  transcriptionPerMin: number;
  storageMonthly: number;
}

export interface RolloutConfig {
  whatsappStartMonth: number;
  voiceStartMonth: number;
  /** Meses hasta alcanzar el volumen pleno desde el arranque de cada canal. */
  rampMonths: number;
  benefitStartMonth: number;
  benefitRampMonths: number;
}

// ───────────────────── Valor económico ─────────────────────

export type CapacityTreatment = 'no_monetizar' | 'monetizar_productividad' | 'ya_en_ventas';

export interface ValueConfig {
  /**
   * 'crecimiento'  = ventas adicionales como % de crecimiento sobre las ventas actuales (informe AMBA).
   * 'modelo'       = ventas adicionales por embudo de consultas recuperadas.
   * 'presentacion' = cifras de la diapositiva 9.
   */
  benefitMode: 'crecimiento' | 'modelo' | 'presentacion';
  presentationSavingsAnnual: number;
  presentationOpportunitiesAnnual: number;

  /** Ventas actuales por sucursal y por mes (sin IA). */
  salesPerBranchMonthly: number;
  /** Crecimiento de ventas atribuible a la IA (% sobre las ventas actuales). */
  salesGrowthPct: number;
  averagePrice: number;
  commissionPct: number;
  /** Costos variables de la inmobiliaria sobre los ingresos (%). */
  variableCostPct: number;
  /** Impuesto a las ganancias supuesto (%). */
  taxRatePct: number;

  pctOffHours: number;
  pctLostOffHours: number;
  recoveryPct: number;
  usefulLeadPct: number;
  leadToVisitPct: number;
  visitToClosePct: number;

  /** Mejora relativa de visitas sobre la línea base por mejor calificación/agenda (no incluye leads recuperados). */
  visitUpliftPct: number;

  humanMinutesPerInquiry: number;
  laborCostPerHour: number;
  /** true = la empresa mantiene la plantilla: las horas liberadas son capacidad, no ahorro. */
  staffKept: boolean;
  avoidableCostsMonthly: number;
  capacityTreatment: CapacityTreatment;
  productiveUsePct: number;

  /** % del beneficio que depende de que el equipo use el sistema (hipótesis explícita). */
  adoptionDependencyPct: number;

  /** Alternativa humana para cubrir fuera de horario (solo comparación, no beneficio). */
  offHoursCoverageHoursMonthly: number;
  nightPremiumPct: number;

  hasBaseline: boolean;
  controlGroup: string;
}

// ───────────────────── Adopción, CX y psicosocial ─────────────────────

export interface CultureIndicator {
  id: string;
  label: string;
  baseline: number;
  target: number;
  measured: number | null;
  weight: number;
  /** true = un valor más bajo es mejor (resistencia, shadow AI, incidencias). */
  invert: boolean;
  description: string;
}

export interface CxIndicator {
  id: string;
  label: string;
  unit: string;
  baseline: number;
  target: number;
  measured: number | null;
  higherIsBetter: boolean;
}

export interface PsychoDimension {
  id: string;
  label: string;
  /** Escala 1–5 de encuesta. */
  before: number;
  after: number | null;
  note: string;
}

export interface CultureConfig {
  indicators: CultureIndicator[];
  branchAdoption: number[];
  adoptionAlertThreshold: number;
}

// ───────────────────── Gobernanza ─────────────────────

export type EvidenceLevel = 'sin_evidencia' | 'parcial' | 'verificada';

export interface Risk {
  id: string;
  name: string;
  likelihood: number;
  impact: number;
  controlDesigned: boolean;
  evidence: EvidenceLevel;
  control: string;
}

export interface GateCriterion {
  id: string;
  label: string;
  operator: '>=' | '<=';
  threshold: number;
  measured: number | null;
  unit: string;
  /** Si falla un criterio crítico la decisión es suspender. */
  critical: boolean;
}

export interface FundingGate {
  id: string;
  name: string;
  amount: number;
  /** Meses cubiertos por esta liberación de fondos. */
  fromMonth: number;
  toMonth: number;
  status: DataStatus;
}

export interface GovernanceConfig {
  risks: Risk[];
  criteria: GateCriterion[];
  fundingGates: FundingGate[];
}

// ───────────────────── Escenario ─────────────────────

export interface GeneralConfig {
  employees: number;
  branches: number;
  horizonMonths: number;
  discountRateAnnualPct: number;
  budgetLimitYear1: number;
  /** Activación contable de la inversión. */
  capexAccounting: 'activar' | 'gasto';
  amortizationMonths: number;
}

export interface ScenarioInput {
  id: string;
  name: string;
  description: string;
  general: GeneralConfig;
  stages: Stage[];
  activities: CapexActivity[];
  fixedLines: CostLine[];
  training: TrainingConfig;
  voice: VoiceConfig;
  eleven: ElevenConfig;
  whatsapp: WhatsAppConfig;
  otherVariable: OtherVariableConfig;
  rollout: RolloutConfig;
  value: ValueConfig;
  culture: CultureConfig;
  cx: CxIndicator[];
  psycho: PsychoDimension[];
  governance: GovernanceConfig;
}

/** Explicación de un KPI: valor, fórmula y valores de entrada. */
export interface Explanation {
  label: string;
  value: number | null;
  unit: 'usd' | 'pct' | 'num' | 'meses';
  period: 'mensual' | 'anual' | 'unico' | 'horizonte' | '';
  formula: string;
  inputs: { label: string; value: string }[];
  status: DataStatus;
}
