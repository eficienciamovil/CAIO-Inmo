import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../state/store';
import { Card, Grid, Kpi, Money, Note, NumberField, PageHeader, Select, Table } from '../components/ui';
import { AXIS, ChartFrame, GOLD, GRID, Legend, SERIES, UsdTooltip, usdTick } from '../components/charts';
import { fmtUSD, sum } from '../engine/money';

export default function Consolidator() {
  const { active, update, result: r } = useStore();
  const c = r.consolidated;
  const [showAll, setShowAll] = useState(false);
  const H = active.general.horizonMonths;
  const rows = r.months.slice(0, showAll ? 36 : 12);

  const chartData = r.months.slice(0, H).map((m) => ({
    mes: m.month,
    Inversión: m.investment,
    Fijos: m.fixed + m.eleven,
    Semifijos: m.semifixed + m.trainingRecurring + m.capexRecurring,
    Variables: m.variable,
  }));
  const colors = { Inversión: GOLD, Fijos: SERIES[0], Semifijos: SERIES[6], Variables: SERIES[1] };

  const funding = active.governance.fundingGates.map((g) => {
    const spent = sum(r.months.filter((m) => m.month >= g.fromMonth && m.month <= g.toMonth).map((m) => m.totalCost));
    return { ...g, spent, gap: g.amount - spent };
  });

  return (
    <div className="space-y-6">
      <PageHeader kicker="Consolidador financiero" title="Costo total, flujo de caja y tratamiento contable">
        OpEx mensual = Fijos + Semifijos + Variables. El costo del año 1 se obtiene sumando los 12 meses de la serie (inversión + OpEx con fechas y rampa), no
        multiplicando el OpEx mensual por 12.
      </PageHeader>

      <Grid cols={4}>
        <Kpi label="Inversión inicial" value={fmtUSD(c.initialInvestment, false)} period="unico" explain={r.explain.inversion} />
        <Kpi label="Fijos" value={fmtUSD(c.fixedMonthly)} period="mensual" />
        <Kpi label="Semifijos" value={fmtUSD(c.semifixedMonthly)} period="mensual" />
        <Kpi label="Variables" value={fmtUSD(c.variableMonthly)} period="mensual" />
        <Kpi label="OpEx total" value={fmtUSD(c.opexMonthly)} period="mensual" explain={r.explain.opexMensual} />
        <Kpi label="OpEx anual (régimen)" value={fmtUSD(c.opexAnnualSteady, false)} period="anual" />
        <Kpi label="Costo total año 1" value={fmtUSD(c.costYear1, false)} period="anual" explain={r.explain.costoAnio1} />
        <Kpi label="Costo total 3 años (TCO)" value={fmtUSD(c.cost3Years, false)} period="horizonte" />
        <Kpi label="Costo por sucursal (año 1)" value={fmtUSD(c.costPerBranchYear1, false)} period="anual" />
        <Kpi label="Costo por empleado (año 1)" value={fmtUSD(c.costPerEmployeeYear1, false)} period="anual" />
        <Kpi label="Costo por llamada atendida" value={fmtUSD(c.costPerAICall)} hint="voz variable / llamadas IA" />
        <Kpi label="Costo por lead útil" value={fmtUSD(c.costPerUsefulLead)} explain={r.explain.costoPorLead} />
        <Kpi label="Costo por visita concretada" value={fmtUSD(c.costPerVisit)} hint="OpEx mensual / visitas con IA" />
        <Kpi label="Gasto contable año 1" value={fmtUSD(c.accountingYear1, false)} period="anual" hint={active.general.capexAccounting === 'activar' ? `amortización ${active.general.amortizationMonths} meses` : 'inversión como gasto'} />
      </Grid>

      <Card title="Tres lecturas del mismo proyecto">
        <div className="grid gap-4 text-sm md:grid-cols-3">
          <div className="rounded-lg border border-ink-700 p-4">
            <p className="font-semibold text-gold-300">Flujo de caja</p>
            <p className="mt-1 text-zinc-400">Cuándo sale el dinero. Inversión en el mes de cada partida; OpEx a medida que arrancan los canales.</p>
            <p className="mt-3 text-lg font-semibold text-white">{fmtUSD(c.costYear1)} <span className="text-xs text-zinc-500">año 1</span></p>
          </div>
          <div className="rounded-lg border border-ink-700 p-4">
            <p className="font-semibold text-gold-300">TCO (costo total de propiedad)</p>
            <p className="mt-1 text-zinc-400">Todo lo que cuesta tener y operar la solución en el horizonte, sin descontar.</p>
            <p className="mt-3 text-lg font-semibold text-white">{fmtUSD(c.costHorizon)} <span className="text-xs text-zinc-500">{H} meses</span></p>
          </div>
          <div className="rounded-lg border border-ink-700 p-4">
            <p className="font-semibold text-gold-300">Tratamiento contable</p>
            <p className="mt-1 text-zinc-400">Gasto en el P&L: OpEx + amortización (si la inversión se activa), según la política contable.</p>
            <p className="mt-3 text-lg font-semibold text-white">{fmtUSD(c.accountingYear1)} <span className="text-xs text-zinc-500">año 1</span></p>
          </div>
        </div>
        <div className="mt-4 grid gap-x-6 md:grid-cols-3">
          <Select
            label="Horizonte de evaluación"
            value={String(H)}
            onChange={(v) => update((s) => { s.general.horizonMonths = Number(v); })}
            options={[{ value: '12', label: '12 meses' }, { value: '24', label: '24 meses' }, { value: '36', label: '36 meses' }]}
          />
          <NumberField label="Límite de presupuesto año 1" unit="USD" value={active.general.budgetLimitYear1} min={0} max={1000000} step={500} onChange={(v) => update((s) => { s.general.budgetLimitYear1 = v; })} />
          <NumberField label="Tasa de descuento anual (VAN)" unit="%" value={active.general.discountRateAnnualPct} min={0} max={100} step={0.5} onChange={(v) => update((s) => { s.general.discountRateAnnualPct = v; })} />
        </div>
      </Card>

      <ChartFrame
        title="Costos mensuales por categoría"
        subtitle={`Meses 1–${H} (USD)`}
        height={280}
        legend={<Legend items={Object.entries(colors).map(([label, color]) => ({ label, color }))} />}
      >
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="mes" {...AXIS} />
          <YAxis tickFormatter={usdTick} {...AXIS} width={56} />
          <Tooltip cursor={{ fill: '#ffffff08' }} content={<UsdTooltip labelPrefix="Mes " />} />
          {Object.entries(colors).map(([k, col], i, arr) => (
            <Bar key={k} dataKey={k} stackId="a" fill={col} radius={i === arr.length - 1 ? [4, 4, 0, 0] : 0} />
          ))}
        </BarChart>
      </ChartFrame>

      <Card title="Fondos por gate vs desembolso del período" subtitle="Votación de directorio (diap. 10): USD 6.000 + 12.000 + 12.000. Las brechas deben cubrirse con aprobaciones adicionales.">
        <Table head={['Gate', 'Destino', 'Meses', 'Fondos liberados', 'Desembolso modelo', 'Diferencia']}>
          {funding.map((g) => (
            <tr key={g.id}>
              <td className="px-2 py-1.5 font-semibold text-gold-300">{g.id}</td>
              <td className="px-2">{g.name}</td>
              <td className="px-2">{g.fromMonth}–{g.toMonth}</td>
              <td className="px-2 text-right"><Money value={g.amount} decimals={false} /></td>
              <td className="px-2 text-right"><Money value={g.spent} decimals={false} /></td>
              <td className="px-2 text-right"><Money value={g.gap} decimals={false} signed /></td>
            </tr>
          ))}
        </Table>
        {funding.some((g) => g.gap < 0) && (
          <div className="mt-3">
            <Note tone="warn">Al menos un tramo no cubre el desembolso proyectado: hay que distinguir presupuesto total, fondos solicitados inicialmente y desembolsos sujetos a aprobación.</Note>
          </div>
        )}
      </Card>

      <Card
        title="Serie mensual"
        actions={<button className="text-sm text-gold-400 hover:text-gold-300 no-print" onClick={() => setShowAll(!showAll)}>{showAll ? 'Ver 12 meses' : 'Ver 36 meses'}</button>}
      >
        <Table head={['Mes', 'CapEx', 'Capac. inicial', 'Únicos', 'Fijos', 'Semifijos', 'Capac. recurr.', 'Voz', 'WhatsApp', 'LLM/otros', 'OpEx', 'Costo total', 'Beneficios', 'Neto', 'Acumulado']}>
          {rows.map((m) => (
            <tr key={m.month} className={m.month > H ? 'opacity-40' : ''}>
              <td className="px-2 py-1 text-zinc-400">{m.month}</td>
              {[m.capex, m.trainingInitial, m.oneOff, m.fixed + m.eleven, m.semifixed + m.capexRecurring, m.trainingRecurring, m.voice, m.whatsapp, m.otherVariable, m.opex, m.totalCost, m.benefits].map((x, i) => (
                <td key={i} className="whitespace-nowrap px-2 text-right"><Money value={x} decimals={false} /></td>
              ))}
              <td className="whitespace-nowrap px-2 text-right"><Money value={m.net} decimals={false} signed /></td>
              <td className="whitespace-nowrap px-2 text-right font-medium"><Money value={m.cumulative} decimals={false} signed /></td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
