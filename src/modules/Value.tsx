import { useStore } from '../state/store';
import { Card, Grid, Kpi, Money, Note, NumberField, PageHeader, Select, Stat, Table, Toggle } from '../components/ui';
import { classifyResult, fmtNum, fmtPct, fmtUSD } from '../engine/money';
import type { ValueConfig } from '../engine/types';

const MODES: { value: ValueConfig['benefitMode']; title: string; desc: string }[] = [
  { value: 'crecimiento', title: 'Crecimiento de ventas (informe AMBA)', desc: 'Ventas adicionales como % sobre las ventas actuales × contribución por venta.' },
  { value: 'modelo', title: 'Embudo de consultas recuperadas', desc: 'Ventas adicionales desde consultas fuera de horario → leads → visitas → cierres.' },
  { value: 'presentacion', title: 'Cifras de la presentación (diap. 9)', desc: 'USD 18.000 + USD 12.000 = USD 30.000 brutos/año, tal como fueron declarados.' },
];

export default function Value() {
  const { active, update, result: r } = useStore();
  const v = r.value;
  const f = r.finance;
  const c = r.consolidated;
  const cfg = active.value;
  const set = (patch: Partial<ValueConfig>) => update((s) => Object.assign(s.value, patch));
  const H = active.general.horizonMonths;
  const rec = f.recovery;
  const extraYear = v.extraOperations * 12;

  const rows: [string, (s: typeof v.baseline) => number, 'num' | 'usd' | 'h'][] = [
    ['Consultas atendidas / mes', (s) => s.inquiriesHandled, 'num'],
    ['Consultas perdidas fuera de horario / mes', (s) => s.inquiriesLost, 'num'],
    ['Horas humanas de recepción / mes', (s) => s.receptionHours, 'h'],
    ['Operaciones cerradas / mes', (s) => s.operations, 'num'],
    ['Contribución marginal / mes', (s) => s.contribution, 'usd'],
  ];

  return (
    <div className="space-y-6">
      <PageHeader kicker="Rentabilidad" title="¿Cuánto valor genera la inversión?">
        Beneficio bruto = ventas adicionales × contribución por venta. Beneficio neto = beneficio bruto − OpEx anual. Valores antes de impuestos, salvo indicación.
      </PageHeader>

      <Grid cols={5}>
        <Kpi label="Beneficio bruto anual" value={fmtUSD(v.grossAnnual, false)} period="anual" explain={r.explain.beneficioBruto} hint={v.mode === 'presentacion' ? 'diap. 9' : `${fmtNum(extraYear)} ventas × ${fmtUSD(v.margin, false)}`} />
        <Kpi label="OpEx anual" value={fmtUSD(c.opexAnnualSteady, false)} period="anual" explain={r.explain.opexMensual} />
        <Kpi label="Beneficio neto anual" value={fmtUSD(f.netAnnualSteady, false)} period="anual" explain={r.explain.beneficioNeto} tone={classifyResult(f.netAnnualSteady)} hint="bruto − OpEx" />
        <Kpi label="Recuperación" value={f.paybackMonth === null ? `> ${H} meses` : `${f.paybackMonth} meses`} explain={r.explain.payback} tone={f.paybackMonth === null ? 'perdida' : 'ganancia'} />
        <Kpi label={`ROI a ${H} meses`} value={fmtPct(f.roiHorizon)} explain={r.explain.roi} tone={classifyResult(f.roiHorizon)} />
      </Grid>

      <Card
        title="¿Cuántas ventas adicionales se necesitan para recuperar la inversión?"
        subtitle={`Criterio del informe AMBA: recuperar el costo del año 1 (${fmtUSD(rec.target, false)}) con la contribución de cada venta adicional.`}
      >
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-lg border border-ink-700 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-400">Antes de impuestos</p>
            <p className="mt-1 text-3xl font-semibold text-gold-300">{rec.salesPreTax ?? 'n/d'} ventas</p>
            <p className="mt-1 text-sm text-zinc-400">{fmtUSD(rec.target, false)} / {fmtUSD(rec.marginPreTax, false)} por venta</p>
          </div>
          <div className="rounded-lg border border-gold-500/50 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-400">Después de impuestos ({fmtPct(cfg.taxRatePct)})</p>
            <p className="mt-1 text-3xl font-semibold text-gold-300">{rec.salesAfterTax ?? 'n/d'} ventas</p>
            <p className="mt-1 text-sm text-zinc-400">
              {fmtUSD(rec.target, false)} / {fmtUSD(rec.marginAfterTax, false)} · ≈ {rec.salesPerYearAfterTax ?? 'n/d'} por año en {rec.months} meses
            </p>
          </div>
          <div className="rounded-lg border border-ink-700 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-400">El escenario proyecta</p>
            <p className="mt-1 text-3xl font-semibold text-white">{fmtNum(extraYear)} ventas/año</p>
            <p className="mt-1 text-sm text-zinc-400">
              {fmtNum(extraYear * (H / 12))} en {H} meses ·{' '}
              {rec.salesAfterTax !== null && extraYear * (H / 12) >= rec.salesAfterTax ? <span className="text-emerald-300">alcanza la meta</span> : <span className="text-red-300">no alcanza la meta</span>}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-zinc-500">
          Como en el informe, este cálculo no incluye el OpEx del segundo año. El payback y el ROI de arriba sí lo incluyen, porque usan la serie mensual completa.
        </p>
      </Card>

      <Card title="Origen del beneficio">
        <div className="grid gap-3 md:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => set({ benefitMode: m.value })}
              className={`rounded-lg border p-3 text-left ${cfg.benefitMode === m.value ? 'border-gold-500 bg-gold-500/10' : 'border-ink-700 hover:border-ink-600'}`}
            >
              <p className="text-sm font-semibold text-white">{m.title}</p>
              <p className="mt-1 text-xs text-zinc-400">{m.desc}</p>
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-gold-400">Contribución por venta</p>
            <div className="grid gap-x-4 md:grid-cols-2">
              <NumberField label="Precio promedio de la propiedad" unit="USD" value={cfg.averagePrice} min={0} max={10000000} step={1000} status="supuesto" onChange={(x) => set({ averagePrice: x })} />
              <NumberField label="Comisión" unit="%" value={cfg.commissionPct} min={0} max={100} step={0.5} status="supuesto" onChange={(x) => set({ commissionPct: x })} />
              <NumberField label="Costos variables de la inmobiliaria" unit="%" value={cfg.variableCostPct} min={0} max={100} status="supuesto" onChange={(x) => set({ variableCostPct: x })} />
              <NumberField label="Impuesto a las ganancias" unit="%" value={cfg.taxRatePct} min={0} max={100} status="supuesto" onChange={(x) => set({ taxRatePct: x })} />
            </div>
            <Stat label="Comisión por venta"><Money value={(cfg.averagePrice * cfg.commissionPct) / 100} decimals={false} /></Stat>
            <Stat label="Contribución antes de impuestos"><Money value={v.margin} decimals={false} /></Stat>
            <Stat label="Contribución después de impuestos"><Money value={v.marginAfterTax} decimals={false} /></Stat>
          </div>

          <div>
            {cfg.benefitMode === 'crecimiento' && (
              <>
                <p className="mb-2 text-xs uppercase tracking-wider text-gold-400">Ventas adicionales</p>
                <div className="grid gap-x-4 md:grid-cols-2">
                  <NumberField label="Ventas por sucursal por mes (hoy)" value={cfg.salesPerBranchMonthly} min={0} max={100} step={0.5} status="supuesto" onChange={(x) => set({ salesPerBranchMonthly: x })} />
                  <NumberField label="Crecimiento de ventas por IA" unit="%" value={cfg.salesGrowthPct} min={0} max={100} step={0.5} onChange={(x) => set({ salesGrowthPct: x })} />
                </div>
                <Stat label={`Ventas actuales (${active.general.branches} sucursales)`}>{fmtNum(v.baseSalesMonthly * 12)} por año</Stat>
                <Stat label="Ventas adicionales">{fmtNum(extraYear)} por año</Stat>
                <Stat label="Beneficio bruto"><Money value={v.grossAnnual} decimals={false} /> por año</Stat>
              </>
            )}
            {cfg.benefitMode === 'presentacion' && (
              <>
                <p className="mb-2 text-xs uppercase tracking-wider text-gold-400">Cifras de la diapositiva 9</p>
                <NumberField label="Ahorro en horas operativas" unit="USD/año" value={cfg.presentationSavingsAnnual} min={0} max={1000000} step={500} status="presentacion" onChange={(x) => set({ presentationSavingsAnnual: x })} />
                <NumberField label="Leads perdidos fuera de horario" unit="USD/año" value={cfg.presentationOpportunitiesAnnual} min={0} max={1000000} step={500} status="presentacion" onChange={(x) => set({ presentationOpportunitiesAnnual: x })} />
                <Note tone="gold">Los USD 30.000 son beneficio bruto: el neto descuenta el OpEx anual.</Note>
              </>
            )}
            {cfg.benefitMode === 'modelo' && (
              <>
                <p className="mb-2 text-xs uppercase tracking-wider text-gold-400">Embudo comercial</p>
                <div className="grid gap-x-4 md:grid-cols-2">
                  <NumberField label="Consultas fuera de horario" unit="%" value={cfg.pctOffHours} min={0} max={100} onChange={(x) => set({ pctOffHours: x })} />
                  <NumberField label="Se pierden hoy fuera de horario" unit="%" value={cfg.pctLostOffHours} min={0} max={100} onChange={(x) => set({ pctLostOffHours: x })} />
                  <NumberField label="Recuperación con IA" unit="%" value={cfg.recoveryPct} min={0} max={100} onChange={(x) => set({ recoveryPct: x })} />
                  <NumberField label="Consultas → lead útil" unit="%" value={cfg.usefulLeadPct} min={0} max={100} onChange={(x) => set({ usefulLeadPct: x })} />
                  <NumberField label="Lead → visita" unit="%" value={cfg.leadToVisitPct} min={0} max={100} onChange={(x) => set({ leadToVisitPct: x })} />
                  <NumberField label="Visita → operación" unit="%" value={cfg.visitToClosePct} min={0} max={100} step={0.5} onChange={(x) => set({ visitToClosePct: x })} />
                  <NumberField label="Mejora de visitas por mejor calificación" unit="%" value={cfg.visitUpliftPct} min={0} max={100} onChange={(x) => set({ visitUpliftPct: x })} />
                </div>
                <Stat label="Ventas adicionales">{fmtNum(extraYear)} por año</Stat>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 grid gap-x-6 md:grid-cols-4">
          <Select
            label="Horizonte de evaluación"
            value={String(H)}
            onChange={(x) => update((s) => { s.general.horizonMonths = Number(x); })}
            options={[{ value: '12', label: '12 meses' }, { value: '24', label: '24 meses' }, { value: '36', label: '36 meses' }]}
          />
          <NumberField label="Inicio de beneficios (mes)" value={active.rollout.benefitStartMonth} min={1} max={36} onChange={(x) => update((s) => { s.rollout.benefitStartMonth = Math.round(x); })} />
          <NumberField label="Meses hasta el beneficio pleno" value={active.rollout.benefitRampMonths} min={1} max={24} onChange={(x) => update((s) => { s.rollout.benefitRampMonths = Math.round(x); })} />
          <NumberField label="Tasa de descuento anual (VAN)" unit="%" value={active.general.discountRateAnnualPct} min={0} max={100} step={0.5} onChange={(x) => update((s) => { s.general.discountRateAnnualPct = x; })} />
        </div>
        <p className="text-xs text-zinc-500">VAN {fmtUSD(f.npv, false)} · TIR anual {fmtPct(f.irr)} · Equilibrio operativo: {fmtNum(f.opsToCoverOpexMonthly)} ventas/mes cubren el OpEx.</p>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Horas liberadas: ¿ahorro o capacidad?" subtitle="Evita confundir ahorro con capacidad y contar dos veces el mismo beneficio.">
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
                  { value: 'ya_en_ventas', label: 'Ya reflejada en las ventas adicionales (no duplicar)' },
                ]}
              />
              {cfg.capacityTreatment === 'monetizar_productividad' && (
                <NumberField label="Horas aprovechadas en tareas de mayor valor" unit="%" value={cfg.productiveUsePct} min={0} max={100} status="supuesto" onChange={(x) => set({ productiveUsePct: x })} />
              )}
            </>
          )}
          <div className="grid gap-x-4 md:grid-cols-2">
            <NumberField label="Minutos humanos por consulta" unit="min" value={cfg.humanMinutesPerInquiry} min={0} max={120} onChange={(x) => set({ humanMinutesPerInquiry: x })} />
            <NumberField label="Costo laboral por hora" unit="USD" value={cfg.laborCostPerHour} min={0} max={500} status="demo" onChange={(x) => set({ laborCostPerHour: x })} />
          </div>
          <Stat label="Horas liberadas / mes">{fmtNum(v.freedHoursMonthly)} h</Stat>
          <Stat label="Valor de esas horas"><Money value={v.freedHoursValueMonthly} decimals={false} />/mes</Stat>
          <Stat label="Monetizado en el beneficio"><Money value={v.capacityMonetizedMonthly + v.avoidableSavingsMonthly} decimals={false} />/mes</Stat>
          <div className="mt-4 rounded-lg border border-ink-700 p-3">
            <p className="text-xs uppercase tracking-wider text-gold-400">Medición y atribución</p>
            <Toggle checked={cfg.hasBaseline} onChange={(x) => set({ hasBaseline: x })} label="Línea base de 4 semanas disponible" hint="Sin línea base no se atribuye el resultado a la IA (diap. 5)." />
            <label className="block text-sm text-zinc-300">
              Grupo de control (sucursal o cohorte semejante)
              <input value={cfg.controlGroup} onChange={(e) => set({ controlGroup: e.target.value })} placeholder="p. ej. Sucursal Centro" className="mt-1 w-full rounded-md border border-ink-600 bg-ink-950 px-2 py-1.5 text-sm text-white outline-none focus:border-gold-500" />
            </label>
          </div>
        </Card>

        <Card title="Costo de un equipo humano vs. costo del agente" subtitle="Alternativa para cubrir fuera de horario con personas. Es una comparación, no un beneficio contabilizado.">
          <div className="grid gap-x-4 md:grid-cols-2">
            <NumberField label="Horas fuera de horario a cubrir/mes" value={cfg.offHoursCoverageHoursMonthly} min={0} max={744} onChange={(x) => set({ offHoursCoverageHoursMonthly: x })} />
            <NumberField label="Recargo nocturno/festivo" unit="%" value={cfg.nightPremiumPct} min={0} max={200} onChange={(x) => set({ nightPremiumPct: x })} />
          </div>
          <Stat label="Equipo humano para cubrir fuera de horario"><Money value={v.humanOffHoursCostMonthly * 12} decimals={false} />/año</Stat>
          <Stat label="OpEx anual de INMO-IA"><Money value={c.opexAnnualSteady} decimals={false} />/año</Stat>
          <Stat label="Costo humano por consulta"><Money value={(cfg.humanMinutesPerInquiry / 60) * cfg.laborCostPerHour} /></Stat>
          <Stat label="Costo IA por consulta automatizada"><Money value={v.automatedInquiries > 0 ? c.variableMonthly / v.automatedInquiries : null} /></Stat>

          <p className="mb-2 mt-5 text-xs uppercase tracking-wider text-gold-400">Sin IA vs. con INMO-IA (por mes)</p>
          <Table head={['Indicador', 'Sin IA', 'Con IA']}>
            {rows.map(([label, get, kind]) => {
              const fmt = (x: number) => (kind === 'usd' ? fmtUSD(x, false) : kind === 'h' ? `${fmtNum(x)} h` : fmtNum(x));
              return (
                <tr key={label}>
                  <td className="px-2 py-1.5 text-zinc-200">{label}</td>
                  <td className="px-2 text-right tabular-nums">{fmt(get(v.baseline))}</td>
                  <td className="px-2 text-right tabular-nums">{fmt(get(v.withAI))}</td>
                </tr>
              );
            })}
          </Table>
        </Card>
      </div>
    </div>
  );
}
