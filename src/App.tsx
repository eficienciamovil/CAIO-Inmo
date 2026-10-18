import { useEffect, useRef, useState } from 'react';
import { useStore, isScenario } from './state/store';
import { Button } from './components/ui';
import { exportCsv, exportPdf, exportScenarioJson } from './export/export';
import Dashboard from './modules/Dashboard';
import Capex from './modules/Capex';
import FixedCosts from './modules/FixedCosts';
import VariableCosts from './modules/VariableCosts';
import Consolidator from './modules/Consolidator';
import Value from './modules/Value';
import Culture from './modules/Culture';
import Scenarios from './modules/Scenarios';
import Governance from './modules/Governance';
import Methodology from './modules/Methodology';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', component: Dashboard },
  { id: 'capex', label: 'I · Inversión', component: Capex },
  { id: 'fijos', label: 'II · Fijos', component: FixedCosts },
  { id: 'variables', label: 'III · Variables', component: VariableCosts },
  { id: 'consolidado', label: 'Consolidador', component: Consolidator },
  { id: 'valor', label: 'Rentabilidad', component: Value },
  { id: 'cultura', label: 'Adopción y CX', component: Culture },
  { id: 'escenarios', label: 'Escenarios', component: Scenarios },
  { id: 'gobernanza', label: 'Gobernanza', component: Governance },
  { id: 'metodologia', label: 'Supuestos', component: Methodology },
] as const;

type TabId = (typeof TABS)[number]['id'];

const tabFromHash = (): TabId => {
  const h = window.location.hash.replace('#', '');
  return (TABS.find((t) => t.id === h)?.id ?? 'dashboard') as TabId;
};

export default function App() {
  const { scenarios, active, setActive, result, savedAt, importScenario, resetActive } = useStore();
  const [tab, setTab] = useState<TabId>(tabFromHash);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (id: TabId) => {
    window.location.hash = id;
    setTab(id);
    window.scrollTo({ top: 0 });
  };

  const Current = TABS.find((t) => t.id === tab)!.component;

  const onImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (!isScenario(data)) throw new Error('formato');
      importScenario(data);
    } catch {
      alert('El archivo no es un escenario válido del simulador INMO-IA.');
    }
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-ink-700 bg-ink-950/90 backdrop-blur no-print">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold-500/50 bg-gold-500/10 text-sm font-bold text-gold-300">IA</div>
            <div>
              <h1 className="text-sm font-semibold leading-tight text-white md:text-base">
                INMO-IA <span className="text-gold-400">|</span> Simulador de Inversión, Rentabilidad y Transformación
              </h1>
              <p className="text-[11px] text-zinc-500">Proyecto final CAIO · valores en USD · datos de demostración identificados</p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              Escenario
              <select
                value={active.id}
                onChange={(e) => setActive(e.target.value)}
                className="rounded-md border border-gold-500/50 bg-ink-900 px-2 py-1.5 text-sm font-medium text-gold-300 outline-none"
              >
                {scenarios.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <Button onClick={() => exportCsv(result)} title="Descargar resultados en CSV">CSV</Button>
            <Button onClick={exportPdf} title="Imprimir / Guardar como PDF">PDF</Button>
            <Button onClick={() => exportScenarioJson(active)} title="Exportar el escenario como JSON">Exportar</Button>
            <Button onClick={() => fileRef.current?.click()} title="Importar un escenario JSON">Importar</Button>
            <Button
              onClick={() => confirm(`¿Restablecer "${active.name}" a sus valores iniciales?`) && resetActive()}
              title="Restablecer valores del escenario activo"
            >
              Restablecer
            </Button>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
          </div>
        </div>
        <nav className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-4 md:px-6" aria-label="Módulos">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm transition ${tab === t.id ? 'border-gold-500 font-medium text-gold-300' : 'border-transparent text-zinc-400 hover:text-zinc-100'}`}
            >
              {t.label}
            </button>
          ))}
          <span className="ml-auto hidden items-center whitespace-nowrap pl-4 text-[11px] text-zinc-600 lg:flex">
            {savedAt ? `Guardado localmente ${new Date(savedAt).toLocaleTimeString('es-AR')}` : 'Sin guardar'}
          </span>
        </nav>
      </header>

      <div className="print-only px-2 pb-4">
        <h1 className="text-xl font-bold">INMO-IA | Simulador de Inversión, Rentabilidad y Transformación Organizacional</h1>
        <p className="text-sm">Escenario: {active.name} · {new Date().toLocaleString('es-AR')} · Valores en USD</p>
      </div>

      <main className="print-area mx-auto max-w-[1500px] px-4 py-6 md:px-6">
        <Current />
      </main>

      <footer className="mx-auto max-w-[1500px] px-4 pb-8 text-xs text-zinc-600 md:px-6 no-print">
        Modelo determinista sin datos aleatorios. Las cifras de la presentación se tratan como hipótesis originales; los valores "Demo" y "Supuesto" deben reemplazarse por cotizaciones reales.
      </footer>
    </div>
  );
}
