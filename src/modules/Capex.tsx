import { useStore } from '../state/store';
import { Button, Card, CellNumber, CellText, Grid, Kpi, Money, Note, PageHeader, Select, STATUS_OPTIONS, StatusBadge, Table, statusLabel, NumberField } from '../components/ui';
import { activityCost, dependencyIssues } from '../engine/capex';
import { fmtUSD } from '../engine/money';
import type { CapexActivity, DataStatus } from '../engine/types';
import { PRESENTACION } from '../data/referencia';

export default function Capex() {
  const { active, update, result: r } = useStore();
  const issues = dependencyIssues(active.stages, active.activities);
  const total = r.capex.totalOneTime;
  const diff = total - PRESENTACION.capex;

  const setAct = (id: string, patch: Partial<CapexActivity>) =>
    update((s) => {
      const a = s.activities.find((x) => x.id === id);
      if (a) Object.assign(a, patch);
    });

  const addAct = (stageId: number) =>
    update((s) => {
      const lastMonth = Math.max(1, ...s.activities.filter((a) => a.stageId === stageId).map((a) => a.month));
      s.activities.push({
        id: `act-${Date.now()}`,
        stageId,
        name: 'Nueva partida',
        hours: 0,
        hourlyRate: 30,
        externalCost: 0,
        owner: '',
        month: lastMonth,
        recurrence: 'unico',
        status: 'supuesto',
      });
    });

  return (
    <div className="space-y-6">
      <PageHeader kicker="Bloque I · CapEx" title="Inversión y desarrollo por etapas">
        Costo de actividad = <b className="text-gold-300">Horas × Tarifa horaria + Costos externos</b>. El desglose por actividad es de demostración y está calibrado
        para sumar los USD 25.000 de CapEx de la presentación (diap. 9), que incluyen setup, integración y capacitación. Las etapas siguen la hoja de ruta trimestral
        (diap. 7).
      </PageHeader>

      <Grid cols={4}>
        <Kpi label="Inversión de implementación" value={fmtUSD(total, false)} period="unico" explain={r.explain.inversion} />
        <Kpi label="Referencia presentación" value={fmtUSD(PRESENTACION.capex, false)} period="unico" status="presentacion" />
        <Kpi label="Diferencia vs presentación" value={fmtUSD(diff, false)} tone={Math.abs(diff) < 1 ? 'neutro' : diff > 0 ? 'perdida' : 'ganancia'} hint={Math.abs(diff) < 1 ? 'coincide' : diff > 0 ? 'por encima' : 'por debajo'} />
        <Kpi label="Partidas recurrentes de etapas" value={fmtUSD(r.capex.recurringMonthly, false)} period="mensual" hint="van a OpEx" />
      </Grid>

      {!active.training.includedInCapex && (
        <Note tone="warn">
          La capacitación inicial está configurada <b>fuera del CapEx</b> (Bloque II). Las partidas marcadas como "Formación" se excluyen de este total para no contarlas
          dos veces ({fmtUSD(r.capex.trainingInCapex)} excluidos).
        </Note>
      )}
      {issues.map((i) => (
        <Note key={i} tone="warn">{i}</Note>
      ))}

      <Card title="Tratamiento contable" subtitle="No cambia el flujo de caja: sólo el gasto contable (P&L).">
        <div className="grid gap-4 md:grid-cols-3">
          <Select
            label="Inversión"
            value={active.general.capexAccounting}
            onChange={(v) => update((s) => { s.general.capexAccounting = v; })}
            options={[{ value: 'activar', label: 'Activar y amortizar' }, { value: 'gasto', label: 'Gasto del período' }]}
          />
          <NumberField label="Meses de amortización" value={active.general.amortizationMonths} min={1} max={120} onChange={(v) => update((s) => { s.general.amortizationMonths = v; })} />
          <div className="text-sm text-zinc-400">
            Gasto contable año 1: <span className="font-semibold text-white">{fmtUSD(r.consolidated.accountingYear1, false)}</span>
            <br />
            Desembolso de caja año 1: <span className="font-semibold text-white">{fmtUSD(r.consolidated.costYear1, false)}</span>
          </div>
        </div>
      </Card>

      {active.stages.map((stage) => {
        const acts = active.activities.filter((a) => a.stageId === stage.id);
        const st = r.capex.stages.find((x) => x.stageId === stage.id)!;
        return (
          <Card
            key={stage.id}
            title={
              <span>
                <span className="text-gold-400">Etapa {stage.id}</span> · {stage.name}
              </span>
            }
            subtitle={
              <span className="flex flex-wrap items-center gap-3">
                <span>{stage.quarter}</span>
                <span className="flex items-center gap-1">
                  Depende de:
                  {active.stages.filter((o) => o.id < stage.id).map((o) => (
                    <label key={o.id} className="ml-1 flex items-center gap-1 text-xs">
                      <input
                        type="checkbox"
                        checked={stage.dependsOn.includes(o.id)}
                        onChange={(e) =>
                          update((s) => {
                            const t = s.stages.find((x) => x.id === stage.id)!;
                            t.dependsOn = e.target.checked ? [...t.dependsOn, o.id] : t.dependsOn.filter((d) => d !== o.id);
                          })
                        }
                      />
                      E{o.id}
                    </label>
                  ))}
                  {stage.id === 1 && <span className="text-xs">ninguna</span>}
                </span>
              </span>
            }
            actions={
              <>
                <span className="self-center text-sm text-zinc-400">
                  Total etapa: <span className="font-semibold text-gold-300">{fmtUSD(st.oneTime)}</span>
                </span>
                <span className="no-print"><Button onClick={() => addAct(stage.id)}>+ Partida</Button></span>
              </>
            }
          >
            <Table head={['Actividad', 'Horas', 'Tarifa/h', 'Externos', 'Costo', 'Responsable', 'Mes', 'Tipo', 'Formación', 'Estado', '']}>
              {withSubtotals(acts).map((item) => {
                if (item.kind === 'subtotal') {
                  return (
                    <tr key={`sub-${item.label}`} className={`bg-gold-500/5 ${item.last ? '' : 'border-b-2 border-gold-500/50'}`}>
                      <td className="px-2 py-2 text-sm font-semibold text-gold-300">Subtotal · {item.label}</td>
                      <td colSpan={3} />
                      <td className="whitespace-nowrap px-2 text-right font-semibold text-gold-300"><Money value={item.total} /></td>
                      <td colSpan={6} />
                    </tr>
                  );
                }
                const a = item.a;
                const excluded = a.isTraining && !active.training.includedInCapex;
                return (
                  <tr key={a.id} className={excluded ? 'opacity-40' : ''}>
                    <td className="min-w-[260px] px-1 py-1"><CellText value={a.name} onChange={(v) => setAct(a.id, { name: v })} /></td>
                    <td className="px-1"><CellNumber value={a.hours} onChange={(v) => setAct(a.id, { hours: v })} width="w-16" /></td>
                    <td className="px-1"><CellNumber value={a.hourlyRate} onChange={(v) => setAct(a.id, { hourlyRate: v })} width="w-16" /></td>
                    <td className="px-1"><CellNumber value={a.externalCost} onChange={(v) => setAct(a.id, { externalCost: v })} /></td>
                    <td className="whitespace-nowrap px-2 text-right font-medium text-white"><Money value={activityCost(a)} /></td>
                    <td className="min-w-[140px] px-1"><CellText value={a.owner} onChange={(v) => setAct(a.id, { owner: v })} /></td>
                    <td className="px-1"><CellNumber value={a.month} min={1} onChange={(v) => setAct(a.id, { month: Math.max(1, Math.min(36, Math.round(v))) })} width="w-12" /></td>
                    <td className="px-1">
                      <Select compact value={a.recurrence} onChange={(v) => setAct(a.id, { recurrence: v })} options={[{ value: 'unico', label: 'Único' }, { value: 'recurrente', label: 'Recurrente/mes' }]} />
                    </td>
                    <td className="px-2 text-center">
                      <input type="checkbox" checked={!!a.isTraining} onChange={(e) => setAct(a.id, { isTraining: e.target.checked })} title="Partida de formación inicial" />
                    </td>
                    <td className="px-1">
                      <span className="no-print">
                        <Select compact value={a.status} onChange={(v) => setAct(a.id, { status: v as DataStatus })} options={STATUS_OPTIONS.map((o) => ({ value: o, label: statusLabel(o) }))} />
                      </span>
                      <span className="print-only"><StatusBadge status={a.status} /></span>
                    </td>
                    <td className="px-1 no-print">
                      <button className="text-zinc-500 hover:text-red-400" title="Eliminar partida" onClick={() => update((s) => { s.activities = s.activities.filter((x) => x.id !== a.id); })}>✕</button>
                    </td>
                  </tr>
                );
              })}
            </Table>
          </Card>
        );
      })}
    </div>
  );
}

type Row = { kind: 'act'; a: CapexActivity } | { kind: 'subtotal'; label: string; total: number; last: boolean };

/** Si la etapa tiene subgrupos, intercala un subtotal después de cada uno (en el orden de las partidas). */
function withSubtotals(acts: CapexActivity[]): Row[] {
  const labels = Array.from(new Set(acts.map((a) => a.subgroup ?? '')));
  if (labels.length <= 1) return acts.map((a) => ({ kind: 'act', a }));
  const rows: Row[] = [];
  labels.forEach((label, i) => {
    const group = acts.filter((a) => (a.subgroup ?? '') === label);
    for (const a of group) rows.push({ kind: 'act', a });
    rows.push({ kind: 'subtotal', label: label || 'Otras partidas', total: group.reduce((t, a) => t + activityCost(a), 0), last: i === labels.length - 1 });
  });
  return rows;
}
