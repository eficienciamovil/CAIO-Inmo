import { useStore } from '../state/store';
import { Grid, Kpi, PageHeader } from '../components/ui';
import { fmtUSD } from '../engine/money';
import { PRESENTACION } from '../data/referencia';

export default function Consolidator() {
  const { result: r } = useStore();
  const c = r.consolidated;
  const fixedAnnual = c.fixedMonthly * 12;
  const semifixedAnnual = c.semifixedMonthly * 12;
  const variableAnnual = c.variableMonthly * 12;

  return (
    <div className="space-y-6">
      <PageHeader kicker="Consolidador" title="Costo total del primer año">
        Costo del año 1 = inversión inicial + OpEx anual (fijos + semifijos + variables).
      </PageHeader>

      <Grid cols={3}>
        <Kpi label="Costos fijos" value={fmtUSD(fixedAnnual, false)} period="anual" hint="Evolution API, Google One, hosting, ElevenLabs…" />
        <Kpi label="Costos semifijos" value={fmtUSD(semifixedAnnual, false)} period="anual" hint="CRM, mantenimiento, auditoría, capacitación recurrente" />
        <Kpi label="Costos variables" value={fmtUSD(variableAnnual, false)} period="anual" hint="Llamadas (Retell), WhatsApp, LLM" />
      </Grid>

      <section className="card rounded-xl border border-gold-500/40 bg-ink-900/80 p-6">
        <div className="grid items-center gap-4 text-center md:grid-cols-[1fr_auto_1fr_auto_1.2fr]">
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-400">Inversión inicial</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-white">{fmtUSD(c.initialInvestment, false)}</p>
            <p className="text-xs text-zinc-500">único</p>
          </div>
          <span className="text-3xl text-gold-400">+</span>
          <div>
            <p className="text-xs uppercase tracking-wider text-zinc-400">OpEx anual</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-white">{fmtUSD(c.opexAnnualSteady, false)}</p>
            <p className="text-xs text-zinc-500">fijos + semifijos + variables</p>
          </div>
          <span className="text-3xl text-gold-400">=</span>
          <div className="rounded-lg border border-gold-500/60 bg-gold-500/10 p-4">
            <p className="text-xs uppercase tracking-wider text-gold-300">Costo total año 1</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums text-gold-300">{fmtUSD(c.costYear1, false)}</p>
            <p className="text-xs text-zinc-400">Presentación: {fmtUSD(PRESENTACION.inversionAnio1, false)}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
