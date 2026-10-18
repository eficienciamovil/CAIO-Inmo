import type { ElevenConfig, ElevenPlan, VoiceConfig } from './types';
import { clamp, safeDiv } from './money';

export const CALL_LIMITS = { inbound: [1, 5000], outbound: [1, 1000] } as const;

export interface CallVolumes {
  inbound: number;
  outbound: number;
  /** true si los volúmenes se calcularon por sucursal. */
  perBranch: boolean;
}

/**
 * Las llamadas son totales mensuales de la organización.
 * Solo en modo 'por_sucursal' se multiplica por la cantidad de sucursales.
 * Empleados nunca multiplican llamadas.
 */
export function callVolumes(v: VoiceConfig, branches: number): CallVolumes {
  if (v.callMode === 'por_sucursal') {
    return {
      inbound: clamp(v.inboundPerBranch * branches, CALL_LIMITS.inbound[0], CALL_LIMITS.inbound[1]),
      outbound: clamp(v.outboundPerBranch * branches, CALL_LIMITS.outbound[0], CALL_LIMITS.outbound[1]),
      perBranch: true,
    };
  }
  return {
    inbound: clamp(v.inboundCalls, CALL_LIMITS.inbound[0], CALL_LIMITS.inbound[1]),
    outbound: clamp(v.outboundCalls, CALL_LIMITS.outbound[0], CALL_LIMITS.outbound[1]),
    perBranch: false,
  };
}

export interface VoiceResult {
  volumes: CallVolumes;
  aiInboundCalls: number;
  aiOutboundCalls: number;
  transferredCalls: number;
  inboundAIMin: number;
  outboundAIMin: number;
  retryMin: number;
  totalAIMin: number;
  /** Minutos cuya voz factura ElevenLabs por separado. */
  elevenMinutes: number;
  /** Minutos con voz integrada en la tarifa Retell. */
  integratedMinutes: number;
  retellUsage: number;
  telephony: number;
  outboundFees: number;
  fixedRetell: number;
  /** Costo Retell + telefonía + cargos (variable). */
  retellTotal: number;
  elevenSubscription: number;
  elevenOverage: number;
  /** Variable de voz total (sin abono ElevenLabs, que es fijo). */
  variableTotal: number;
  costPerInboundCall: number | null;
  costPerOutboundCall: number | null;
  costPerAICall: number | null;
  plan: ElevenPlan | undefined;
}

export const EMPTY_VOICE: Omit<VoiceResult, 'volumes' | 'plan'> = {
  aiInboundCalls: 0, aiOutboundCalls: 0, transferredCalls: 0, inboundAIMin: 0, outboundAIMin: 0, retryMin: 0,
  totalAIMin: 0, elevenMinutes: 0, integratedMinutes: 0, retellUsage: 0, telephony: 0, outboundFees: 0,
  fixedRetell: 0, retellTotal: 0, elevenSubscription: 0, elevenOverage: 0, variableTotal: 0,
  costPerInboundCall: null, costPerOutboundCall: null, costPerAICall: null,
};

/** Share (0–1) de minutos cuya voz se factura por ElevenLabs según el modo. */
export function elevenShare(e: ElevenConfig): number {
  if (e.mode === 'integrado') return 0;
  if (e.mode === 'independiente') return 1;
  return clamp(e.mixSharePct, 0, 100) / 100;
}

/**
 * Minutos IA:
 *   entrantes = llamadas entrantes × duración × %IA
 *   salientes = llamadas salientes × duración × %IA + reintentos de fallidas
 * Costo Retell = minutos integrados × tarifa + minutos con voz externa × (tarifa − componente de voz)
 *                + telefonía + cargos por llamada + cargos fijos.
 * ElevenLabs   = abono (fijo) + max(0, minutos con voz externa − minutos incluidos) × excedente.
 * Nunca se cobra la voz dos veces: el componente de voz de Retell se descuenta
 * cuando la voz la factura ElevenLabs.
 */
export function computeVoice(v: VoiceConfig, e: ElevenConfig, branches: number): VoiceResult {
  const volumes = callVolumes(v, branches);
  const plan = e.plans.find((p) => p.id === e.planId);
  const subscriptionApplies = e.mode !== 'integrado' || e.subscriptionActive;
  const elevenSubscription = subscriptionApplies && plan ? plan.monthly : 0;

  if (!v.enabled) {
    return { ...EMPTY_VOICE, volumes, plan, elevenSubscription: e.subscriptionActive && plan ? plan.monthly : 0 };
  }

  const ai = clamp(v.aiHandledPct, 0, 100) / 100;
  const aiInboundCalls = volumes.inbound * ai;
  const aiOutboundCalls = volumes.outbound * ai;
  const inboundAIMin = aiInboundCalls * Math.max(0, v.inboundDurationMin);
  const retryMin = aiOutboundCalls * (clamp(v.failedPct, 0, 100) / 100) * Math.max(0, v.retriesPerFailed) * Math.max(0, v.failedAttemptMin);
  const outboundAIMin = aiOutboundCalls * Math.max(0, v.outboundDurationMin) + retryMin;
  const totalAIMin = inboundAIMin + outboundAIMin;

  const share = elevenShare(e);
  const elevenMinutes = totalAIMin * share;
  const integratedMinutes = totalAIMin - elevenMinutes;
  const voiceComponent = Math.min(Math.max(0, e.retellVoiceComponentPerMin), v.retellPerMin);
  const retellUsage = integratedMinutes * v.retellPerMin + elevenMinutes * (v.retellPerMin - voiceComponent);

  const telephony = inboundAIMin * v.telephonyInboundPerMin + outboundAIMin * v.telephonyOutboundPerMin;
  const outboundFees = aiOutboundCalls * v.perOutboundCallFee;
  const fixedRetell = v.connectionFeeMonthly + v.addonsMonthly;
  const retellTotal = retellUsage + telephony + outboundFees + fixedRetell;

  const included = plan ? plan.includedMinutes : 0;
  const elevenOverage = share > 0 && plan ? Math.max(0, elevenMinutes - included) * plan.overagePerMin : 0;

  const variableTotal = retellTotal + elevenOverage;

  const perMinInbound = safeDiv(retellUsage + elevenOverage, totalAIMin) ?? 0;
  const costPerInboundCall = aiInboundCalls > 0 ? v.inboundDurationMin * (perMinInbound + v.telephonyInboundPerMin) : null;
  const costPerOutboundCall = aiOutboundCalls > 0
    ? (outboundAIMin / aiOutboundCalls) * (perMinInbound + v.telephonyOutboundPerMin) + v.perOutboundCallFee
    : null;

  return {
    volumes,
    aiInboundCalls,
    aiOutboundCalls,
    transferredCalls: (aiInboundCalls + aiOutboundCalls) * clamp(v.humanTransferPct, 0, 100) / 100,
    inboundAIMin,
    outboundAIMin,
    retryMin,
    totalAIMin,
    elevenMinutes,
    integratedMinutes,
    retellUsage,
    telephony,
    outboundFees,
    fixedRetell,
    retellTotal,
    elevenSubscription,
    elevenOverage,
    variableTotal,
    costPerInboundCall,
    costPerOutboundCall,
    costPerAICall: safeDiv(variableTotal, aiInboundCalls + aiOutboundCalls),
    plan,
  };
}
