import type { ScenarioInput } from './types';
import { simulate, type ScenarioResult } from './simulate';

export type AlternativeId = 'actual' | 'parcial' | 'completa';

export const ALTERNATIVES: { id: AlternativeId; label: string; description: string }[] = [
  { id: 'actual', label: 'Sistema actual (sin IA)', description: 'Sin inversión ni OpEx incremental. Beneficio incremental = 0 por definición.' },
  { id: 'parcial', label: 'IA parcial (solo WhatsApp + CRM)', description: 'Sin agente de voz: se excluyen Retell, ElevenLabs y las partidas de voz del CapEx.' },
  { id: 'completa', label: 'IA completa (omnicanal)', description: 'Escenario seleccionado tal como está configurado.' },
];

/** Palabras que identifican partidas de CapEx exclusivas del canal de voz. */
const VOICE_KEYWORDS = ['retell', 'voz', 'telefónico', 'telefonico'];

export function applyAlternative(input: ScenarioInput, alt: AlternativeId): ScenarioInput {
  const s = structuredClone(input);
  if (alt === 'completa') return s;
  if (alt === 'parcial') {
    s.voice.enabled = false;
    s.eleven.subscriptionActive = false;
    s.activities = s.activities.filter((a) => !VOICE_KEYWORDS.some((k) => a.name.toLowerCase().includes(k)));
    return s;
  }
  // actual: nada de lo incremental
  s.voice.enabled = false;
  s.whatsapp.enabled = false;
  s.eleven.subscriptionActive = false;
  s.activities = [];
  s.fixedLines = [];
  s.training.includedInCapex = true; // sin partidas → sin formación
  s.training.refresherSessionsPerYear = 0;
  s.training.trainNewHires = false;
  s.otherVariable = { llmPer1kInteractions: 0, transcriptionPerMin: 0, storageMonthly: 0 };
  s.value.benefitMode = 'modelo';
  s.value.avoidableCostsMonthly = 0;
  s.value.visitUpliftPct = 0;
  return s;
}

export function compareAlternatives(input: ScenarioInput): { id: AlternativeId; label: string; result: ScenarioResult }[] {
  return ALTERNATIVES.map((a) => ({ id: a.id, label: a.label, result: simulate(applyAlternative(input, a.id)) }));
}
