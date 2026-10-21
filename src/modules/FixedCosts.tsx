import { useStore } from '../state/store';
import { Button, Card, CellNumber, CellText, Money, Note, NumberField, PageHeader, Select, STATUS_OPTIONS, Stat, StatusBadge, Table, Toggle, statusLabel } from '../components/ui';
import { effectiveQuantity } from '../engine/fixedCosts';
import { fmtNum, fmtUSD } from '../engine/money';
import type { CostLine, DataStatus, ElevenPlan, Periodicity } from '../engine/types';

const PERIODS: { value: Periodicity; label: string }[] = [
  { value: 'mensual', label: 'Mensual' },
  { value: 'trimestral', label: 'Trimestral' },
  { value: 'semestral', label: 'Semestral' },
  { value: 'anual', label: 'Anual' },
  { value: 'unico', label: 'Único' },
];

export default function FixedCosts() {
  const { active, update, result: r } = useStore();
  const drivers = { employees: active.general.employees, branches: active.general.branches };
  const t = r.training;
  const monthlyTotal = r.consolidated.fixedMonthly + r.consolidated.semifixedMonthly;
  const tableMonthly = r.fixed.byLine.reduce((acc, l) => acc + l.monthly, 0);

  const setLine = (id: string, patch: Partial<CostLine>) =>
    update((s) => {
      const l = s.fixedLines.find((x) => x.id === id);
      if (l) Object.assign(l, patch);
    });
  const setPlan = (id: string, patch: Partial<ElevenPlan>) =>
    update((s) => {
      const p = s.eleven.plans.find((x) => x.id === id);
      if (p) Object.assign(p, patch);
    });
  const tr = (patch: Partial<typeof active.training>) => update((s) => Object.assign(s.training, patch));

  return (
    <div className="space-y-6">
      <PageHeader kicker="Bloque II · OpEx fijo y semifijo" title="Costos fijos, semifijos y capacitación">
        Fijos: no varían con el volumen. Semifijos: escalan por escalones (empleados, sucursales, mantenimiento). Los cargos no mensuales se prorratean a su
        equivalente mensual. No se inventan tarifas: los valores sin cotización están en 0 o marcados como <b>Demo</b>/<b>Supuesto</b>.
      </PageHeader>

      <section className="card rounded-xl border border-gold-500/40 bg-ink-900/80 p-5">
        <h3 className="mb-4 text-base font-semibold text-white">Fijos + semifijos: de mensual a anual</h3>
        <div className="grid items-stretch gap-3 text-center md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.2fr]">
          <div className="rounded-lg border border-ink-700 p-3">
            <p className="text-xs uppercase tracking-wider text-zinc-400">Fijos</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{fmtUSD(r.consolidated.fixedMonthly)}</p>
            <p className="text-xs text-zinc-500">/mes · incluye abono ElevenLabs</p>
          </div>
          <span className="self-center text-2xl text-gold-400">+</span>
          <div className="rounded-lg border border-ink-700 p-3">
            <p className="text-xs uppercase tracking-wider text-zinc-400">Semifijos</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{fmtUSD(r.consolidated.semifixedMonthly)}</p>
            <p className="text-xs text-zinc-500">/mes · incluye capacitación recurrente</p>
          </div>
          <span className="self-center text-2xl text-gold-400">=</span>
          <div className="rounded-lg border border-ink-600 bg-ink-850 p-3">
            <p className="text-xs uppercase tracking-wider text-zinc-300">Subtotal mensual</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{fmtUSD(monthlyTotal)}</p>
            <p className="text-xs text-zinc-500">/mes</p>
          </div>
          <span className="self-center text-2xl text-gold-400">× 12 =</span>
          <div className="rounded-lg border border-gold-500/60 bg-gold-500/10 p-3">
            <p className="text-xs uppercase tracking-wider text-gold-300">Total anual</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-gold-300">{fmtUSD(monthlyTotal * 12, false)}</p>
            <p className="text-xs text-zinc-400">/año · va al OpEx del Consolidador</p>
          </div>
        </div>
      </section>

      <Card
        title="Tabla de costos fijos y semifijos"
        subtitle={`Cantidad efectiva = cantidad × ${drivers.employees} empleados o × ${drivers.branches} sucursales según el multiplicador.`}
        actions={
          <span className="no-print">
            <Button
              onClick={() =>
                update((s) => {
                  s.fixedLines.push({ id: `fl-${Date.now()}`, concept: 'Nuevo concepto', provider: '', quantity: 1, unitPrice: 0, periodicity: 'mensual', driver: 'fijo', category: 'fijo', startMonth: 1, status: 'supuesto' });
                })
              }
            >
              + Concepto
            </Button>
          </span>
        }
      >
        <Table
          head={['Concepto', 'Proveedor', 'Cant.', 'Multiplicador', 'Precio unit.', 'Periodicidad', 'Desde mes', 'Mensual', 'Anual', 'Categoría', 'Estado', '']}
          foot={
            <>
              {[
                { label: 'Subtotal de la tabla', m: tableMonthly, cls: 'text-zinc-200 font-medium' },
                { label: '+ Abono ElevenLabs (fijo · ver abajo)', m: r.voice.elevenSubscription, cls: 'text-zinc-400 font-normal' },
                { label: '+ Capacitación recurrente (semifijo · ver abajo)', m: t.recurringMonthly, cls: 'text-zinc-400 font-normal' },
                { label: '+ Partidas recurrentes de etapas (CapEx)', m: r.capex.recurringMonthly, cls: 'text-zinc-400 font-normal' },
              ]
                .filter((x, i) => i === 0 || x.m > 0)
                .map((x) => (
                  <tr key={x.label} className={x.cls}>
                    <td colSpan={7} className="px-2 py-1.5">{x.label}</td>
                    <td className="whitespace-nowrap px-2 text-right"><Money value={x.m} /></td>
                    <td className="whitespace-nowrap px-2 text-right"><Money value={x.m * 12} /></td>
                    <td colSpan={3} />
                  </tr>
                ))}
              <tr className="border-t border-gold-600/40 text-gold-300">
                <td colSpan={7} className="px-2 py-2">= Total fijos + semifijos</td>
                <td className="whitespace-nowrap px-2 text-right"><Money value={monthlyTotal} /></td>
                <td className="whitespace-nowrap px-2 text-right"><Money value={monthlyTotal * 12} /></td>
                <td colSpan={3} />
              </tr>
            </>
          }
        >
          {active.fixedLines.map((l) => {
            const b = r.fixed.byLine.find((x) => x.id === l.id)!;
            return (
              <tr key={l.id} title={l.note}>
                <td className="min-w-[220px] px-1 py-1">
                  <CellText value={l.concept} onChange={(v) => setLine(l.id, { concept: v })} />
                  {l.note && <p className="px-1.5 text-[11px] leading-snug text-amber-300/80">{l.note}</p>}
                </td>
                <td className="min-w-[140px] px-1"><CellText value={l.provider} onChange={(v) => setLine(l.id, { provider: v })} /></td>
                <td className="px-1"><CellNumber value={l.quantity} onChange={(v) => setLine(l.id, { quantity: v })} width="w-14" /></td>
                <td className="px-1">
                  <Select compact value={l.driver} onChange={(v) => setLine(l.id, { driver: v })} options={[{ value: 'fijo', label: 'Fijo' }, { value: 'por_empleado', label: '× empleado' }, { value: 'por_sucursal', label: '× sucursal' }]} />
                  {l.driver !== 'fijo' && <p className="text-right text-[11px] text-zinc-500">= {fmtNum(effectiveQuantity(l, drivers))}</p>}
                </td>
                <td className="px-1"><CellNumber value={l.unitPrice} step={0.01} onChange={(v) => setLine(l.id, { unitPrice: v })} /></td>
                <td className="px-1"><Select compact value={l.periodicity} onChange={(v) => setLine(l.id, { periodicity: v })} options={PERIODS} /></td>
                <td className="px-1"><CellNumber value={l.startMonth} min={1} onChange={(v) => setLine(l.id, { startMonth: Math.max(1, Math.min(36, Math.round(v))) })} width="w-12" /></td>
                <td className="whitespace-nowrap px-2 text-right">{l.periodicity === 'unico' ? <span className="text-zinc-500">único: <Money value={b.oneOff} /></span> : <Money value={b.monthly} />}</td>
                <td className="whitespace-nowrap px-2 text-right">{l.periodicity === 'unico' ? '—' : <Money value={b.annual} />}</td>
                <td className="px-1"><Select compact value={l.category} onChange={(v) => setLine(l.id, { category: v })} options={[{ value: 'fijo', label: 'Fijo' }, { value: 'semifijo', label: 'Semifijo' }]} /></td>
                <td className="px-1">
                  <span className="no-print"><Select compact value={l.status} onChange={(v) => setLine(l.id, { status: v as DataStatus })} options={STATUS_OPTIONS.map((o) => ({ value: o, label: statusLabel(o) }))} /></span>
                  <span className="print-only"><StatusBadge status={l.status} /></span>
                </td>
                <td className="px-1 no-print">
                  <button className="text-zinc-500 hover:text-red-400" title="Eliminar" onClick={() => update((s) => { s.fixedLines = s.fixedLines.filter((x) => x.id !== l.id); })}>✕</button>
                </td>
              </tr>
            );
          })}
        </Table>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="ElevenLabs · planes y abono" subtitle="Precio fijo, minutos incluidos y excedente se separan. El modo de arquitectura se elige en el Bloque III.">
          <Select
            label="Plan seleccionado"
            value={active.eleven.planId}
            onChange={(v) => update((s) => { s.eleven.planId = v; })}
            options={active.eleven.plans.map((p) => ({ value: p.id, label: `${p.name} · USD ${p.monthly}/mes` }))}
          />
          <Toggle
            checked={active.eleven.subscriptionActive}
            onChange={(v) => update((s) => { s.eleven.subscriptionActive = v; })}
            label="Mantener el abono aunque la voz vaya integrada en Retell"
            hint="Por ejemplo, para clonación de voces. Sus minutos incluidos NO se descuentan del consumo de Retell."
          />
          <Table head={['Plan', 'USD/mes', 'Min. incluidos', 'Excedente USD/min', 'Estado']}>
            {active.eleven.plans.map((p) => (
              <tr key={p.id} className={p.id === active.eleven.planId ? 'bg-gold-500/5' : ''}>
                <td className="px-2 py-1 font-medium text-zinc-100">{p.name}</td>
                <td className="px-1"><CellNumber value={p.monthly} onChange={(v) => setPlan(p.id, { monthly: v })} width="w-16" /></td>
                <td className="px-1"><CellNumber value={p.includedMinutes} onChange={(v) => setPlan(p.id, { includedMinutes: v })} width="w-16" /></td>
                <td className="px-1"><CellNumber value={p.overagePerMin} step={0.01} onChange={(v) => setPlan(p.id, { overagePerMin: v })} width="w-16" /></td>
                <td className="px-1">
                  <Select compact value={p.status} onChange={(v) => setPlan(p.id, { status: v as DataStatus })} options={STATUS_OPTIONS.map((o) => ({ value: o, label: statusLabel(o) }))} />
                </td>
              </tr>
            ))}
          </Table>
          <div className="mt-3">
            <Stat label="Abono que entra en el modelo"><Money value={r.voice.elevenSubscription} />/mes</Stat>
            <Stat label="Excedente por minutos con voz ElevenLabs"><Money value={r.voice.elevenOverage} />/mes</Stat>
          </div>
        </Card>

        <Card title="Capacitación del personal" subtitle="Inicial (inversión) y recurrente (OpEx). Las sesiones se redondean hacia arriba según la capacidad.">
          <Toggle
            checked={active.training.includedInCapex}
            onChange={(v) => tr({ includedInCapex: v })}
            label="La formación inicial ya está presupuestada en el CapEx (Bloque I)"
            hint="La diapositiva 9 incluye la capacitación en los USD 25.000. Si está activo, el costo inicial calculado aquí NO se suma de nuevo."
          />
          <div className="grid gap-x-4 md:grid-cols-2">
            <NumberField label="% del personal a capacitar" unit="%" value={active.training.pctToTrain} min={0} max={100} onChange={(v) => tr({ pctToTrain: v })} />
            <NumberField label="Horas por empleado" value={active.training.hoursPerEmployee} min={0} max={200} onChange={(v) => tr({ hoursPerEmployee: v })} />
            <NumberField label="Instructor USD/h" value={active.training.instructorRate} min={0} max={1000} onChange={(v) => tr({ instructorRate: v })} />
            <NumberField label="Alumnos por sesión" value={active.training.sessionCapacity} min={1} max={500} onChange={(v) => tr({ sessionCapacity: v })} />
            <NumberField label="Materiales por participante" unit="USD" value={active.training.materialsPerParticipant} min={0} max={10000} onChange={(v) => tr({ materialsPerParticipant: v })} />
            <NumberField label="Arancel por participante" unit="USD" value={active.training.feePerParticipant} min={0} max={10000} onChange={(v) => tr({ feePerParticipant: v })} />
            <NumberField label="Costo de oportunidad USD/h empleado" value={active.training.opportunityCostPerHour} min={0} max={500} onChange={(v) => tr({ opportunityCostPerHour: v })} />
            <NumberField label="Mes de la formación inicial" value={active.training.month} min={1} max={36} onChange={(v) => tr({ month: Math.round(v) })} />
            <NumberField label="Refuerzos por año" value={active.training.refresherSessionsPerYear} min={0} max={24} onChange={(v) => tr({ refresherSessionsPerYear: v })} />
            <NumberField label="Horas por refuerzo" value={active.training.refresherHours} min={0} max={40} onChange={(v) => tr({ refresherHours: v })} />
            <NumberField label="Rotación anual" unit="%" value={active.training.turnoverPctAnnual} min={0} max={100} onChange={(v) => tr({ turnoverPctAnnual: v })} />
          </div>
          <Toggle checked={active.training.trainNewHires} onChange={(v) => tr({ trainNewHires: v })} label="Formar a las nuevas incorporaciones" />
          <Toggle checked={active.training.includeOpportunityCost} onChange={(v) => tr({ includeOpportunityCost: v })} label="Incluir costo de oportunidad (horas de empleados)" hint="No es salida de caja: sólo para la vista de costo económico." />

          <div className="mt-2 grid gap-x-6 md:grid-cols-2">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-gold-400">Inicial</p>
              <Stat label="Participantes">{t.participants}</Stat>
              <Stat label="Sesiones (redondeo ↑)">{t.sessions}</Stat>
              <Stat label="Instructor"><Money value={t.instructorCost} /></Stat>
              <Stat label="Materiales + aranceles"><Money value={t.materialsCost + t.feesCost} /></Stat>
              <Stat label="Costo directo"><Money value={t.initialDirect} /></Stat>
              <Stat label="Costo de oportunidad (informativo)"><Money value={t.opportunityCost} /></Stat>
              <Stat label="Suma al modelo">{t.includedInCapex ? <span className="text-gold-300">USD 0 (en CapEx)</span> : <Money value={t.initialCounted} />}</Stat>
            </div>
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-gold-400">Recurrente (OpEx)</p>
              <Stat label="Refuerzos"><Money value={t.refresherAnnual} />/año</Stat>
              <Stat label="Nuevas incorporaciones">{t.newHires} pers. · <Money value={t.newHiresAnnual} />/año</Stat>
              <Stat label="Total recurrente"><Money value={t.recurringAnnual} />/año</Stat>
              <Stat label="Equivalente mensual"><Money value={t.recurringMonthly} />/mes</Stat>
            </div>
          </div>
          {t.includedInCapex && (
            <div className="mt-3">
              <Note tone="gold">
                Control de consistencia: el CapEx incluye <b>{fmtUSD(r.capex.trainingInCapex)}</b> en partidas de formación; el cálculo paramétrico da{' '}
                <b>{fmtUSD(t.initialDirect)}</b>. Sólo se cuenta el primero.
              </Note>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
