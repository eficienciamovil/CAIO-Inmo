import type { ScenarioInput } from '../engine/types';
import { BASE_SCENARIO } from './defaults';

/**
 * Dos escenarios con los MISMOS costos (inversión inicial USD 25.000 + OpEx anual USD 22.000 = USD 47.000 en el año 1).
 * Sólo cambia el beneficio: el crecimiento de ventas atribuible a la IA sobre las 360 ventas anuales actuales.
 */
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
  'Meta práctica del informe AMBA: +2,5% de ventas (9 ventas adicionales por año × USD 4.500).',
  (s) => {
    s.value.salesGrowthPct = 2.5;
    setTarget(s, 'uso_activo', 60);
  },
);

export const OPTIMISTA = variant(
  'optimista',
  'Optimista',
  'Supuesto optimista: +5% de ventas (18 ventas adicionales por año × USD 4.500).',
  (s) => {
    s.value.salesGrowthPct = 5;
    setTarget(s, 'uso_activo', 85);
  },
);

export const DEFAULT_SCENARIOS: ScenarioInput[] = [CONSERVADOR, OPTIMISTA];
