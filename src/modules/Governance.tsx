import { useStore } from '../state/store';
import { Button, Card, CellNumber, CellText, Note, PageHeader, Select, Table, Toggle } from '../components/ui';
import { evaluateCriterion, inherentRisk, residualRisk, riskLevel, type GateDecision } from '../engine/governance';
import { fmtNum } from '../engine/money';
import type { EvidenceLevel, GateCriterion, Risk } from '../engine/types';
import { PILOT_DEMOS } from '../data/defaults';

const DECISION_STYLE: Record<GateDecision, { cls: string; icon: string; text: string }> = {
  Escalar: { cls: 'border-emerald-500/60 bg-emerald-500/10 text-emerald-200', icon: '▲', text: 'Liberar el siguiente tramo de fondos y ampliar el despliegue.' },
  'Continuar piloto': { cls: 'border-sky-500/50 bg-sky-500/10 text-sky-200', icon: '►', text: 'Seguir midiendo: no hay evidencia suficiente para escalar ni para detener.' },
  Corregir: { cls: 'border-amber-500/60 bg-amber-500/10 text-amber-200', icon: '◆', text: 'Mantener el alcance, corregir los desvíos y volver a medir antes de liberar fondos.' },
  Suspender: { cls: 'border-red-500/60 bg-red-500/10 text-red-200', icon: '■', text: 'Kill-fast: detener el despliegue y no liberar fondos hasta resolver la causa.' },
};

const LEVEL_CLS = { alto: 'text-red-300', medio: 'text-amber-300', bajo: 'text-emerald-300' };

export default function Governance() {
  const { active, update, result: r } = useStore();
  const d = r.decision;
  const style = DECISION_STYLE[d.decision];

  const setCrit = (id: string, patch: Partial<GateCriterion>) =>
    update((s) => {
      const c = s.governance.criteria.find((x) => x.id === id);
      if (c) Object.assign(c, patch);
    });
  const setRisk = (id: string, patch: Partial<Risk>) =>
    update((s) => {
      const x = s.governance.risks.find((y) => y.id === id);
      if (x) Object.assign(x, patch);
    });

  const loadDemo = (key: string | null) =>
    update((s) => {
      for (const c of s.governance.criteria) c.measured = key ? PILOT_DEMOS[key].values[c.id] ?? null : null;
    });

  return (
    <div className="space-y-6">
      <PageHeader kicker="Gobernanza y decisiones CAIO" title="Puertas de decisión y control de riesgos">
        Enfoque ISO/IEC 42001: se distingue el <b>diseño</b> de un control de la <b>evidencia</b> de que funciona. Las decisiones se toman por umbrales explícitos
        (kill-fast), vinculados a la liberación de fondos G1 → G2 → G3.
      </PageHeader>

      <div className={`card rounded-xl border-2 p-5 ${style.cls}`}>
        <p className="text-xs uppercase tracking-[0.2em] opacity-80">Decisión de la puerta</p>
        <p className="mt-1 text-3xl font-semibold">
          <span aria-hidden className="mr-2">{style.icon}</span>
          {d.decision}
        </p>
        <p className="mt-1 text-sm">{style.text}</p>
        <p className="mt-2 text-sm opacity-80">{d.reason}</p>
      </div>

      <Card
        title="Umbrales de decisión"
        subtitle="Indicadores de salida del piloto (diap. 5) más adopción, satisfacción y retorno. Dejá el valor medido vacío si todavía no hay dato."
        actions={
          <span className="flex flex-wrap gap-2 no-print">
            {Object.entries(PILOT_DEMOS).map(([k, v]) => (
              <Button key={k} onClick={() => loadDemo(k)}>{v.label}</Button>
            ))}
            <Button onClick={() => loadDemo(null)}>Borrar mediciones</Button>
          </span>
        }
      >
        <Table head={['Criterio', 'Condición', 'Umbral', 'Medido', 'Unidad', 'Crítico', 'Estado']}>
          {active.governance.criteria.map((c) => {
            const st = evaluateCriterion(c);
            return (
              <tr key={c.id}>
                <td className="px-2 py-1 font-medium text-zinc-100">{c.label}</td>
                <td className="px-1">
                  <Select compact value={c.operator} onChange={(v) => setCrit(c.id, { operator: v })} options={[{ value: '>=', label: '≥' }, { value: '<=', label: '≤' }]} />
                </td>
                <td className="px-1"><CellNumber value={c.threshold} step={0.1} onChange={(v) => setCrit(c.id, { threshold: v })} width="w-16" /></td>
                <td className="px-1">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="sin dato"
                    value={c.measured ?? ''}
                    onChange={(e) => {
                      const t = e.target.value.trim();
                      const n = Number(t.replace(',', '.'));
                      setCrit(c.id, { measured: t === '' ? null : Number.isFinite(n) ? n : c.measured });
                    }}
                    className="w-20 rounded border border-dashed border-ink-600 bg-ink-950 px-1.5 py-1 text-right text-sm text-white placeholder:text-zinc-600 outline-none focus:border-gold-500"
                  />
                </td>
                <td className="px-2 text-zinc-500">{c.unit}</td>
                <td className="px-2 text-center"><input type="checkbox" checked={c.critical} onChange={(e) => setCrit(c.id, { critical: e.target.checked })} /></td>
                <td className="px-2">
                  {st === 'cumple' && <span className="text-emerald-300">✓ Cumple</span>}
                  {st === 'no_cumple' && <span className="text-red-300">✕ No cumple{c.critical ? ' (crítico)' : ''}</span>}
                  {st === 'sin_dato' && <span className="text-zinc-500">○ Sin dato</span>}
                </td>
              </tr>
            );
          })}
        </Table>
        <p className="mt-2 text-xs text-zinc-500">
          Regla: criterio crítico incumplido → Suspender · otro incumplimiento → Corregir · faltan mediciones → Continuar piloto · todo cumple → Escalar.
        </p>
      </Card>

      <Card title="Liberación de fondos por gates" subtitle="Votación de directorio propuesta en la diap. 10.">
        <div className="grid gap-3 md:grid-cols-3">
          {active.governance.fundingGates.map((g, i) => {
            const unlocked = i === 0 || (i === 1 && (d.decision === 'Escalar' || d.decision === 'Continuar piloto')) || (i === 2 && d.decision === 'Escalar');
            return (
              <div key={g.id} className={`rounded-lg border p-4 ${unlocked ? 'border-gold-500/50' : 'border-ink-700 opacity-70'}`}>
                <p className="text-xs uppercase tracking-wider text-gold-400">{g.id} · meses {g.fromMonth}–{g.toMonth}</p>
                <p className="mt-1 font-semibold text-white">{g.name}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-zinc-400">USD</span>
                  <CellNumber value={g.amount} step={500} onChange={(v) => update((s) => { s.governance.fundingGates[i].amount = v; })} width="w-24" />
                </div>
                <p className="mt-2 text-xs text-zinc-400">{unlocked ? 'Habilitado con la decisión actual' : 'Bloqueado hasta cumplir los umbrales'}</p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Matriz de riesgos" subtitle="Inherente = probabilidad × impacto (1–25). Residual: un control sólo diseñado reduce ×0,85; con evidencia parcial ×0,7; verificada ×0,4.">
        <Table head={['Riesgo', 'Prob.', 'Impacto', 'Inherente', 'Control', 'Diseñado', 'Evidencia', 'Residual']}>
          {active.governance.risks.map((x) => {
            const inh = inherentRisk(x);
            const res = residualRisk(x);
            return (
              <tr key={x.id}>
                <td className="min-w-[220px] px-2 py-1 font-medium text-zinc-100">{x.name}</td>
                <td className="px-1"><CellNumber value={x.likelihood} onChange={(v) => setRisk(x.id, { likelihood: Math.min(5, Math.max(1, Math.round(v))) })} width="w-12" /></td>
                <td className="px-1"><CellNumber value={x.impact} onChange={(v) => setRisk(x.id, { impact: Math.min(5, Math.max(1, Math.round(v))) })} width="w-12" /></td>
                <td className={`px-2 text-right font-semibold ${LEVEL_CLS[riskLevel(inh)]}`}>{inh} <span className="text-xs font-normal">{riskLevel(inh)}</span></td>
                <td className="min-w-[280px] px-1"><CellText value={x.control} onChange={(v) => setRisk(x.id, { control: v })} /></td>
                <td className="px-2 text-center"><input type="checkbox" checked={x.controlDesigned} onChange={(e) => setRisk(x.id, { controlDesigned: e.target.checked })} /></td>
                <td className="px-1">
                  <Select compact value={x.evidence} onChange={(v) => setRisk(x.id, { evidence: v as EvidenceLevel })} options={[{ value: 'sin_evidencia', label: 'Sin evidencia' }, { value: 'parcial', label: 'Parcial' }, { value: 'verificada', label: 'Verificada' }]} />
                </td>
                <td className={`px-2 text-right font-semibold ${LEVEL_CLS[riskLevel(res)]}`}>{fmtNum(res)}</td>
              </tr>
            );
          })}
        </Table>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Note tone="gold">
          <b>Límite de autonomía (diap. 6):</b> el agente responde, pide datos mínimos, resume y propone horarios. Disponibilidad, precio vigente, asignación del vendedor y
          confirmación de agenda los controlan reglas verificables.
        </Note>
        <Note tone="info">
          <b>Marco legal:</b> RGPD (España) y Ley 25.326 de Protección de Datos Personales (Argentina). Aviso de IA obligatorio. Validar alcance y cumplimiento con asesoría
          legal.
        </Note>
        <Note tone="warn">
          <b>Canal WhatsApp:</b>{' '}
          {active.whatsapp.channel === 'no_oficial'
            ? 'configurado como NO oficial. Riesgo de bloqueo de número por términos de uso de Meta.'
            : 'API oficial configurada: cobro por mensaje según la tarifa vigente.'}
        </Note>
      </div>
      <Toggle
        checked={active.whatsapp.channel === 'no_oficial'}
        onChange={(v) => update((s) => { s.whatsapp.channel = v ? 'no_oficial' : 'cloud_api'; })}
        label="Simular canal WhatsApp no oficial (Evolution/Baileys)"
        hint="Elimina el costo por mensaje de Meta pero agrega un riesgo operativo y reputacional."
      />
    </div>
  );
}
