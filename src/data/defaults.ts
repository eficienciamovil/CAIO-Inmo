/**
 * PARÁMETROS INICIALES EDITABLES — escenario Base.
 *
 * Cada valor lleva un estado (DataStatus):
 *  - 'confirmado'   → dato aportado por el usuario (capturas de Retell, Google One, ElevenLabs Starter).
 *  - 'presentacion' → cifra de la presentación INMO-IA (hipótesis original).
 *  - 'historico'    → tarifa 2025: validar vigencia antes de usarla.
 *  - 'supuesto' / 'demo' → hipótesis de demostración: reemplazar con cotizaciones reales.
 *
 * Para cambiar los valores de arranque del simulador, editar este archivo.
 * Durante la presentación, todo se edita desde la interfaz.
 */
import type { ScenarioInput } from '../engine/types';

const RATE = 30; // USD/h de desarrollo — demo

export const BASE_SCENARIO: ScenarioInput = {
  id: 'base',
  name: 'Base',
  description: 'Inversión inicial USD 25.000 + OpEx anual USD 22.000 = USD 47.000 en el año 1. Beneficio según el informe AMBA.',
  general: {
    employees: 50,
    branches: 10,
    horizonMonths: 24,
    discountRateAnnualPct: 12,
    budgetLimitYear1: 47000,
    capexAccounting: 'activar',
    amortizationMonths: 36,
  },
  stages: [
    { id: 1, name: 'Diagnóstico y diseño', quarter: 'T1 · Escuchar y Diagnosticar', dependsOn: [] },
    { id: 2, name: 'Desarrollo e integración', quarter: 'T1–T2 · Atender y Derivar', dependsOn: [1] },
    { id: 3, name: 'Piloto, capacitación y escalamiento', quarter: 'T3 · Integración y Escalamiento', dependsOn: [2] },
    { id: 4, name: 'Optimización y mantenimiento evolutivo', quarter: 'T4 · Actuar (posventa)', dependsOn: [3] },
  ],
  activities: [
    // Etapa 1 — USD 4.200
    { id: 'a1', stageId: 1, name: 'Levantamiento de procesos', hours: 24, hourlyRate: RATE, externalCost: 0, owner: 'CAIO', month: 1, recurrence: 'unico', status: 'demo' },
    { id: 'a2', stageId: 1, name: 'Identificación de necesidades y análisis de procesos actuales', hours: 20, hourlyRate: RATE, externalCost: 0, owner: 'CAIO', month: 1, recurrence: 'unico', status: 'demo' },
    { id: 'a3', stageId: 1, name: 'Línea base de indicadores (4 semanas)', hours: 30, hourlyRate: RATE, externalCost: 0, owner: 'Gerencia comercial', month: 2, recurrence: 'unico', status: 'demo' },
    { id: 'a4', stageId: 1, name: 'Arquitectura funcional', hours: 20, hourlyRate: RATE, externalCost: 0, owner: 'Eficiencia Móvil', month: 2, recurrence: 'unico', status: 'demo' },
    { id: 'a5', stageId: 1, name: 'Riesgos y gobernanza (RGPD, Ley 25.326, consentimiento de voz)', hours: 16, hourlyRate: RATE, externalCost: 300, owner: 'Legal / CAIO', month: 2, recurrence: 'unico', status: 'demo' },
    { id: 'a6', stageId: 1, name: 'Planificación del cambio organizacional', hours: 20, hourlyRate: RATE, externalCost: 0, owner: 'RR.HH. / CAIO', month: 3, recurrence: 'unico', status: 'demo' },
    // Etapa 2 — USD 10.600
    { id: 'b1', stageId: 2, name: 'Implementación de WhatsApp y Evolution API', hours: 40, hourlyRate: RATE, externalCost: 0, owner: 'Eficiencia Móvil', month: 2, recurrence: 'unico', status: 'demo' },
    { id: 'b2', stageId: 2, name: 'Migración a CRM central (fuente única de verdad)', hours: 50, hourlyRate: RATE, externalCost: 400, owner: 'Eficiencia Móvil', month: 2, recurrence: 'unico', status: 'demo' },
    { id: 'b3', stageId: 2, name: 'Integración de asistentes IA', hours: 50, hourlyRate: RATE, externalCost: 0, owner: 'Eficiencia Móvil', month: 4, recurrence: 'unico', status: 'demo' },
    { id: 'b4', stageId: 2, name: 'Agente telefónico Retell (voz clonada + aviso de IA)', hours: 50, hourlyRate: RATE, externalCost: 300, owner: 'Eficiencia Móvil', month: 4, recurrence: 'unico', status: 'demo' },
    { id: 'b5', stageId: 2, name: 'Integración con calendarios y agendamiento', hours: 30, hourlyRate: RATE, externalCost: 0, owner: 'Eficiencia Móvil', month: 5, recurrence: 'unico', status: 'demo' },
    { id: 'b6', stageId: 2, name: 'Base de conocimiento y RAG', hours: 50, hourlyRate: RATE, externalCost: 0, owner: 'Eficiencia Móvil', month: 5, recurrence: 'unico', status: 'demo' },
    { id: 'b7', stageId: 2, name: 'Pruebas funcionales y seguridad', hours: 40, hourlyRate: RATE, externalCost: 600, owner: 'Eficiencia Móvil / Auditor', month: 6, recurrence: 'unico', status: 'demo' },
    // Etapa 3 — USD 8.100 (subgrupo piloto: 2.400 · subgrupo capacitación y ajustes: 5.700)
    { id: 'c1', stageId: 3, name: 'Pruebas controladas (piloto)', hours: 30, hourlyRate: RATE, externalCost: 0, owner: 'CAIO', month: 6, recurrence: 'unico', subgroup: 'Piloto y despliegue', status: 'demo' },
    { id: 'c3', stageId: 3, name: 'Evaluación de aceptación', hours: 20, hourlyRate: RATE, externalCost: 0, owner: 'CAIO', month: 8, recurrence: 'unico', subgroup: 'Piloto y despliegue', status: 'demo' },
    { id: 'c5', stageId: 3, name: 'Despliegue progresivo por sucursal', hours: 30, hourlyRate: RATE, externalCost: 0, owner: 'Gerencia comercial', month: 9, recurrence: 'unico', subgroup: 'Piloto y despliegue', status: 'demo' },
    { id: 'c2', stageId: 3, name: 'Formación inicial del personal (50 comerciales)', hours: 60, hourlyRate: RATE, externalCost: 1500, owner: 'RR.HH. / Eficiencia Móvil', month: 7, recurrence: 'unico', isTraining: true, subgroup: 'Capacitación, ajustes y acompañamiento', status: 'demo' },
    { id: 'c4', stageId: 3, name: 'Ajustes y correcciones', hours: 40, hourlyRate: RATE, externalCost: 0, owner: 'Eficiencia Móvil', month: 8, recurrence: 'unico', subgroup: 'Capacitación, ajustes y acompañamiento', status: 'demo' },
    { id: 'c6', stageId: 3, name: 'Acompañamiento del cambio', hours: 40, hourlyRate: RATE, externalCost: 0, owner: 'RR.HH. / CAIO', month: 9, recurrence: 'unico', subgroup: 'Capacitación, ajustes y acompañamiento', status: 'demo' },
    // Etapa 4 — USD 2.100
    { id: 'd1', stageId: 4, name: 'Optimización de asistentes', hours: 20, hourlyRate: RATE, externalCost: 0, owner: 'Eficiencia Móvil', month: 10, recurrence: 'unico', status: 'demo' },
    { id: 'd2', stageId: 4, name: 'Automatización de posventa (flujo de mantenimiento)', hours: 30, hourlyRate: RATE, externalCost: 0, owner: 'Eficiencia Móvil', month: 11, recurrence: 'unico', status: 'demo' },
    { id: 'd3', stageId: 4, name: 'Mejoras del CRM', hours: 10, hourlyRate: RATE, externalCost: 0, owner: 'Eficiencia Móvil', month: 11, recurrence: 'unico', status: 'demo' },
    { id: 'd4', stageId: 4, name: 'Evaluación continua', hours: 10, hourlyRate: RATE, externalCost: 0, owner: 'CAIO', month: 12, recurrence: 'unico', status: 'demo' },
  ],
  fixedLines: [
    { id: 'f1', concept: 'Evolution API', provider: 'Evolution API', quantity: 1, unitPrice: 83, periodicity: 'mensual', driver: 'fijo', category: 'fijo', startMonth: 1, status: 'supuesto', note: 'Importe aportado (USD 83); periodicidad NO confirmada: cambiar a anual o único si corresponde.' },
    { id: 'f2', concept: 'Google One', provider: 'Google', quantity: 1, unitPrice: 10, periodicity: 'mensual', driver: 'fijo', category: 'fijo', startMonth: 1, status: 'confirmado' },
    { id: 'f3', concept: 'Hosting / VPS (n8n, base de conocimiento)', provider: 'A definir', quantity: 1, unitPrice: 30, periodicity: 'mensual', driver: 'fijo', category: 'fijo', startMonth: 1, status: 'demo' },
    { id: 'f4', concept: 'Base de datos y CRM (licencia por usuario)', provider: 'A definir (Airtable/CRM)', quantity: 1, unitPrice: 10, periodicity: 'mensual', driver: 'por_empleado', category: 'semifijo', startMonth: 1, status: 'demo' },
    { id: 'f5', concept: 'Plataforma de automatización', provider: 'n8n (autoalojado)', quantity: 1, unitPrice: 0, periodicity: 'mensual', driver: 'fijo', category: 'fijo', startMonth: 1, status: 'supuesto' },
    { id: 'f6', concept: 'Dominios', provider: 'A definir', quantity: 1, unitPrice: 15, periodicity: 'anual', driver: 'fijo', category: 'fijo', startMonth: 1, status: 'demo' },
    { id: 'f7', concept: 'Monitorización', provider: 'A definir', quantity: 1, unitPrice: 0, periodicity: 'mensual', driver: 'fijo', category: 'fijo', startMonth: 1, status: 'supuesto' },
    { id: 'f8', concept: 'Backups', provider: 'A definir', quantity: 1, unitPrice: 5, periodicity: 'mensual', driver: 'fijo', category: 'fijo', startMonth: 1, status: 'demo' },
    { id: 'f9', concept: 'Seguridad', provider: 'A definir', quantity: 1, unitPrice: 0, periodicity: 'mensual', driver: 'fijo', category: 'fijo', startMonth: 1, status: 'supuesto' },
    { id: 'f10', concept: 'Mantenimiento técnico mensual', provider: 'Eficiencia Móvil', quantity: 1, unitPrice: 400, periodicity: 'mensual', driver: 'fijo', category: 'semifijo', startMonth: 1, status: 'demo' },
    { id: 'f11', concept: 'Soporte a usuarios', provider: 'Interno', quantity: 1, unitPrice: 0, periodicity: 'mensual', driver: 'fijo', category: 'semifijo', startMonth: 1, status: 'supuesto' },
    { id: 'f12', concept: 'Auditoría de IA (ISO/IEC 42001)', provider: 'Auditor externo', quantity: 1, unitPrice: 1500, periodicity: 'anual', driver: 'fijo', category: 'semifijo', startMonth: 1, status: 'demo' },
    { id: 'f13', concept: 'Licencias por empleado (asistente interno)', provider: 'A definir', quantity: 1, unitPrice: 0, periodicity: 'mensual', driver: 'por_empleado', category: 'semifijo', startMonth: 1, status: 'supuesto' },
  ],
  training: {
    includedInCapex: true, // diap. 9: el CapEx de USD 25.000 incluye capacitación
    pctToTrain: 100,
    hoursPerEmployee: 8,
    instructorRate: 40,
    sessionCapacity: 15,
    materialsPerParticipant: 10,
    feePerParticipant: 0,
    opportunityCostPerHour: 12,
    includeOpportunityCost: false,
    refresherSessionsPerYear: 2,
    refresherHours: 2,
    turnoverPctAnnual: 20,
    trainNewHires: true,
    month: 7,
  },
  voice: {
    enabled: true,
    callMode: 'total',
    inboundCalls: 1500,
    outboundCalls: 250,
    inboundPerBranch: 150,
    outboundPerBranch: 25,
    inboundDurationMin: 3,
    outboundDurationMin: 2,
    aiHandledPct: 90,
    humanTransferPct: 20,
    failedPct: 20,
    retriesPerFailed: 1,
    failedAttemptMin: 0.5,
    retellPerMin: 0.118, // tarifa del panel Retell del usuario
    telephonyInboundPerMin: 0,
    telephonyOutboundPerMin: 0,
    perOutboundCallFee: 0,
    connectionFeeMonthly: 0,
    addonsMonthly: 0,
  },
  eleven: {
    mode: 'integrado',
    plans: [
      { id: 'free', name: 'Free', monthly: 0, includedMinutes: 15, overagePerMin: 0, status: 'supuesto' },
      { id: 'starter', name: 'Starter', monthly: 6, includedMinutes: 75, overagePerMin: 0.1, status: 'confirmado' },
      { id: 'creator', name: 'Creator', monthly: 22, includedMinutes: 250, overagePerMin: 0.1, status: 'supuesto' },
      { id: 'pro', name: 'Pro', monthly: 99, includedMinutes: 1100, overagePerMin: 0.09, status: 'supuesto' },
    ],
    planId: 'starter',
    subscriptionActive: true,
    mixSharePct: 50,
    retellVoiceComponentPerMin: 0.07,
  },
  whatsapp: {
    enabled: true,
    channel: 'cloud_api',
    country: 'Argentina',
    // Tarifas de referencia 2025 (USD por mensaje entregado, modelo por mensaje).
    // HISTÓRICAS: reemplazar por la tabla vigente o por la captura aportada antes de usarlas como confirmadas.
    rates: [
      ...(
        [
          ['Argentina', 0.0618, 0.026, 0.026],
          ['España', 0.0615, 0.02, 0.02],
          ['Colombia', 0.0125, 0.0008, 0.0008],
          ['México', 0.0305, 0.0085, 0.0085],
          ['Perú', 0.0703, 0.02, 0.02],
        ] as const
      ).flatMap(([country, mkt, util, auth]) => [
        { country, category: 'marketing' as const, pricePerMessage: mkt, effectiveDate: '2025-07-01', source: 'Tabla histórica 2025 (referencia) — validar en business.whatsapp.com', status: 'historico' as const },
        { country, category: 'utilidad' as const, pricePerMessage: util, effectiveDate: '2025-07-01', source: 'Tabla histórica 2025 (referencia) — validar en business.whatsapp.com', status: 'historico' as const },
        { country, category: 'autenticacion' as const, pricePerMessage: auth, effectiveDate: '2025-07-01', source: 'Tabla histórica 2025 (referencia) — validar en business.whatsapp.com', status: 'historico' as const },
        { country, category: 'servicio' as const, pricePerMessage: 0, effectiveDate: '2025-07-01', source: 'Mensajes de servicio dentro de la ventana de atención: sin cargo', status: 'historico' as const },
      ]),
    ],
    volumes: { marketing: 330, utilidad: 1500, autenticacion: 0, servicio: 3000 },
    utilityInWindowPct: 60,
    providerFeePerMessage: 0,
    inboundConversations: 500,
    aiCoveragePct: 90,
  },
  otherVariable: {
    llmPer1kInteractions: 5,
    transcriptionPerMin: 0,
    storageMonthly: 5,
  },
  rollout: {
    whatsappStartMonth: 1,
    voiceStartMonth: 1,
    rampMonths: 1,
    benefitStartMonth: 4, // arranque del piloto de voz (T2)
    benefitRampMonths: 1,
  },
  value: {
    benefitMode: 'crecimiento',
    presentationSavingsAnnual: 18000,
    presentationOpportunitiesAnnual: 12000,
    // Informe "Inmobiliaria AMBA": 3 ventas/sucursal/mes, USD 120.000 × 5% = USD 6.000; costos variables 25% → USD 4.500 por venta.
    salesPerBranchMonthly: 3,
    salesGrowthPct: 2.5,
    averagePrice: 120000,
    commissionPct: 5,
    variableCostPct: 25,
    taxRatePct: 35,
    pctOffHours: 35,
    pctLostOffHours: 60,
    recoveryPct: 70,
    usefulLeadPct: 30,
    leadToVisitPct: 35,
    visitToClosePct: 6,
    visitUpliftPct: 0,
    humanMinutesPerInquiry: 6,
    laborCostPerHour: 12,
    staffKept: true,
    avoidableCostsMonthly: 0,
    capacityTreatment: 'no_monetizar',
    productiveUsePct: 40,
    adoptionDependencyPct: 0,
    offHoursCoverageHoursMonthly: 510,
    nightPremiumPct: 30,
    hasBaseline: false,
    controlGroup: '',
  },
  culture: {
    adoptionAlertThreshold: 60,
    branchAdoption: [80, 75, 70, 65, 60, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70, 70],
    indicators: [
      { id: 'capacitados', label: 'Empleados capacitados', baseline: 0, target: 100, measured: null, weight: 1, invert: false, description: '% del personal que completó la formación inicial.' },
      { id: 'uso_activo', label: 'Uso activo del asistente', baseline: 0, target: 75, measured: null, weight: 2, invert: false, description: '% de empleados que usa el asistente al menos 3 días por semana. Alimenta el factor de adopción del modelo económico.' },
      { id: 'frecuencia', label: 'Frecuencia de uso', baseline: 0, target: 70, measured: null, weight: 1, invert: false, description: '% de días hábiles con uso registrado (promedio del equipo).' },
      { id: 'satisfaccion', label: 'Satisfacción del personal', baseline: 55, target: 75, measured: null, weight: 1, invert: false, description: 'Encuesta 0–100.' },
      { id: 'confianza', label: 'Confianza en respuestas de IA', baseline: 40, target: 75, measured: null, weight: 1.5, invert: false, description: 'Encuesta 0–100.' },
      { id: 'utilidad', label: 'Percepción de utilidad', baseline: 45, target: 80, measured: null, weight: 1, invert: false, description: 'Encuesta 0–100.' },
      { id: 'resistencia', label: 'Resistencia al cambio', baseline: 60, target: 30, measured: null, weight: 1, invert: true, description: 'Encuesta 0–100 (menor es mejor).' },
      { id: 'competencia', label: 'Competencia digital', baseline: 50, target: 70, measured: null, weight: 1, invert: false, description: 'Autoevaluación + prueba práctica 0–100.' },
      { id: 'participacion', label: 'Participación en el rediseño', baseline: 10, target: 60, measured: null, weight: 1, invert: false, description: '% del equipo que participó en reglas de asignación y pruebas de estrés (diap. 8).' },
      { id: 'incidencias', label: 'Incidencias reportadas', baseline: 20, target: 10, measured: null, weight: 0.5, invert: true, description: 'Índice 0–100 de incidencias por cada 100 usuarios (menor es mejor).' },
      { id: 'shadow_ai', label: 'Uso de canales no autorizados (Shadow AI)', baseline: 40, target: 10, measured: null, weight: 1, invert: true, description: '% del personal que usa herramientas de IA no autorizadas (menor es mejor).' },
    ],
  },
  cx: [
    { id: 'respuesta', label: 'Tiempo promedio de respuesta', unit: 'min', baseline: 45, target: 1, measured: null, higherIsBetter: false },
    { id: 'atendidas', label: 'Consultas atendidas', unit: '%', baseline: 79, target: 97, measured: null, higherIsBetter: true },
    { id: 'fuera_horario', label: 'Cobertura fuera del horario comercial', unit: '%', baseline: 0, target: 100, measured: null, higherIsBetter: true },
    { id: 'fcr', label: 'Resolución en primer contacto', unit: '%', baseline: 50, target: 70, measured: null, higherIsBetter: true },
    { id: 'transferencia', label: 'Transferencia a humano', unit: '%', baseline: 100, target: 20, measured: null, higherIsBetter: false },
    { id: 'csat', label: 'CSAT', unit: '/100', baseline: 70, target: 85, measured: null, higherIsBetter: true },
    { id: 'reclamos', label: 'Reclamaciones', unit: '/mes', baseline: 20, target: 12, measured: null, higherIsBetter: false },
    { id: 'calidad', label: 'Exactitud de la información', unit: '%', baseline: 85, target: 98, measured: null, higherIsBetter: true },
    { id: 'abandono', label: 'Tasa de abandono', unit: '%', baseline: 25, target: 8, measured: null, higherIsBetter: false },
    { id: 'leads', label: 'Leads útiles generados', unit: '/mes', baseline: 360, target: 420, measured: null, higherIsBetter: true },
    { id: 'visitas', label: 'Visitas agendadas', unit: '/mes', baseline: 126, target: 145, measured: null, higherIsBetter: true },
    { id: 'conversion', label: 'Conversión comercial (visita → operación)', unit: '%', baseline: 6, target: 6.5, measured: null, higherIsBetter: true },
  ],
  psycho: [
    { id: 'comunicacion', label: 'Comunicación', before: 3.0, after: null, note: '¿Se informa con claridad qué hace la IA y qué no?' },
    { id: 'aprendizaje', label: 'Aprendizaje', before: 2.8, after: null, note: '¿El equipo incorpora el asistente como fuente de formación continua?' },
    { id: 'cooperacion', label: 'Cooperación', before: 3.2, after: null, note: '¿La derivación IA → vendedor se vive como colaboración o como control?' },
    { id: 'roles', label: 'Roles', before: 2.6, after: null, note: '¿Está claro el rol del "vendedor aumentado" (diap. 8)?' },
    { id: 'pertenencia', label: 'Pertenencia', before: 3.4, after: null, note: '¿El equipo siente el proyecto como propio (participó en el diseño)?' },
    { id: 'resistencias', label: 'Gestión de resistencias', before: 2.5, after: null, note: 'Temor al reemplazo, uso de la voz propia por la IA, sobrecarga de aprendizaje.' },
  ],
  governance: {
    risks: [
      { id: 'r1', name: 'Privacidad y protección de datos (RGPD / Ley 25.326)', likelihood: 3, impact: 5, controlDesigned: true, evidence: 'sin_evidencia', control: 'Aviso de IA, anonimización de PII, retención bajo normativa local, validación legal.' },
      { id: 'r2', name: 'Control de accesos', likelihood: 3, impact: 4, controlDesigned: true, evidence: 'sin_evidencia', control: 'Roles asimétricos: la IA lee disponibilidad; sólo el gerente aprueba descuentos o condiciones.' },
      { id: 'r3', name: 'Fiabilidad de respuestas (alucinaciones)', likelihood: 4, impact: 4, controlDesigned: true, evidence: 'sin_evidencia', control: 'RAG sobre fuente única; si falta un dato o se pide negociar, escala al humano.' },
      { id: 'r4', name: 'Supervisión humana', likelihood: 2, impact: 4, controlDesigned: true, evidence: 'sin_evidencia', control: 'Derivación garantizada a pedido del cliente o con baja confianza.' },
      { id: 'r5', name: 'Incidentes graves', likelihood: 2, impact: 5, controlDesigned: false, evidence: 'sin_evidencia', control: 'Plan de respuesta a incidentes y desactivación inmediata (kill switch).' },
      { id: 'r6', name: 'Calidad de datos del CRM', likelihood: 4, impact: 4, controlDesigned: true, evidence: 'sin_evidencia', control: 'Migración a fuente única; umbral ≥ 90% de datos completos.' },
      { id: 'r7', name: 'Trazabilidad', likelihood: 3, impact: 3, controlDesigned: false, evidence: 'sin_evidencia', control: 'Registro de conversaciones, decisiones y derivaciones.' },
      { id: 'r8', name: 'Riesgo reputacional', likelihood: 3, impact: 4, controlDesigned: true, evidence: 'sin_evidencia', control: 'No sobrevender disponibilidad; precio sólo desde fuente vigente.' },
      { id: 'r9', name: 'Transparencia sobre la intervención de IA (AI Act)', likelihood: 2, impact: 4, controlDesigned: true, evidence: 'sin_evidencia', control: 'Aviso inicial: "Está hablando con un asistente virtual de IA".' },
      { id: 'r10', name: 'Aceptación de la tecnología por los trabajadores', likelihood: 3, impact: 4, controlDesigned: true, evidence: 'sin_evidencia', control: 'Participación en el diseño de reglas y pruebas de estrés.' },
      { id: 'r11', name: 'Consentimiento del personal para clonar su voz', likelihood: 3, impact: 4, controlDesigned: false, evidence: 'sin_evidencia', control: 'Consentimiento informado, revocable y por escrito; alternativa de voz sintética genérica.' },
      { id: 'r12', name: 'Shadow AI', likelihood: 3, impact: 3, controlDesigned: true, evidence: 'sin_evidencia', control: 'Auditoría continua de endpoints y política de uso aceptable.' },
    ],
    criteria: [
      { id: 'g1', label: 'Respuesta inicial', operator: '<=', threshold: 1, measured: null, unit: 'min', critical: false },
      { id: 'g2', label: 'Datos completos en CRM', operator: '>=', threshold: 90, measured: null, unit: '%', critical: false },
      { id: 'g3', label: 'Exactitud de información en pruebas', operator: '>=', threshold: 98, measured: null, unit: '%', critical: true },
      { id: 'g4', label: 'Visitas agendadas vs línea base', operator: '>=', threshold: 15, measured: null, unit: '% rel.', critical: false },
      { id: 'g5', label: 'Incidentes graves', operator: '<=', threshold: 0, measured: null, unit: 'casos', critical: true },
      { id: 'g6', label: 'Adopción del equipo (uso activo)', operator: '>=', threshold: 60, measured: null, unit: '%', critical: false },
      { id: 'g7', label: 'Satisfacción del cliente (CSAT)', operator: '>=', threshold: 80, measured: null, unit: '/100', critical: false },
      { id: 'g8', label: 'Beneficio medido vs proyectado', operator: '>=', threshold: 70, measured: null, unit: '%', critical: false },
    ],
    fundingGates: [
      { id: 'G1', name: 'Línea base y diseño', amount: 6000, fromMonth: 1, toMonth: 3, status: 'presentacion' },
      { id: 'G2', name: 'Piloto', amount: 12000, fromMonth: 4, toMonth: 6, status: 'presentacion' },
      { id: 'G3', name: 'Expansión', amount: 12000, fromMonth: 7, toMonth: 12, status: 'presentacion' },
    ],
  },
};

/** Resultados de piloto de demostración (para mostrar las puertas de decisión en vivo). */
export const PILOT_DEMOS: Record<string, { label: string; values: Record<string, number> }> = {
  exitoso: { label: 'Piloto exitoso (demo)', values: { g1: 0.8, g2: 93, g3: 98.6, g4: 17, g5: 0, g6: 68, g7: 84, g8: 82 } },
  corregir: { label: 'Piloto con desvíos (demo)', values: { g1: 0.9, g2: 84, g3: 98.2, g4: 9, g5: 0, g6: 52, g7: 81, g8: 61 } },
  suspender: { label: 'Piloto con incidente grave (demo)', values: { g1: 0.7, g2: 91, g3: 95.5, g4: 12, g5: 1, g6: 58, g7: 74, g8: 55 } },
};
