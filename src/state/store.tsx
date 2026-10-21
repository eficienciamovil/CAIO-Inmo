import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { ScenarioInput } from '../engine/types';
import { simulate, type ScenarioResult } from '../engine/simulate';
import { DEFAULT_SCENARIOS } from '../data/scenarios';

const STORAGE_KEY = 'inmo-ia-simulador:v1';
const SCHEMA_VERSION = 2;

interface Persisted {
  version: number;
  scenarios: ScenarioInput[];
  activeId: string;
  savedAt: string;
}

interface Store {
  scenarios: ScenarioInput[];
  active: ScenarioInput;
  result: ScenarioResult;
  results: Record<string, ScenarioResult>;
  savedAt: string | null;
  setActive: (id: string) => void;
  /** Aplica una mutación sobre una copia del escenario activo. */
  update: (mutate: (s: ScenarioInput) => void) => void;
  resetActive: () => void;
  resetAll: () => void;
  duplicateActive: (name: string) => void;
  deleteScenario: (id: string) => void;
  renameActive: (name: string) => void;
  importScenario: (s: ScenarioInput) => void;
}

const Ctx = createContext<Store | null>(null);

function load(): Persisted | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Persisted;
    if (p.version !== SCHEMA_VERSION || !Array.isArray(p.scenarios) || p.scenarios.length === 0) return null;
    // Validación mínima: cada escenario debe poder simularse.
    p.scenarios.forEach((s) => simulate(s));
    return p;
  } catch {
    return null;
  }
}

/** Valida que un JSON importado tenga la forma de un escenario. */
export function isScenario(x: unknown): x is ScenarioInput {
  if (!x || typeof x !== 'object') return false;
  const s = x as Partial<ScenarioInput>;
  if (!s.general || !s.voice || !s.whatsapp || !s.value || !Array.isArray(s.activities) || !Array.isArray(s.fixedLines)) return false;
  try {
    simulate(s as ScenarioInput);
    return true;
  } catch {
    return false;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => load(), []);
  const [scenarios, setScenarios] = useState<ScenarioInput[]>(initial?.scenarios ?? structuredClone(DEFAULT_SCENARIOS));
  const [activeId, setActiveId] = useState<string>(initial?.activeId ?? 'conservador');
  const [savedAt, setSavedAt] = useState<string | null>(initial?.savedAt ?? null);

  useEffect(() => {
    const t = setTimeout(() => {
      const now = new Date().toISOString();
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: SCHEMA_VERSION, scenarios, activeId, savedAt: now } satisfies Persisted));
        setSavedAt(now);
      } catch {
        // almacenamiento no disponible: la app sigue funcionando en memoria
      }
    }, 300);
    return () => clearTimeout(t);
  }, [scenarios, activeId]);

  const active = scenarios.find((s) => s.id === activeId) ?? scenarios[0];

  const results = useMemo(() => Object.fromEntries(scenarios.map((s) => [s.id, simulate(s)])), [scenarios]);

  const update = useCallback((mutate: (s: ScenarioInput) => void) => {
    setScenarios((prev) =>
      prev.map((s) => {
        if (s.id !== active.id) return s;
        const copy = structuredClone(s);
        mutate(copy);
        return copy;
      }),
    );
  }, [active.id]);

  const store: Store = {
    scenarios,
    active,
    result: results[active.id],
    results,
    savedAt,
    setActive: setActiveId,
    update,
    resetActive: () => {
      const original = DEFAULT_SCENARIOS.find((d) => d.id === active.id);
      if (!original) return;
      setScenarios((prev) => prev.map((s) => (s.id === active.id ? structuredClone(original) : s)));
    },
    resetAll: () => {
      setScenarios(structuredClone(DEFAULT_SCENARIOS));
      setActiveId('conservador');
    },
    duplicateActive: (name) => {
      const copy = structuredClone(active);
      copy.id = `esc-${Date.now()}`;
      copy.name = name || `${active.name} (copia)`;
      setScenarios((prev) => [...prev, copy]);
      setActiveId(copy.id);
    },
    deleteScenario: (id) => {
      if (scenarios.length <= 1) return;
      setScenarios((prev) => prev.filter((s) => s.id !== id));
      if (id === activeId) setActiveId(scenarios.find((s) => s.id !== id)!.id);
    },
    renameActive: (name) => update((s) => { s.name = name; }),
    importScenario: (s) => {
      const copy = structuredClone(s);
      copy.id = `imp-${Date.now()}`;
      setScenarios((prev) => [...prev, copy]);
      setActiveId(copy.id);
    },
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore fuera de StoreProvider');
  return s;
}
