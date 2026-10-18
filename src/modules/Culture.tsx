import { Bar, BarChart, CartesianGrid, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../state/store';
import { Card, CellNumber, Grid, Kpi, Note, PageHeader, Table, NumberField } from '../components/ui';
import { AXIS, ChartFrame, GOLD, GRID, Legend, SERIES, UsdTooltip } from '../components/charts';
import { fmtNum, fmtPct } from '../engine/money';
import { cxImprovement, psychoAverage } from '../engine/culture';
import type { CultureIndicator, CxIndicator, PsychoDimension } from '../engine/types';

/** Campo numérico que admite vacío (= sin medición). */
function MeasuredCell({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <input
      type="text"
      inputMode="decimal"
      placeholder="sin dato"
      value={value === null ? '' : String(value)}
      onChange={(e) => {
        const t = e.target.value.trim();
        if (t === '') return onChange(null);
        const n = Number(t.replace(',', '.'));
        if (Number.isFinite(n)) onChange(n);
      }}
      className="w-20 rounded border border-dashed border-ink-600 bg-ink-950 px-1.5 py-1 text-right text-sm tabular-nums text-white placeholder:text-zinc-600 outline-none focus:border-gold-500"
    />
  );
}

export default function Culture() {
  const { active, update, result: r } = useStore();
  const idx = r.cultureIndex;

  const setInd = (id: string, patch: Partial<CultureIndicator>) =>
    update((s) => {
      const i = s.culture.indicators.find((x) => x.id === id);
      if (i) Object.assign(i, patch);
    });
  const setCx = (id: string, patch: Partial<CxIndicator>) =>
    update((s) => {
      const i = s.cx.find((x) => x.id === id);
      if (i) Object.assign(i, patch);
    });
  const setPsy = (id: string, patch: Partial<PsychoDimension>) =>
    update((s) => {
      const i = s.psycho.find((x) => x.id === id);
      if (i) Object.assign(i, patch);
    });

  const components = idx.target.components.map((c) => {
    const b = idx.baseline.components.find((x) => x.id === c.id)!;
    const m = idx.measured.components.find((x) => x.id === c.id)!;
    return { name: c.label, Base: b.score, Objetivo: c.score, Medido: m.score };
  });
  const radar = active.psycho.map((p) => ({ dim: p.label, Antes: p.before, Después: p.after ?? undefined }));
  const psyBefore = psychoAverage(active.psycho, 'before');
  const psyAfter = psychoAverage(active.psycho, 'after');

  return (
    <div className="space-y-6">
      <PageHeader kicker="Transformación organizacional" title="Adopción cultural, experiencia del cliente y evaluación psicosocial">
        Indicadores 0–100 con pesos configurables. El índice compuesto es una síntesis de gestión, <b>no una medida científica</b>: se muestran siempre sus
        componentes. Un valor medido vacío significa "sin dato"; nunca se completa con estimaciones.
      </PageHeader>

      <Grid cols={4}>
        <Kpi label="Índice cultural · línea base" value={fmtNum(idx.baseline.value)} hint="encuesta inicial" />
        <Kpi label="Índice cultural · objetivo" value={fmtNum(idx.target.value)} status="proyeccion" />
        <Kpi
          label="Índice cultural · medido"
          value={idx.measured.value === null ? 'Sin medición' : fmtNum(idx.measured.value)}
          status={idx.measured.value === null ? undefined : 'real'}
          hint={idx.measured.value === null ? `faltan ${idx.measured.missing.length} indicadores` : 'encuesta posterior'}
          explain={r.explain.adopcion}
        />
        <Kpi label="Adopción usada en el modelo económico" value={fmtPct(r.adoption.value)} status={r.adoption.source} hint="uso activo" />
      </Grid>

      <Card title="Adopción cultural" subtitle="Base = encuesta inicial · Objetivo = proyección · Medido = encuesta posterior / registros de uso. Los indicadores marcados con ↓ son 'menor es mejor' y se invierten (100 − v) en el índice.">
        <Table head={['Indicador', 'Base', 'Objetivo', 'Medido', 'Peso', 'Peso %', '↓', 'Definición']}>
          {active.culture.indicators.map((i) => {
            const share = idx.target.components.find((c) => c.id === i.id)?.weightShare ?? 0;
            return (
              <tr key={i.id}>
                <td className="px-2 py-1 font-medium text-zinc-100">{i.label}</td>
                <td className="px-1"><CellNumber value={i.baseline} onChange={(v) => setInd(i.id, { baseline: Math.min(100, v) })} width="w-16" /></td>
                <td className="px-1"><CellNumber value={i.target} onChange={(v) => setInd(i.id, { target: Math.min(100, v) })} width="w-16" /></td>
                <td className="px-1"><MeasuredCell value={i.measured} onChange={(v) => setInd(i.id, { measured: v === null ? null : Math.min(100, Math.max(0, v)) })} /></td>
                <td className="px-1"><CellNumber value={i.weight} step={0.5} onChange={(v) => setInd(i.id, { weight: v })} width="w-14" /></td>
                <td className="px-2 text-right text-zinc-400">{fmtPct(share * 100)}</td>
                <td className="px-2 text-center"><input type="checkbox" checked={i.invert} onChange={(e) => setInd(i.id, { invert: e.target.checked })} /></td>
                <td className="max-w-[320px] px-2 text-xs text-zinc-500">{i.description}</td>
              </tr>
            );
          })}
        </Table>
        <p className="mt-2 font-mono text-xs text-gold-300/80">Índice = Σ (peso × puntaje) / Σ pesos · puntaje = v, o 100 − v si el indicador es "menor es mejor".</p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <ChartFrame
          title="Componentes del índice cultural"
          subtitle="Puntaje 0–100 (invertido cuando corresponde)"
          height={340}
          legend={<Legend items={[{ label: 'Base', color: SERIES[6] }, { label: 'Objetivo', color: SERIES[0] }, { label: 'Medido', color: GOLD }]} />}
        >
          <BarChart data={components} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }} barGap={1}>
            <CartesianGrid {...GRID} horizontal={false} vertical />
            <XAxis type="number" domain={[0, 100]} {...AXIS} />
            <YAxis type="category" dataKey="name" {...AXIS} width={180} />
            <Tooltip cursor={{ fill: '#ffffff08' }} content={<UsdTooltip formatter={(x) => fmtNum(x)} />} />
            <Bar dataKey="Base" fill={SERIES[6]} maxBarSize={8} radius={[0, 3, 3, 0]} />
            <Bar dataKey="Objetivo" fill={SERIES[0]} maxBarSize={8} radius={[0, 3, 3, 0]} />
            <Bar dataKey="Medido" fill={GOLD} maxBarSize={8} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ChartFrame>

        <Card title="Adopción por sucursal" subtitle={`Objetivo de uso activo por sucursal (%). Umbral de alerta: ${active.culture.adoptionAlertThreshold}%.`}>
          <NumberField label="Umbral de adopción insuficiente" unit="%" value={active.culture.adoptionAlertThreshold} min={0} max={100} onChange={(v) => update((s) => { s.culture.adoptionAlertThreshold = v; })} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {active.culture.branchAdoption.slice(0, active.general.branches).map((a, i) => (
              <label key={i} className="flex items-center justify-between gap-2 rounded border border-ink-700 px-2 py-1 text-sm">
                <span className={a < active.culture.adoptionAlertThreshold ? 'text-orange-300' : 'text-zinc-300'}>
                  {a < active.culture.adoptionAlertThreshold && <span aria-label="debajo del umbral">⚠ </span>}S{i + 1}
                </span>
                <CellNumber value={a} onChange={(v) => update((s) => { s.culture.branchAdoption[i] = Math.min(100, v); })} width="w-14" />
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-zinc-500">La cantidad de sucursales se define en el Bloque III o en el Dashboard.</p>
        </Card>
      </div>

      <Card title="Experiencia del cliente" subtitle="Valores actuales, objetivos proyectados y resultados efectivamente medidos.">
        <Table head={['Indicador', 'Unidad', 'Actual', 'Objetivo', 'Medido', 'Mejora objetivo', 'Mejora medida']}>
          {active.cx.map((c) => {
            const tgt = cxImprovement(c, 'target');
            const mea = cxImprovement(c, 'measured');
            return (
              <tr key={c.id}>
                <td className="px-2 py-1 font-medium text-zinc-100">{c.label}</td>
                <td className="px-2 text-zinc-500">{c.unit}{c.higherIsBetter ? ' ↑' : ' ↓'}</td>
                <td className="px-1"><CellNumber value={c.baseline} step={0.1} onChange={(v) => setCx(c.id, { baseline: v })} width="w-16" /></td>
                <td className="px-1"><CellNumber value={c.target} step={0.1} onChange={(v) => setCx(c.id, { target: v })} width="w-16" /></td>
                <td className="px-1"><MeasuredCell value={c.measured} onChange={(v) => setCx(c.id, { measured: v })} /></td>
                <td className={`px-2 text-right tabular-nums ${tgt !== null && tgt < 0 ? 'text-red-400' : 'text-zinc-200'}`}>{tgt === null ? '—' : `${tgt >= 0 ? '+' : ''}${fmtNum(tgt)}`}</td>
                <td className={`px-2 text-right tabular-nums ${mea !== null && mea < 0 ? 'text-red-400' : 'text-zinc-200'}`}>{mea === null ? 'sin dato' : `${mea >= 0 ? '+' : ''}${fmtNum(mea)}`}</td>
              </tr>
            );
          })}
        </Table>
        <p className="mt-2 text-xs text-zinc-500">
          "Mejora" se expresa en la dirección deseada: positivo = mejor. Objetivos del piloto (diap. 5): respuesta ≤ 1 min, exactitud ≥ 98%, visitas +15% vs línea base.
        </p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Evaluación psicosocial" subtitle="Diagnóstico organizacional (escala 1–5). Cómo se incorpora la IA al trabajo real, no sólo cuánto se usa la herramienta.">
          <Table head={['Dimensión', 'Antes', 'Después', 'Pregunta guía / observaciones']}>
            {active.psycho.map((p) => (
              <tr key={p.id}>
                <td className="px-2 py-1 font-medium text-zinc-100">{p.label}</td>
                <td className="px-1"><CellNumber value={p.before} step={0.1} onChange={(v) => setPsy(p.id, { before: Math.min(5, Math.max(1, v)) })} width="w-14" /></td>
                <td className="px-1"><MeasuredCell value={p.after} onChange={(v) => setPsy(p.id, { after: v === null ? null : Math.min(5, Math.max(1, v)) })} /></td>
                <td className="min-w-[260px] px-1">
                  <textarea
                    value={p.note}
                    rows={2}
                    onChange={(e) => setPsy(p.id, { note: e.target.value })}
                    className="w-full resize-y rounded border border-transparent bg-transparent px-1.5 py-1 text-xs text-zinc-300 outline-none hover:border-ink-600 focus:border-gold-500 focus:bg-ink-950"
                  />
                </td>
              </tr>
            ))}
          </Table>
          <p className="mt-2 text-sm text-zinc-400">
            Promedio antes: <b className="text-white">{fmtNum(psyBefore)}</b> · después: <b className="text-white">{psyAfter === null ? 'sin medición completa' : fmtNum(psyAfter)}</b>
          </p>
          <div className="mt-3">
            <Note tone="info">Riesgo señalado por el equipo: verificar si el personal acepta que una IA use su voz (consentimiento informado y revocable, ver Gobernanza).</Note>
          </div>
        </Card>

        <ChartFrame
          title="Perfil psicosocial"
          subtitle="Antes vs después (1–5). El 'después' sólo se dibuja con datos de encuesta posterior."
          height={340}
          legend={<Legend items={[{ label: 'Antes', color: SERIES[6] }, { label: 'Después', color: GOLD }]} />}
        >
          <RadarChart data={radar} outerRadius="72%">
            <PolarGrid stroke="#2a2a33" />
            <PolarAngleAxis dataKey="dim" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
            <PolarRadiusAxis domain={[0, 5]} tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} />
            <Radar dataKey="Antes" stroke={SERIES[6]} fill={SERIES[6]} fillOpacity={0.2} strokeWidth={2} />
            <Radar dataKey="Después" stroke={GOLD} fill={GOLD} fillOpacity={0.15} strokeWidth={2} />
            <Tooltip content={<UsdTooltip formatter={(x) => fmtNum(x)} />} />
          </RadarChart>
        </ChartFrame>
      </div>
    </div>
  );
}
