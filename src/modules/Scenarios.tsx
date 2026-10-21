import { Fragment, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../state/store';
import { Button, Card, Money, PageHeader, Select, Table, NumberField } from '../components/ui';
import { AXIS, BENEFIT, ChartFrame, COST, GRID, Legend, SERIES, UsdTooltip, usdTick } from '../components/charts';
import { fmtNum, fmtPct, fmtUSD } from '../engine/money';
import { sensitivity, type SensitivityMetric } from '../engine/sensitivity';
import { ALTERNATIVES, compareAlternatives } from '../engine/alternatives';
import type { ScenarioResult } from '../engine/simulate';
import { exportComparisonCsv } from '../export/export';

const METRICS: { value: SensitivityMetric; label: string }[] = [
  { value: 'roi', label: 'ROI acumulado (%)' },
  { value: 'npv', label: 'VAN (USD)' },
  { value: 'netYear1', label: 'Resultado neto año 1 (USD)' },
];

export default function Scenarios() {
  const { scenarios, results, active, setActive, duplicateActive, deleteScenario, renameActive } = useStore();
  const [metric, setMetric] = useState<SensitivityMetric>('roi');
  const [delta, setDelta] = useState(20);
  const list = scenarios.map((s) => results[s.id]);
  const H = Math.max(...list.map((r) => r.input.general.horizonMonths));

  const tornado = useMemo(() => sensitivity(active, delta, metric), [active, delta, metric]);
  const alts = useMemo(() => compareAlternatives(active), [active]);
  const fmtMetric = (x: number | null) => (metric === 'roi' ? fmtPct(x) : fmtUSD(x, false));

  const cumData = Array.from({ length: H }, (_, i) => {
    const row: Record<string, number> = { mes: i + 1 };
    for (const r of list) row[r.input.name] = r.months[i].cumulative;
    return row;
  });

  type Metric = [string, (r: ScenarioResult) => string, ((r: ScenarioResult) => number | null)?];
  const year1Result = (r: ScenarioResult) => r.value.grossAnnual - r.consolidated.costYear1;
  const groups: { title: string; subtitle: string; rows: Metric[] }[] = [
    {
      title: 'Supuestos comunes',
      subtitle: 'Iguales en los dos escenarios salvo el crecimiento de ventas',
      rows: [
        ['Crecimiento de ventas por IA', (r) => fmtPct(r.input.value.salesGrowthPct)],
        ['Ventas adicionales por año', (r) => fmtNum(r.value.extraOperations * 12)],
        ['Contribución por venta (antes de impuestos)', (r) => fmtUSD(r.value.margin, false)],
        ['Beneficio bruto anual', (r) => fmtUSD(r.value.grossAnnual, false)],
      ],
    },
    {
      title: 'Con inversión inicial · primer año',
      subtitle: 'Beneficio bruto − (inversión inicial + OpEx anual)',
      rows: [
        ['Inversión inicial', (r) => fmtUSD(r.consolidated.initialInvestment, false)],
        ['OpEx anual', (r) => fmtUSD(r.consolidated.opexAnnualSteady, false)],
        ['Costo total año 1', (r) => fmtUSD(r.consolidated.costYear1, false)],
        ['Beneficio bruto año 1', (r) => fmtUSD(r.value.grossAnnual, false)],
        ['Resultado año 1', (r) => fmtUSD(year1Result(r), false), year1Result],
        ['ROI año 1', (r) => fmtPct(r.consolidated.costYear1 > 0 ? (year1Result(r) / r.consolidated.costYear1) * 100 : null), year1Result],
        ['Ventas para recuperar el año 1 (antes / después de impuestos)', (r) => `${r.finance.recovery.salesPreTax ?? 'n/d'} / ${r.finance.recovery.salesAfterTax ?? 'n/d'}`],
      ],
    },
    {
      title: 'Sin inversión inicial · operación anual (año 2 en adelante)',
      subtitle: 'Beneficio bruto − OpEx anual',
      rows: [
        ['OpEx anual', (r) => fmtUSD(r.consolidated.opexAnnualSteady, false)],
        ['Beneficio bruto anual', (r) => fmtUSD(r.value.grossAnnual, false)],
        ['Beneficio neto anual', (r) => fmtUSD(r.finance.netAnnualSteady, false), (r) => r.finance.netAnnualSteady],
        ['ROI operativo anual (neto / OpEx)', (r) => fmtPct(r.consolidated.opexAnnualSteady > 0 ? (r.finance.netAnnualSteady / r.consolidated.opexAnnualSteady) * 100 : null), (r) => r.finance.netAnnualSteady],
      ],
    },
    {
      title: `Acumulado ${H} meses · inversión + operación`,
      subtitle: 'Serie mensual completa: incluye la inversión y el OpEx de todos los meses',
      rows: [
        ['Recuperación de la inversión', (r) => (r.finance.paybackMonth === null ? 'no se recupera' : `${r.finance.paybackMonth} meses`)],
        ['Resultado acumulado', (r) => fmtUSD(r.finance.netHorizon, false), (r) => r.finance.netHorizon],
        ['ROI acumulado', (r) => fmtPct(r.finance.roiHorizon), (r) => r.finance.roiHorizon],
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader kicker="Escenarios" title="Comparación, sensibilidad y alternativas">
        Cada escenario guarda su propio juego completo de parámetros. Seleccioná uno en el encabezado para editarlo; los cambios se guardan automáticamente en este navegador.
      </PageHeader>

      <Card
        title="Escenarios guardados"
        actions={
          <span className="flex gap-2 no-print">
            <Button onClick={() => duplicateActive(prompt('Nombre del nuevo escenario', `${active.name} (copia)`) ?? '')}>Duplicar activo</Button>
            <Button onClick={() => { const n = prompt('Nuevo nombre', active.name); if (n) renameActive(n); }}>Renombrar activo</Button>
            <Button onClick={() => exportComparisonCsv(list)}>Exportar comparación CSV</Button>
          </span>
        }
      >
        <Table head={['Indicador', ...list.map((r) => r.input.name)]}>
          <tr>
            <td className="px-2 py-1.5 text-zinc-500">Escenario</td>
            {list.map((r) => (
              <td key={r.input.id} className="px-2 text-right">
                <span className="flex items-center justify-end gap-2 no-print">
                  {r.input.id === active.id ? (
                    <span className="text-xs font-semibold text-gold-300">● activo</span>
                  ) : (
                    <button className="text-xs text-gold-400 hover:underline" onClick={() => setActive(r.input.id)}>editar</button>
                  )}
                  {scenarios.length > 1 && (
                    <button className="text-xs text-zinc-500 hover:text-red-400" onClick={() => confirm(`¿Eliminar "${r.input.name}"?`) && deleteScenario(r.input.id)}>eliminar</button>
                  )}
                </span>
              </td>
            ))}
          </tr>
          {groups.map((g) => (
            <Fragment key={g.title}>
              <tr className="border-t-2 border-gold-500/40">
                <td colSpan={list.length + 1} className="px-2 pb-1 pt-4">
                  <p className="text-sm font-semibold text-gold-300">{g.title}</p>
                  <p className="text-xs text-zinc-500">{g.subtitle}</p>
                </td>
              </tr>
              {g.rows.map(([label, get, raw]) => (
                <tr key={`${g.title}-${label}`}>
                  <td className="px-2 py-1.5 text-zinc-300">{label}</td>
                  {list.map((r) => {
                    const v = raw?.(r);
                    return (
                      <td key={r.input.id} className={`whitespace-nowrap px-2 text-right tabular-nums ${v !== undefined && v !== null && v < -0.005 ? 'text-red-400' : 'text-zinc-100'}`}>
                        {get(r)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </Fragment>
          ))}
        </Table>
        <div className="mt-3 grid gap-2 text-xs text-zinc-500 md:grid-cols-3">
          {list.map((r) => (
            <p key={r.input.id}><b className="text-zinc-300">{r.input.name}:</b> {r.input.description}</p>
          ))}
        </div>
      </Card>

      <ChartFrame
        title="Flujo de caja acumulado por escenario"
        subtitle="USD acumulados; el cruce con 0 es el payback"
        height={300}
        legend={<Legend items={list.map((r, i) => ({ label: r.input.name, color: SERIES[i % SERIES.length] }))} />}
      >
        <LineChart data={cumData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="mes" {...AXIS} />
          <YAxis tickFormatter={usdTick} {...AXIS} width={60} />
          <ReferenceLine y={0} stroke="#71717a" />
          <Tooltip content={<UsdTooltip labelPrefix="Mes " />} />
          {list.map((r, i) => (
            <Line key={r.input.id} dataKey={r.input.name} stroke={SERIES[i % SERIES.length]} strokeWidth={r.input.id === active.id ? 3 : 2} dot={false} />
          ))}
        </LineChart>
      </ChartFrame>

      <Card title={`Análisis de sensibilidad · escenario ${active.name}`} subtitle="Cada variable se mueve ±X% manteniendo constantes las demás. Ordenado por impacto.">
        <div className="grid gap-x-6 md:grid-cols-3">
          <Select label="Indicador" value={metric} onChange={setMetric} options={METRICS} />
          <NumberField label="Variación" unit="±%" value={delta} min={5} max={50} step={5} slider onChange={setDelta} />
        </div>
        <Table head={['Variable', `−${delta}%`, 'Caso', `+${delta}%`, 'Amplitud']}>
          {tornado.map((t) => (
            <tr key={t.id}>
              <td className="px-2 py-1.5 text-zinc-200">{t.label}</td>
              <td className={`px-2 text-right tabular-nums ${(t.low ?? 0) < 0 ? 'text-red-400' : ''}`}>{fmtMetric(t.low)}</td>
              <td className="px-2 text-right tabular-nums text-zinc-400">{fmtMetric(t.base)}</td>
              <td className={`px-2 text-right tabular-nums ${(t.high ?? 0) < 0 ? 'text-red-400' : ''}`}>{fmtMetric(t.high)}</td>
              <td className="px-2 text-right tabular-nums">{metric === 'roi' ? `${fmtNum(t.swing)} pp` : fmtUSD(t.swing, false)}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <Card title="Alternativas de decisión" subtitle={`¿Por qué esta inversión y no otra? Comparación sobre ${active.general.horizonMonths} meses con los supuestos del escenario ${active.name}.`}>
        <div className="grid gap-6">
          <Table head={['Alternativa', 'Inversión', 'Costo horizonte', 'Beneficio horizonte', 'Neto', 'ROI']}>
            {alts.map((a) => (
              <tr key={a.id}>
                <td className="px-2 py-1.5">
                  <p className="font-medium text-zinc-100">{a.label}</p>
                  <p className="text-xs text-zinc-500">{ALTERNATIVES.find((x) => x.id === a.id)!.description}</p>
                </td>
                <td className="px-2 text-right"><Money value={a.result.consolidated.initialInvestment} decimals={false} /></td>
                <td className="px-2 text-right"><Money value={a.result.finance.costsHorizon} decimals={false} /></td>
                <td className="px-2 text-right"><Money value={a.result.finance.benefitsHorizon} decimals={false} /></td>
                <td className="px-2 text-right"><Money value={a.result.finance.netHorizon} decimals={false} signed /></td>
                <td className="px-2 text-right">{fmtPct(a.result.finance.roiHorizon)}</td>
              </tr>
            ))}
          </Table>
          <div className="h-64 max-w-3xl">
            <Legend items={[{ label: 'Costo', color: COST }, { label: 'Beneficio', color: BENEFIT }]} />
            <ChartBars data={alts.map((a) => ({ name: a.label.split(' (')[0], Costo: a.result.finance.costsHorizon, Beneficio: a.result.finance.benefitsHorizon }))} />
          </div>
        </div>
      </Card>
    </div>
  );
}

function ChartBars({ data }: { data: { name: string; Costo: number; Beneficio: number }[] }) {
  return (
    <div className="h-[220px] pt-2">
      <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="name" {...AXIS} />
        <YAxis tickFormatter={usdTick} {...AXIS} width={56} />
        <Tooltip cursor={{ fill: '#ffffff08' }} content={<UsdTooltip />} />
        <Bar dataKey="Costo" fill={COST} radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="Beneficio" fill={BENEFIT} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
