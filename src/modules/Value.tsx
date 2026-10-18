import { useMemo } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { useStore } from '../state/store';
import { Card, Grid, Kpi, Money, Note, NumberField, PageHeader, Select, Stat, Table, Toggle } from '../components/ui';
import { AXIS, BENEFIT, ChartFrame, COST, GRID, Legend, UsdTooltip, usdTick } from '../components/charts';
import { classifyResult, fmtNum, fmtPct, fmtUSD } from '../engine/money';
import { computeValue } from '../engine/value';
import type { ValueConfig } from '../engine/types';

export default function Value() {
  const { active, update, result: r } = useStore();
  const v = r.value;
  const f = r.finance;
  const cfg = active.value;
  const set = (patch: Partial<ValueConfig>) => update((s) => Object.assign(s.value, patch));
  const H = active.general.horizonMonths;
  const be = f.breakEven;

  const adoptionCurve = useMemo(() => {
    const drivers = {
      inboundCalls: r.voice.volumes.inbound,
      aiCallPct: active.voice.enabled ? active.voice.aiHandledPct : 0,
      waInbound: active.whatsapp.enabled ? active.whatsapp.inboundConversations : 0,
      waAiPct: active.whatsapp.enabled ? active.whatsapp.aiCoveragePct : 0,
      transferPct: active.voice.humanTransferPct,
    };
    return [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((a) => ({
      adopcion: a,
      'Beneficio bruto': computeValue({ ...cfg, benefitMode: 'modelo' }, { ...drivers, adoptionPct: a }).grossAnnual,
      'OpEx anual': r.consolidated.opexAnnualSteady,
    }));
  }, [active, cfg, r]);

  const aiMonthlyCost = r.consolidated.variableMonthly + r.consolidated.fixedMonthly;
  const rows: [string, (s: typeof v.baseline) => number, 'num' | 'usd' | 'h'][] = [
    ['Consultas atendidas / mes', (s) => s.inquiriesHandled, 'num'],
    ['Consultas perdidas fuera de horario / mes', (s) => s.inquiriesLost, 'num'],
    ['Horas humanas de recepción / mes', (s) => s.receptionHours, 'h'],
    ['Costo de atención humana / mes', (s) => s.receptionHours * cfg.laborCostPerHour, 'usd'],
    ['Leads útiles / mes', (s) => s.usefulLeads, 'num'],
    ['Visitas / mes', (s) => s.visits, 'num'],
    ['Operaciones cerradas / mes', (s) => s.operations, 'num'],
    ['Contribución marginal / mes', (s) => s.contribution, 'usd'],
  ];

  return (
    <div className="space-y-6">
      <PageHeader kicker="Rentabilidad y generación de valor" title="Sin IA vs. con INMO-IA">
        Se separan cuatro conceptos que la presentación agrupa: ahorro de costos evitables, capacidad operativa liberada, contribución incremental por nuevas
        operaciones (margen, no facturación) y beneficio neto después del OpEx incremental.
      </PageHeader>

      <Card title="Origen de las cifras de beneficio">
        <div className="grid gap-3 md:grid-cols-2">
          {(['modelo', 'presentacion'] as const).map((m) => (
            <button
              key={m}
              onClick={() => set({ benefitMode: m })}
              className={`rounded-lg border p-3 text-left ${cfg.benefitMode === m ? 'border-gold-500 bg-gold-500/10' : 'border-ink-700 hover:border-ink-600'}`}
            >
              <p className="text-sm font-semibold text-white">{m === 'modelo' ? 'Modelo trazable (recomendado)' : 'Cifras de la presentación (diap. 9)'}</p>
              <p className="mt-1 text-xs text-zinc-400">
                {m === 'modelo'
                  ? 'Beneficio calculado desde consultas, embudo comercial, horas liberadas y adopción.'
                  : 'USD 18.000 (horas operativas) + USD 12.000 (leads fuera de horario) = USD 30.000 brutos/año, tal como fueron declarados.'}
              </p>
            </button>
          ))}
        </div>
        {cfg.benefitMode === 'presentacion' && (
          <div className="mt-3 grid gap-x-6 md:grid-cols-2">
            <NumberField label="Ahorro en horas operativas" unit="USD/año" value={cfg.presentationSavingsAnnual} min={0} max={1000000} step={500} status="presentacion" onChange={(x) => set({ presentationSavingsAnnual: x })} />
            <NumberField label="Leads perdidos fuera de horario" unit="USD/año" value={cfg.presentationOpportunitiesAnnual} min={0} max={1000000} step={500} status="presentacion" onChange={(x) => set({ presentationOpportunitiesAnnual: x })} />
          </div>
        )}
      </Card>

      <Grid cols={5}>
        <Kpi label="1 · Ahorro evitable" value={fmtUSD(v.avoidableSavingsMonthly * 12, false)} period="anual" hint={cfg.staffKept ? 'plantilla constante' : 'reducción de estructura'} />
        <Kpi label="2 · Capacidad monetizada" value={fmtUSD(v.capacityMonetizedMonthly * 12, false)} period="anual" hint={`${fmtNum(v.freedHoursMonthly)} h/mes liberadas`} />
        <Kpi label="3 · Contribución incremental" value={fmtUSD(v.contributionMonthly * 12, false)} period="anual" hint={`${fmtNum(v.extraOperations * 12)} operaciones/año`} />
        <Kpi label="4 · Beneficio bruto" value={fmtUSD(v.grossAnnual, false)} period="anual" explain={r.explain.beneficioBruto} />
        <Kpi label="5 · Beneficio neto" value={fmtUSD(f.netAnnualSteady, false)} period="anual" explain={r.explain.beneficioNeto} tone={classifyResult(f.netAnnualSteady)} />
        <Kpi label={`6 · ROI acumulado (${H} m)`} value={fmtPct(f.roiHorizon)} explain={r.explain.roi} tone={classifyResult(f.roiHorizon)} />
        <Kpi label="7 · Payback" value={f.paybackMonth === null ? `> ${H} meses` : `${f.paybackMonth} meses`} explain={r.explain.payback} tone={f.paybackMonth === null ? 'perdida' : 'ganancia'} />
        <Kpi label="8 · Equilibrio operativo" value={`${fmtNum(f.opsToCoverOpexMonthly)} op./mes`} hint="para cubrir el OpEx mensual" />
        <Kpi label="VAN" value={fmtUSD(f.npv, false)} explain={r.explain.van} tone={classifyResult(f.npv)} hint={`tasa ${fmtPct(active.general.discountRateAnnualPct)}`} />
        <Kpi label="TIR anual" value={fmtPct(f.irr)} explain={r.explain.tir} tone={classifyResult(f.irr)} />
      </Grid>

      <Note tone="gold">{v.classificationNote}</Note>

      <Card title="¿Cuántas operaciones adicionales, o cuánto ahorro verificable, se necesitan para cubrir la inversión?" subtitle="Cálculo determinista sobre el horizonte seleccionado.">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2 text-sm leading-relaxed text-zinc-300">
            <p>
              Para cubrir el costo total de <b className="text-white">{fmtUSD(be.totalCost, false)}</b> en {be.months} meses (inversión + OpEx), descontando{' '}
              <b className="text-white">{fmtUSD(be.otherBenefits, false)}</b> de ahorro y capacidad monetizada, hacen falta:
            </p>
            <p className="text-2xl font-semibold text-gold-300">
              {be.operationsTotal === null ? 'n/d (margen = 0)' : `${fmtNum(be.operationsTotal)} operaciones`}
              <span className="ml-2 text-base font-normal text-zinc-400">≈ {fmtNum(be.operationsPerMonth)} por mes</span>
            </p>
            <p>
              Sin contar ningún ahorro: <b className="text-white">{fmtNum(be.operationsPerMonthNoOtherBenefits)} operaciones/mes</b>. Alternativamente, sin ventas adicionales,
              un ahorro verificable de <b className="text-white">{fmtUSD(be.verifiableSavingsPerMonth, false)}/mes</b>.
            </p>
            <p>El modelo proyecta <b className="text-white">{fmtNum(v.extraOperations)} operaciones adicionales/mes</b> en régimen (antes de la rampa).</p>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-wider text-gold-400">Supuestos usados</p>
            <Stat label="Contribución marginal por operación"><Money value={be.marginPerOperation} decimals={false} /></Stat>
            <Stat label="Costo total del horizonte"><Money value={be.totalCost} decimals={false} /></Stat>
            <Stat label="Ahorro + capacidad monetizada del horizonte"><Money value={be.otherBenefits} decimals={false} /></Stat>
            <Stat label="Brecha a cubrir con operaciones"><Money value={be.gapToCover} decimals={false} /></Stat>
            <Stat label="Horizonte">{be.months} meses</Stat>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Operación actual y embudo comercial" subtitle="Consultas = llamadas entrantes + conversaciones de WhatsApp (Bloque III).">
          <div className="grid gap-x-4 md:grid-cols-2">
            <NumberField label="Consultas fuera de horario" unit="%" value={cfg.pctOffHours} min={0} max={100} onChange={(x) => set({ pctOffHours: x })} />
            <NumberField label="Se pierden hoy fuera de horario" unit="%" value={cfg.pctLostOffHours} min={0} max={100} onChange={(x) => set({ pctLostOffHours: x })} />
            <NumberField label="Recuperación con IA" unit="%" value={cfg.recoveryPct} min={0} max={100} onChange={(x) => set({ recoveryPct: x })} />
            <NumberField label="Consultas → lead útil" unit="%" value={cfg.usefulLeadPct} min={0} max={100} onChange={(x) => set({ usefulLeadPct: x })} />
            <NumberField label="Lead → visita" unit="%" value={cfg.leadToVisitPct} min={0} max={100} onChange={(x) => set({ leadToVisitPct: x })} />
            <NumberField label="Visita → operación (conversión)" unit="%" value={cfg.visitToClosePct} min={0} max={100} step={0.5} onChange={(x) => set({ visitToClosePct: x })} />
            <NumberField label="Contribución marginal por operación" unit="USD" value={cfg.marginPerOperation} min={0} max={100000} step={50} status="demo" hint="Margen (comisión neta), no facturación" onChange={(x) => set({ marginPerOperation: x })} />
            <NumberField label="Mejora de visitas por mejor calificación" unit="%" value={cfg.visitUpliftPct} min={0} max={100} hint="Sobre visitas base. No incluye leads recuperados." onChange={(x) => set({ visitUpliftPct: x })} />
            <NumberField label="Minutos humanos por consulta" unit="min" value={cfg.humanMinutesPerInquiry} min={0} max={120} onChange={(x) => set({ humanMinutesPerInquiry: x })} />
            <NumberField label="Costo laboral por hora" unit="USD" value={cfg.laborCostPerHour} min={0} max={500} status="demo" onChange={(x) => set({ laborCostPerHour: x })} />
            <NumberField label="Costos evitables demostrables" unit="USD/mes" value={cfg.avoidableCostsMonthly} min={0} max={100000} hint="p. ej. call center externo que se da de baja" onChange={(x) => set({ avoidableCostsMonthly: x })} />
            <NumberField label="Inicio de beneficios (mes)" value={active.rollout.benefitStartMonth} min={1} max={36} onChange={(x) => update((s) => { s.rollout.benefitStartMonth = Math.round(x); })} />
            <NumberField label="Rampa de beneficios (meses)" value={active.rollout.benefitRampMonths} min={1} max={24} onChange={(x) => update((s) => { s.rollout.benefitRampMonths = Math.round(x); })} />
          </div>
        </Card>

        <Card title="Clasificación de las horas liberadas" subtitle="Evita confundir ahorro con capacidad y contar dos veces el mismo beneficio.">
          <Toggle
            checked={cfg.staffKept}
            onChange={(x) => set({ staffKept: x })}
            label="La empresa mantiene la misma plantilla y estructura salarial"
            hint="Si está activo, las horas liberadas NO son ahorro de nómina: son capacidad recuperada."
          />
          {cfg.staffKept && (
            <>
              <Select
                label="Tratamiento de la capacidad liberada"
                value={cfg.capacityTreatment}
                onChange={(x) => set({ capacityTreatment: x })}
                options={[
                  { value: 'no_monetizar', label: 'No monetizar (más conservador)' },
                  { value: 'monetizar_productividad', label: 'Monetizar sólo con hipótesis verificable de aprovechamiento' },
                  { value: 'ya_en_ventas', label: 'Ya reflejada en la contribución por ventas (no duplicar)' },
                ]}
              />
              {cfg.capacityTreatment === 'monetizar_productividad' && (
                <NumberField label="Horas aprovechadas en tareas de mayor valor" unit="%" value={cfg.productiveUsePct} min={0} max={100} status="supuesto" onChange={(x) => set({ productiveUsePct: x })} />
              )}
            </>
          )}
          <NumberField
            label="Dependencia del beneficio respecto de la adopción"
            unit="%"
            value={cfg.adoptionDependencyPct}
            min={0}
            max={100}
            status="supuesto"
            hint={`Factor = (1 − d) + d × adopción. Con adopción ${fmtPct(r.adoption.value)} (${r.adoption.source}) → factor ${fmtPct(v.adoptionFactor * 100)}.`}
            onChange={(x) => set({ adoptionDependencyPct: x })}
          />
          <Stat label="Horas liberadas / mes">{fmtNum(v.freedHoursMonthly)} h</Stat>
          <Stat label="Valor de esas horas"><Money value={v.freedHoursValueMonthly} />/mes</Stat>
          <Stat label="Monetizado"><Money value={v.capacityMonetizedMonthly + (cfg.staffKept ? 0 : v.avoidableSavingsMonthly)} />/mes</Stat>
          <Stat label="Capacidad no monetizada (informativa)"><Money value={v.capacityNotMonetizedMonthly} />/mes</Stat>

          <div className="mt-4 rounded-lg border border-ink-700 p-3">
            <p className="text-xs uppercase tracking-wider text-gold-400">Medición y atribución</p>
            <Toggle checked={cfg.hasBaseline} onChange={(x) => set({ hasBaseline: x })} label="Línea base de 4 semanas disponible" hint="Sin línea base no se atribuye el resultado a la IA (diap. 5)." />
            <label className="block text-sm text-zinc-300">
              Grupo de control (sucursal o cohorte semejante)
              <input value={cfg.controlGroup} onChange={(e) => set({ controlGroup: e.target.value })} placeholder="p. ej. Sucursal Centro" className="mt-1 w-full rounded-md border border-ink-600 bg-ink-950 px-2 py-1.5 text-sm text-white outline-none focus:border-gold-500" />
            </label>
          </div>
        </Card>
      </div>

      <Card title="Comparación mensual: escenario actual vs. con INMO-IA">
        <Table head={['Indicador', 'Sin IA', 'Con IA', 'Diferencia']}>
          {rows.map(([label, get, kind]) => {
            const a = get(v.baseline);
            const b = get(v.withAI);
            const fmt = (x: number) => (kind === 'usd' ? fmtUSD(x, false) : kind === 'h' ? `${fmtNum(x)} h` : fmtNum(x));
            return (
              <tr key={label}>
                <td className="px-2 py-1.5 text-zinc-200">{label}</td>
                <td className="px-2 text-right tabular-nums">{fmt(a)}</td>
                <td className="px-2 text-right tabular-nums">{fmt(b)}</td>
                <td className={`px-2 text-right tabular-nums ${b - a < 0 ? 'text-zinc-400' : 'text-zinc-100'}`}>{b - a >= 0 ? '+' : ''}{fmt(b - a)}</td>
              </tr>
            );
          })}
        </Table>
        <p className="mt-2 text-xs text-zinc-500">
          Consultas automatizables: {fmtNum(v.automatedInquiries)} de {fmtNum(v.inquiries)} ({fmtPct(v.aiCoverageShare * 100)}). Recuperadas fuera de horario: {fmtNum(v.recoveredInquiries)}/mes.
          Las horas liberadas sólo cuentan consultas en horario resueltas sin derivación.
        </p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Costo de un equipo humano vs. costo del agente" subtitle="Alternativa para cubrir fuera de horario con personas. Es una comparación, no un beneficio contabilizado.">
          <div className="grid gap-x-4 md:grid-cols-2">
            <NumberField label="Horas fuera de horario a cubrir/mes" value={cfg.offHoursCoverageHoursMonthly} min={0} max={744} onChange={(x) => set({ offHoursCoverageHoursMonthly: x })} />
            <NumberField label="Recargo nocturno/festivo" unit="%" value={cfg.nightPremiumPct} min={0} max={200} onChange={(x) => set({ nightPremiumPct: x })} />
          </div>
          <Stat label="Equipo humano para cubrir fuera de horario"><Money value={v.humanOffHoursCostMonthly} decimals={false} />/mes</Stat>
          <Stat label="Agente IA (variables + fijos de la plataforma)"><Money value={aiMonthlyCost} decimals={false} />/mes</Stat>
          <Stat label="Costo humano por consulta"><Money value={(cfg.humanMinutesPerInquiry / 60) * cfg.laborCostPerHour} /></Stat>
          <Stat label="Costo IA por consulta automatizada"><Money value={v.automatedInquiries > 0 ? r.consolidated.variableMonthly / v.automatedInquiries : null} /></Stat>
          <Stat label="Hora de conversación IA (Retell)"><Money value={active.voice.retellPerMin * 60} /> vs hora humana <Money value={cfg.laborCostPerHour} /></Stat>
        </Card>

        <ChartFrame
          title="Adopción → beneficio económico"
          subtitle="Beneficio bruto anual según el % de uso activo del equipo (hipótesis de dependencia explícita)"
          legend={<Legend items={[{ label: 'Beneficio bruto', color: BENEFIT }, { label: 'OpEx anual', color: COST, dashed: true }]} />}
        >
          <LineChart data={adoptionCurve} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="adopcion" tickFormatter={(x) => `${x}%`} {...AXIS} />
            <YAxis tickFormatter={usdTick} {...AXIS} width={56} />
            <Tooltip content={<UsdTooltip labelPrefix="Adopción " />} />
            <ReferenceLine x={Math.round(r.adoption.value / 10) * 10} stroke="#71717a" strokeDasharray="3 3" />
            <Line dataKey="Beneficio bruto" stroke={BENEFIT} strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
            <Line dataKey="OpEx anual" stroke={COST} strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          </LineChart>
        </ChartFrame>
      </div>
    </div>
  );
}
