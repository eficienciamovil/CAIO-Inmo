import { useStore } from '../state/store';
import { Card, NumberField } from './ui';
import { LIMITS } from '../engine/simulate';

/** Controles principales para modificar en vivo durante la presentación. */
export default function QuickControls() {
  const { active, update } = useStore();
  const adoption = active.culture.indicators.find((i) => i.id === 'uso_activo');
  const perBranch = active.voice.callMode === 'por_sucursal';

  return (
    <Card
      title="Simulación en vivo"
      subtitle={
        <>
          Los cambios recalculan todo el modelo al instante y se guardan en este navegador. Llamadas:{' '}
          <b className="text-gold-300">{perBranch ? 'modo por sucursal' : 'total de la organización'}</b>.
        </>
      }
      className="no-print"
    >
      <div className="grid gap-x-6 md:grid-cols-2 xl:grid-cols-4">
        <NumberField label="Empleados" value={active.general.employees} min={LIMITS.employees[0]} max={LIMITS.employees[1]} slider onChange={(v) => update((s) => { s.general.employees = v; })} />
        <NumberField label="Sucursales" value={active.general.branches} min={LIMITS.branches[0]} max={LIMITS.branches[1]} slider onChange={(v) => update((s) => { s.general.branches = v; })} />
        {perBranch ? (
          <>
            <NumberField label="Entrantes por sucursal/mes" value={active.voice.inboundPerBranch} min={0} max={1000} slider onChange={(v) => update((s) => { s.voice.inboundPerBranch = v; })} />
            <NumberField label="Salientes por sucursal/mes" value={active.voice.outboundPerBranch} min={0} max={500} slider onChange={(v) => update((s) => { s.voice.outboundPerBranch = v; })} />
          </>
        ) : (
          <>
            <NumberField label="Llamadas entrantes/mes" value={active.voice.inboundCalls} min={LIMITS.inboundCalls[0]} max={LIMITS.inboundCalls[1]} step={10} slider onChange={(v) => update((s) => { s.voice.inboundCalls = v; })} />
            <NumberField label="Llamadas salientes/mes" value={active.voice.outboundCalls} min={LIMITS.outboundCalls[0]} max={LIMITS.outboundCalls[1]} step={5} slider onChange={(v) => update((s) => { s.voice.outboundCalls = v; })} />
          </>
        )}
        <NumberField label="Llamadas gestionadas por IA" unit="%" value={active.voice.aiHandledPct} min={0} max={100} slider onChange={(v) => update((s) => { s.voice.aiHandledPct = v; })} />
        <NumberField label="Retell · USD/min" value={active.voice.retellPerMin} min={0} max={1} step={0.001} slider onChange={(v) => update((s) => { s.voice.retellPerMin = v; })} />
        {adoption && (
          <NumberField
            label="Adopción (uso activo objetivo)"
            unit="%"
            value={adoption.target}
            min={0}
            max={100}
            slider
            onChange={(v) => update((s) => { s.culture.indicators.find((i) => i.id === 'uso_activo')!.target = v; })}
          />
        )}
        <NumberField label="Crecimiento de ventas por IA" unit="%" value={active.value.salesGrowthPct} min={0} max={20} step={0.5} slider hint={`${(active.value.salesPerBranchMonthly * active.general.branches * 12 * active.value.salesGrowthPct / 100).toLocaleString('es-AR', { maximumFractionDigits: 1 })} ventas adicionales/año`} onChange={(v) => update((s) => { s.value.salesGrowthPct = v; })} />
      </div>
    </Card>
  );
}
