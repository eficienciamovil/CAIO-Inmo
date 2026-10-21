import { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../state/store';
import { Grid, Kpi, Note, PageHeader } from '../components/ui';
import { AXIS, BENEFIT, ChartFrame, COST, GOLD, GRID, Legend, SERIES, STATUS, UsdTooltip, usdTick } from '../components/charts';
import { classifyResult, fmtNum, fmtPct, fmtUSD } from '../engine/money';
import type { Alert } from '../engine/alerts';
import { sensitivity } from '../engine/sensitivity';
import { linearProjection } from '../engine/culture';
import { PRESENTACION } from '../data/referencia';
import QuickControls from '../components/QuickControls';

export default function Dashboard() {
  const { active, result: r } = useStore();
  const { consolidated: c, finance: f, value: v } = r;
  const tornado = useMemo(() => sensitivity(active, 20, 'roi'), [active]);
  const H = active.general.horizonMonths;

  const capexData = r.capex.stages.map((s) => ({ name: `E${s.stageId}`, full: s.name, value: s.oneTime }));
  const monthly = r.months.slice(0, H).map((m) => ({ mes: m.month, Inversión: m.investment, OpEx: m.opex, Beneficios: m.benefits, Acumulado: m.cumulative }));
  const funnel = [
    { name: 'Leads útiles', sin: v.baseline.usefulLeads, con: v.withAI.usefulLeads },
    { name: 'Visitas', sin: v.baseline.visits, con: v.withAI.visits },
    { name: 'Consultas perdidas', sin: v.baseline.inquiriesLost, con: v.withAI.inquiriesLost },
    { name: 'Horas de recepción', sin: v.baseline.receptionHours, con: v.withAI.receptionHours },
  ];
  const branches = active.culture.branchAdoption.slice(0, active.general.branches).map((a, i) => ({ name: `S${i + 1}`, value: a }));
  const csat = active.cx.find((x) => x.id === 'csat');
  const csatSeries = csat
    ? linearProjection(csat.baseline, csat.target, 5).map((val, i) => ({ t: i === 0 ? 'Base' : `T${i}`, Proyección: val, Medido: i === 4 ? csat.measured : null }))
    : [];
  const adoptionIdx = r.cultureIndex.measured.value ?? r.cultureIndex.target.value;
  const tornadoData = tornado.map((t) => ({ name: t.label, low: (t.low ?? 0) - (t.base ?? 0), high: (t.high ?? 0) - (t.base ?? 0) }));

  return (
    <div className="space-y-6">
      <PageHeader kicker="Dashboard ejecutivo" title={`Caso de negocio · escenario ${active.name}`}>
        Lectura en 5 minutos: cuánto cuesta, cuánto valor genera y qué transformación produce. Hacé clic en cualquier indicador para ver su fórmula y
        sus valores de entrada.
      </PageHeader>

      <QuickControls />

      {/* 1 · Costo */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">1 · Cuánto cuesta</h3>
        <Grid cols={3}>
          <Kpi label="Inversión inicial" value={fmtUSD(c.initialInvestment, false)} period="unico" explain={r.explain.inversion} hint={`Presentación: ${fmtUSD(PRESENTACION.capex, false)}`} />
          <Kpi label="OpEx anual (fijos + variables)" value={fmtUSD(c.opexAnnualSteady, false)} period="anual" explain={r.explain.opexMensual} hint={`Presentación: ${fmtUSD(PRESENTACION.opexAnual, false)}`} />
          <Kpi label="Costo del primer año" value={fmtUSD(c.costYear1, false)} period="anual" explain={r.explain.costoAnio1} hint={`${fmtUSD(c.initialInvestment, false)} + ${fmtUSD(c.opexAnnualSteady, false)}`} />
        </Grid>
      </section>

      {/* 2 · Valor */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">2 · Cuánto valor genera</h3>
        <Grid cols={4}>
          <Kpi label="Beneficio bruto anual" value={fmtUSD(v.grossAnnual, false)} period="anual" explain={r.explain.beneficioBruto} status={v.mode === 'presentacion' ? 'presentacion' : 'proyeccion'} />
          <Kpi label="Beneficio neto anual" value={fmtUSD(f.netAnnualSteady, false)} period="anual" explain={r.explain.beneficioNeto} tone={classifyResult(f.netAnnualSteady)} hint="bruto − OpEx" />
          <Kpi label={`ROI ${H} meses`} value={fmtPct(f.roiHorizon)} explain={r.explain.roi} tone={classifyResult(f.roiHorizon)} />
          <Kpi label="Recuperación" value={f.paybackMonth === null ? `> ${H} meses` : `${f.paybackMonth} meses`} explain={r.explain.payback} tone={f.paybackMonth === null ? 'perdida' : 'ganancia'} />
        </Grid>
      </section>

      {/* 3 · Transformación */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">3 · Qué transformación produce</h3>
        <Grid cols={3}>
          <Kpi label="Adopción cultural (índice)" value={`${fmtNum(adoptionIdx)}/100`} explain={r.explain.adopcion} status={r.cultureIndex.measured.value !== null ? 'real' : 'proyeccion'} hint={`base ${fmtNum(r.cultureIndex.baseline.value)}`} />
          <Kpi label="Satisfacción del cliente (CSAT)" value={csat ? `${fmtNum(csat.measured ?? csat.target)}/100` : 'n/d'} status={csat?.measured != null ? 'real' : 'proyeccion'} hint={csat ? `base ${csat.baseline}` : undefined} />
          <Kpi label="Decisión de la puerta" value={r.decision.decision} tone="gold" hint={r.decision.reason} />
        </Grid>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <ChartFrame title="CapEx por etapa" subtitle="Inversión única por etapa de la hoja de ruta (USD)">
          <BarChart data={capexData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="name" {...AXIS} />
            <YAxis tickFormatter={usdTick} {...AXIS} width={56} />
            <Tooltip cursor={{ fill: '#ffffff08' }} content={<UsdTooltip />} labelFormatter={(l) => capexData.find((d) => d.name === l)?.full ?? l} />
            <Bar dataKey="value" name="CapEx" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={56} />
          </BarChart>
        </ChartFrame>

        <ChartFrame title="OpEx anual por categoría" subtitle="OpEx anual por categoría (USD/año)">
          <BarChart data={c.opexByCategory.map((x) => ({ ...x, value: x.value * 12 }))} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid {...GRID} horizontal={false} vertical />
            <XAxis type="number" tickFormatter={usdTick} {...AXIS} />
            <YAxis type="category" dataKey="name" {...AXIS} width={150} />
            <Tooltip cursor={{ fill: '#ffffff08' }} content={<UsdTooltip />} />
            <Bar dataKey="value" name="OpEx" fill={COST} radius={[0, 4, 4, 0]} maxBarSize={22} />
          </BarChart>
        </ChartFrame>

        <ChartFrame
          title="Evolución mensual de costos y beneficios"
          subtitle="Inversión y OpEx apilados; beneficios como línea (USD/mes)"
          legend={<Legend items={[{ label: 'Inversión', color: GOLD }, { label: 'OpEx', color: COST }, { label: 'Beneficios', color: BENEFIT }]} />}
        >
          <ComposedChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="mes" {...AXIS} />
            <YAxis tickFormatter={usdTick} {...AXIS} width={56} />
            <Tooltip content={<UsdTooltip labelPrefix="Mes " />} />
            <Bar dataKey="Inversión" stackId="c" fill={GOLD} />
            <Bar dataKey="OpEx" stackId="c" fill={COST} radius={[4, 4, 0, 0]} />
            <Line dataKey="Beneficios" stroke={BENEFIT} strokeWidth={2} dot={false} />
          </ComposedChart>
        </ChartFrame>

        <ChartFrame title="Flujo de caja acumulado" subtitle={`Beneficios − inversión − OpEx, meses 1–${H} (USD)`}>
          <AreaChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GOLD} stopOpacity={0.35} />
                <stop offset="100%" stopColor={GOLD} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="mes" {...AXIS} />
            <YAxis tickFormatter={usdTick} {...AXIS} width={56} />
            <Tooltip content={<UsdTooltip labelPrefix="Mes " />} />
            <ReferenceLine y={0} stroke="#71717a" />
            {f.paybackMonth && <ReferenceLine x={f.paybackMonth} stroke={STATUS.good} strokeDasharray="4 4" label={{ value: 'Payback', fill: '#a1a1aa', fontSize: 11, position: 'top' }} />}
            <Area dataKey="Acumulado" stroke={GOLD} strokeWidth={2} fill="url(#cum)" />
          </AreaChart>
        </ChartFrame>

        <ChartFrame
          title="Sin IA vs. con INMO-IA"
          subtitle="Embudo mensual del escenario (cantidades por mes)"
          legend={<Legend items={[{ label: 'Sin IA', color: SERIES[6] }, { label: 'Con IA', color: SERIES[2] }]} />}
        >
          <BarChart data={funnel} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="name" {...AXIS} />
            <YAxis {...AXIS} width={48} />
            <Tooltip cursor={{ fill: '#ffffff08' }} content={<UsdTooltip formatter={(x) => fmtNum(x)} />} />
            <Bar dataKey="sin" name="Sin IA" fill={SERIES[6]} radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="con" name="Con IA" fill={SERIES[2]} radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ChartFrame>

        <ChartFrame title="Sensibilidad del ROI (±20%)" subtitle={`Variación en puntos de ROI respecto del caso (${fmtPct(f.roiHorizon)})`} height={300}
          legend={<Legend items={[{ label: '−20%', color: SERIES[1] }, { label: '+20%', color: SERIES[0] }]} />}
        >
          <BarChart data={tornadoData} layout="vertical" stackOffset="sign" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
            <CartesianGrid {...GRID} horizontal={false} vertical />
            <XAxis type="number" tickFormatter={(x) => `${x > 0 ? '+' : ''}${Math.round(x)} pp`} {...AXIS} />
            <YAxis type="category" dataKey="name" {...AXIS} width={170} />
            <ReferenceLine x={0} stroke="#71717a" />
            <Tooltip cursor={{ fill: '#ffffff08' }} content={<UsdTooltip formatter={(x) => `${x > 0 ? '+' : ''}${fmtNum(x)} pp`} />} />
            <Bar dataKey="low" name="−20%" fill={SERIES[1]} stackId="t" maxBarSize={18} />
            <Bar dataKey="high" name="+20%" fill={SERIES[0]} stackId="t" maxBarSize={18} />
          </BarChart>
        </ChartFrame>

        <ChartFrame title="Adopción por sucursal" subtitle="Objetivo de uso activo por sucursal (%) · editable en Adopción y CX">
          <BarChart data={branches} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="name" {...AXIS} />
            <YAxis domain={[0, 100]} {...AXIS} width={40} />
            <ReferenceLine y={active.culture.adoptionAlertThreshold} stroke={STATUS.warning} strokeDasharray="4 4" />
            <Tooltip cursor={{ fill: '#ffffff08' }} content={<UsdTooltip formatter={(x) => `${fmtNum(x)}%`} />} />
            <Bar dataKey="value" name="Adopción" radius={[4, 4, 0, 0]} maxBarSize={40}>
              {branches.map((b) => (
                <Cell key={b.name} fill={b.value < active.culture.adoptionAlertThreshold ? STATUS.serious : SERIES[2]} />
              ))}
            </Bar>
          </BarChart>
        </ChartFrame>

        <ChartFrame title="Evolución de la satisfacción del cliente" subtitle="CSAT: proyección lineal base → objetivo (no es dato medido) y medición si existe"
          legend={<Legend items={[{ label: 'Proyección', color: SERIES[0], dashed: true }, { label: 'Medido', color: GOLD }]} />}
        >
          <LineChart data={csatSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="t" {...AXIS} />
            <YAxis domain={[0, 100]} {...AXIS} width={40} />
            <Tooltip content={<UsdTooltip formatter={(x) => fmtNum(x)} />} />
            <Line dataKey="Proyección" stroke={SERIES[0]} strokeDasharray="5 4" strokeWidth={2} dot={{ r: 4 }} />
            <Line dataKey="Medido" stroke={GOLD} strokeWidth={2} dot={{ r: 5 }} connectNulls />
          </LineChart>
        </ChartFrame>
      </div>
    </div>
  );
}

export function AlertList({ alerts }: { alerts: Alert[] }) {
  if (!alerts.length) return <Note tone="info">Sin alertas con los supuestos actuales.</Note>;
  const icon = { critica: '⛔', advertencia: '⚠', info: 'ℹ' };
  const cls = { critica: 'border-red-500/40 bg-red-500/10', advertencia: 'border-amber-500/40 bg-amber-500/5', info: 'border-sky-500/30 bg-sky-500/5' };
  const label = { critica: 'Crítica', advertencia: 'Advertencia', info: 'Info' };
  return (
    <div className="card space-y-2">
      {alerts.map((a) => (
        <div key={a.id} className={`flex items-start gap-3 rounded-lg border px-4 py-2.5 text-sm ${cls[a.level]}`}>
          <span aria-hidden>{icon[a.level]}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 pt-0.5 w-20 shrink-0">{label[a.level]}</span>
          <span className="text-zinc-100">{a.message}</span>
        </div>
      ))}
    </div>
  );
}
