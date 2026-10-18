import type { ScenarioInput } from '../engine/types';
import { BASE_SCENARIO } from './defaults';

function variant(id: string, name: string, description: string, mutate: (s: ScenarioInput) => void): ScenarioInput {
  const s = structuredClone(BASE_SCENARIO);
  s.id = id;
  s.name = name;
  s.description = description;
  mutate(s);
  return s;
}

const setTarget = (s: ScenarioInput, id: string, target: number) => {
  const ind = s.culture.indicators.find((i) => i.id === id);
  if (ind) ind.target = target;
};

export const CONSERVADOR = variant(
  'conservador',
  'Conservador',
  'Menor automatización, recuperación y conversión; adopción del 50%; la capacidad liberada no se monetiza.',
  (s) => {
    s.voice.aiHandledPct = 75;
    s.whatsapp.aiCoveragePct = 75;
    s.value.recoveryPct = 50;
    s.value.usefulLeadPct = 25;
    s.value.visitToClosePct = 4;
    s.value.marginPerOperation = 1500;
    s.value.capacityTreatment = 'no_monetizar';
    setTarget(s, 'uso_activo', 50);
    s.rollout.benefitRampMonths = 9;
  },
);

export const BASE = variant('base', 'Base', BASE_SCENARIO.description, () => {});

export const OPTIMISTA = variant(
  'optimista',
  'Optimista',
  'Alta automatización y adopción (85%), mejor conversión y margen, mejora de visitas del 5% por mejor calificación.',
  (s) => {
    s.voice.aiHandledPct = 95;
    s.whatsapp.aiCoveragePct = 95;
    s.value.recoveryPct = 80;
    s.value.usefulLeadPct = 33;
    s.value.visitToClosePct = 7;
    s.value.marginPerOperation = 2200;
    s.value.visitUpliftPct = 5;
    s.value.productiveUsePct = 50;
    setTarget(s, 'uso_activo', 85);
    s.rollout.benefitRampMonths = 6;
  },
);

export const DEFAULT_SCENARIOS: ScenarioInput[] = [CONSERVADOR, BASE, OPTIMISTA];
