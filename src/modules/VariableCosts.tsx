import { Fragment } from 'react';
import { useStore } from '../state/store';
import { Card, CellNumber, CellText, Money, Note, NumberField, PageHeader, Select, STATUS_OPTIONS, Stat, Table, Toggle, statusLabel } from '../components/ui';
import { LIMITS } from '../engine/simulate';
import { WA_CATEGORIES, WA_LABELS, isRateUsable } from '../engine/whatsapp';
import { fmtNum, fmtUSD } from '../engine/money';
import type { DataStatus, ElevenMode, WaCategory, WaRate } from '../engine/types';

const MODES: { value: ElevenMode; label: string; desc: string }[] = [
  { value: 'integrado', label: '1 · Voz integrada en Retell', desc: 'La voz ya está incluida en la tarifa por minuto de Retell. ElevenLabs no factura consumo.' },
  { value: 'independiente', label: '2 · ElevenLabs independiente', desc: 'La voz la factura ElevenLabs (abono + excedente). A Retell se le descuenta el componente de voz.' },
  { value: 'mixto', label: '3 · Arquitectura mixta', desc: 'Un % de los minutos usa voz de ElevenLabs facturada aparte; el resto, voz integrada.' },
];

export default function VariableCosts() {
  const { active, update, result: r } = useStore();
  const v = active.voice;
  const vr = r.voice;
  const wa = active.whatsapp;
  const vo = (patch: Partial<typeof v>) => update((s) => Object.assign(s.voice, patch));
  const countries = Array.from(new Set(wa.rates.map((x) => x.country)));

  const setRate = (country: string, category: WaCategory, patch: Partial<WaRate>) =>
    update((s) => {
      const rate = s.whatsapp.rates.find((x) => x.country === country && x.category === category);
      if (rate) Object.assign(rate, patch);
      else s.whatsapp.rates.push({ country, category, pricePerMessage: 0, effectiveDate: null, source: '', status: 'supuesto', ...patch });
    });

  return (
    <div className="space-y-6">
      <PageHeader kicker="Bloque III · Costos variables" title="Centro de simulación de consumo">
        Las llamadas se interpretan como <b className="text-gold-300">totales mensuales de la organización</b>: empleados y sucursales no las multiplican. Sólo el modo
        "por sucursal", activado explícitamente, calcula llamadas × sucursales.
      </PageHeader>

      <section className="card rounded-xl border border-gold-500/40 bg-ink-900/80 p-5">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold text-white">Total de costos variables por año</h3>
          <p className="text-xs text-zinc-400">Este total es el que figura como "Costos variables" en el Consolidador.</p>
        </div>
        <div className="grid items-stretch gap-3 text-center md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.2fr]">
          {[
            { label: 'Voz (Retell)', annual: vr.variableTotal * 12, detail: `${fmtNum(vr.totalAIMin)} min/mes × USD ${active.voice.retellPerMin}` },
            { label: 'WhatsApp', annual: r.whatsapp.total * 12, detail: `${fmtNum(r.whatsapp.billableMessages)} mensajes facturables/mes` },
            { label: 'LLM y almacenamiento', annual: r.otherVariableMonthly * 12, detail: 'consumo de modelos + almacenamiento' },
          ].map((x, i) => (
            <Fragment key={x.label}>
              {i > 0 && <span className="self-center text-2xl text-gold-400">+</span>}
              <div className="rounded-lg border border-ink-700 p-3">
                <p className="text-xs uppercase tracking-wider text-zinc-400">{x.label}</p>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{fmtUSD(x.annual, false)}</p>
                <p className="text-xs text-zinc-500">{fmtUSD(x.annual / 12)}/mes · {x.detail}</p>
              </div>
            </Fragment>
          ))}
          <span className="self-center text-2xl text-gold-400">=</span>
          <div className="rounded-lg border border-gold-500/60 bg-gold-500/10 p-3">
            <p className="text-xs uppercase tracking-wider text-gold-300">Total variables</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums text-gold-300">{fmtUSD(r.consolidated.variableMonthly * 12, false)}</p>
            <p className="text-xs text-zinc-400">/año · {fmtUSD(r.consolidated.variableMonthly)}/mes × 12</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Volumen y organización">
          <NumberField label="Empleados" value={active.general.employees} min={LIMITS.employees[0]} max={LIMITS.employees[1]} slider onChange={(x) => update((s) => { s.general.employees = x; })} />
          <NumberField label="Sucursales" value={active.general.branches} min={LIMITS.branches[0]} max={LIMITS.branches[1]} slider onChange={(x) => update((s) => { s.general.branches = x; })} />
          <Select
            label="Modo de carga de llamadas"
            value={v.callMode}
            onChange={(x) => vo({ callMode: x })}
            options={[{ value: 'total', label: 'Total de la organización (recomendado)' }, { value: 'por_sucursal', label: 'Por sucursal (× sucursales)' }]}
          />
          {v.callMode === 'total' ? (
            <>
              <NumberField label="Llamadas entrantes/mes" value={v.inboundCalls} min={LIMITS.inboundCalls[0]} max={LIMITS.inboundCalls[1]} step={10} slider onChange={(x) => vo({ inboundCalls: x })} />
              <NumberField label="Llamadas salientes/mes" value={v.outboundCalls} min={LIMITS.outboundCalls[0]} max={LIMITS.outboundCalls[1]} step={5} slider onChange={(x) => vo({ outboundCalls: x })} />
            </>
          ) : (
            <>
              <Note tone="warn">Modo por sucursal activo: {fmtNum(v.inboundPerBranch)} × {active.general.branches} = {fmtNum(vr.volumes.inbound)} entrantes; {fmtNum(v.outboundPerBranch)} × {active.general.branches} = {fmtNum(vr.volumes.outbound)} salientes (límites 5.000 / 1.000).</Note>
              <div className="mt-3" />
              <NumberField label="Entrantes por sucursal/mes" value={v.inboundPerBranch} min={0} max={1000} slider onChange={(x) => vo({ inboundPerBranch: x })} />
              <NumberField label="Salientes por sucursal/mes" value={v.outboundPerBranch} min={0} max={500} slider onChange={(x) => vo({ outboundPerBranch: x })} />
            </>
          )}
          <div className="grid gap-x-4 md:grid-cols-2">
            <NumberField label="Duración media entrante" unit="min" value={v.inboundDurationMin} min={0} max={30} step={0.5} onChange={(x) => vo({ inboundDurationMin: x })} />
            <NumberField label="Duración media saliente" unit="min" value={v.outboundDurationMin} min={0} max={30} step={0.5} onChange={(x) => vo({ outboundDurationMin: x })} />
            <NumberField label="Gestionadas por IA" unit="%" value={v.aiHandledPct} min={0} max={100} onChange={(x) => vo({ aiHandledPct: x })} />
            <NumberField label="Derivadas a humanos" unit="%" value={v.humanTransferPct} min={0} max={100} onChange={(x) => vo({ humanTransferPct: x })} hint="de las gestionadas por IA" />
            <NumberField label="Salientes fallidas" unit="%" value={v.failedPct} min={0} max={100} onChange={(x) => vo({ failedPct: x })} />
            <NumberField label="Reintentos por fallida" value={v.retriesPerFailed} min={0} max={10} onChange={(x) => vo({ retriesPerFailed: x })} />
            <NumberField label="Minutos por intento fallido" unit="min" value={v.failedAttemptMin} min={0} max={5} step={0.1} onChange={(x) => vo({ failedAttemptMin: x })} />
          </div>
          <Toggle checked={v.enabled} onChange={(x) => vo({ enabled: x })} label="Canal de voz habilitado" />
        </Card>

        <Card title="Retell AI · tarifa y cargos" subtitle="Tarifa por minuto según el panel de Retell. No duplicar componentes ya incluidos en esa tarifa.">
          <NumberField label="Tarifa Retell" unit="USD/min" value={v.retellPerMin} min={0} max={2} step={0.001} status="confirmado" onChange={(x) => vo({ retellPerMin: x })} />
          <div className="grid gap-x-4 md:grid-cols-2">
            <NumberField label="Telefonía entrante" unit="USD/min" value={v.telephonyInboundPerMin} min={0} max={1} step={0.001} onChange={(x) => vo({ telephonyInboundPerMin: x })} hint="Sólo si no está en la tarifa" />
            <NumberField label="Telefonía saliente" unit="USD/min" value={v.telephonyOutboundPerMin} min={0} max={1} step={0.001} onChange={(x) => vo({ telephonyOutboundPerMin: x })} hint="Sólo si no está en la tarifa" />
            <NumberField label="Cargo por llamada saliente" unit="USD" value={v.perOutboundCallFee} min={0} max={5} step={0.01} onChange={(x) => vo({ perOutboundCallFee: x })} />
            <NumberField label="Cargo de conexión/número" unit="USD/mes" value={v.connectionFeeMonthly} min={0} max={1000} onChange={(x) => vo({ connectionFeeMonthly: x })} />
            <NumberField label="Complementos" unit="USD/mes" value={v.addonsMonthly} min={0} max={5000} onChange={(x) => vo({ addonsMonthly: x })} />
          </div>
          <div className="mt-2">
            <Stat label="Llamadas atendidas por IA">{fmtNum(vr.aiInboundCalls + vr.aiOutboundCalls)} · derivadas {fmtNum(vr.transferredCalls)}</Stat>
            <Stat label="Minutos por reintentos">{fmtNum(vr.retryMin)}</Stat>
            <Stat label="Uso Retell (minutos × tarifa efectiva)"><Money value={vr.retellUsage} /></Stat>
            <Stat label="Telefonía + cargos por llamada + fijos"><Money value={vr.telephony + vr.outboundFees + vr.fixedRetell} /></Stat>
            <Stat label="Costo unitario llamada entrante"><Money value={vr.costPerInboundCall} /></Stat>
            <Stat label="Costo unitario llamada saliente"><Money value={vr.costPerOutboundCall} /></Stat>
            <Stat label="Total voz/mes"><span className="text-gold-300"><Money value={vr.variableTotal} /></span></Stat>
          </div>
        </Card>
      </div>

      <Card title="ElevenLabs · arquitectura de voz" subtitle="El modo impide la doble facturación: un minuto nunca paga la voz en Retell y en ElevenLabs a la vez.">
        <div className="grid gap-3 md:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m.value}
              onClick={() => update((s) => { s.eleven.mode = m.value; })}
              className={`rounded-lg border p-3 text-left transition ${active.eleven.mode === m.value ? 'border-gold-500 bg-gold-500/10' : 'border-ink-700 hover:border-ink-600'}`}
            >
              <p className="text-sm font-semibold text-white">{m.label}</p>
              <p className="mt-1 text-xs text-zinc-400">{m.desc}</p>
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-x-6 md:grid-cols-3">
          {active.eleven.mode === 'mixto' && (
            <NumberField label="% de minutos con voz ElevenLabs" unit="%" value={active.eleven.mixSharePct} min={0} max={100} slider onChange={(x) => update((s) => { s.eleven.mixSharePct = x; })} />
          )}
          {active.eleven.mode !== 'integrado' && (
            <NumberField
              label="Componente de voz dentro de la tarifa Retell"
              unit="USD/min"
              value={active.eleven.retellVoiceComponentPerMin}
              min={0}
              max={v.retellPerMin}
              step={0.001}
              status="supuesto"
              hint="Se descuenta de Retell cuando la voz la factura ElevenLabs. Validar en el panel de Retell."
              onChange={(x) => update((s) => { s.eleven.retellVoiceComponentPerMin = x; })}
            />
          )}
          <div className="text-sm">
            <Stat label="Minutos con voz integrada">{fmtNum(vr.integratedMinutes)}</Stat>
            <Stat label="Minutos con voz ElevenLabs">{fmtNum(vr.elevenMinutes)}</Stat>
            <Stat label={`Incluidos en plan ${vr.plan?.name ?? ''}`}>{fmtNum(vr.plan?.includedMinutes ?? 0)} (sólo para minutos ElevenLabs)</Stat>
            <Stat label="Excedente ElevenLabs"><Money value={vr.elevenOverage} />/mes</Stat>
            <Stat label="Abono (fijo, Bloque II)"><Money value={vr.elevenSubscription} />/mes</Stat>
          </div>
        </div>
      </Card>

      <Card
        title="WhatsApp Business API"
        subtitle="Costo = mensajes facturables por categoría × tarifa del país. No se usa una tarifa única por conversación. Las tarifas 2025 están marcadas como históricas."
      >
        <Note tone="warn">
          El modelo de cobro de WhatsApp cambió durante 2025 (de conversación a mensaje). Las tarifas cargadas son una referencia histórica: confirmá la tabla vigente
          y su fecha antes de presentarlas como costo confirmado. Una tarifa sin fecha o sin categoría no se aplica.
        </Note>
        <div className="mt-4 grid gap-x-6 md:grid-cols-4">
          <Select label="País de las tarifas" value={wa.country} onChange={(x) => update((s) => { s.whatsapp.country = x; })} options={countries.map((c) => ({ value: c, label: c }))} />
          <Select
            label="Canal"
            value={wa.channel}
            onChange={(x) => update((s) => { s.whatsapp.channel = x; })}
            options={[{ value: 'cloud_api', label: 'API oficial (Cloud API)' }, { value: 'no_oficial', label: 'No oficial (Evolution/Baileys)' }]}
          />
          <NumberField label="Utilidad dentro de ventana (sin cargo)" unit="%" value={wa.utilityInWindowPct} min={0} max={100} onChange={(x) => update((s) => { s.whatsapp.utilityInWindowPct = x; })} />
          <NumberField label="Cargo del proveedor por mensaje" unit="USD" value={wa.providerFeePerMessage} min={0} max={1} step={0.001} onChange={(x) => update((s) => { s.whatsapp.providerFeePerMessage = x; })} />
          <NumberField label="Conversaciones entrantes/mes" value={wa.inboundConversations} min={0} max={20000} step={10} onChange={(x) => update((s) => { s.whatsapp.inboundConversations = x; })} hint="Consultas de clientes por WhatsApp" />
          <NumberField label="Atendidas por IA" unit="%" value={wa.aiCoveragePct} min={0} max={100} onChange={(x) => update((s) => { s.whatsapp.aiCoveragePct = x; })} />
          <div className="md:col-span-2 pt-6">
            <Toggle checked={wa.enabled} onChange={(x) => update((s) => { s.whatsapp.enabled = x; })} label="Canal WhatsApp habilitado" />
          </div>
        </div>
        <Table head={['Categoría', 'Mensajes/mes', 'Facturables', `Tarifa ${wa.country}`, 'Vigencia', 'Fuente', 'Estado', 'Costo/mes']}>
          {WA_CATEGORIES.map((cat) => {
            const line = r.whatsapp.lines.find((l) => l.category === cat);
            const rate = wa.rates.find((x) => x.country === wa.country && x.category === cat);
            const usable = rate ? isRateUsable(rate) : false;
            return (
              <tr key={cat}>
                <td className="px-2 py-1 text-zinc-100">{WA_LABELS[cat]}</td>
                <td className="px-1"><CellNumber value={wa.volumes[cat]} onChange={(x) => update((s) => { s.whatsapp.volumes[cat] = x; })} /></td>
                <td className="px-2 text-right tabular-nums">{fmtNum(line?.billable ?? 0)}</td>
                <td className="px-1"><CellNumber value={rate?.pricePerMessage ?? 0} step={0.0001} onChange={(x) => setRate(wa.country, cat, { pricePerMessage: x })} /></td>
                <td className="px-1">
                  <input
                    type="date"
                    value={rate?.effectiveDate ?? ''}
                    onChange={(e) => setRate(wa.country, cat, { effectiveDate: e.target.value || null })}
                    className={`rounded border bg-ink-950 px-1.5 py-1 text-sm text-white ${usable ? 'border-ink-600' : 'border-red-500/70'}`}
                  />
                </td>
                <td className="min-w-[220px] px-1"><CellText value={rate?.source ?? ''} onChange={(x) => setRate(wa.country, cat, { source: x })} /></td>
                <td className="px-1">
                  <Select compact value={rate?.status ?? 'supuesto'} onChange={(x) => setRate(wa.country, cat, { status: x as DataStatus })} options={STATUS_OPTIONS.map((o) => ({ value: o, label: statusLabel(o) }))} />
                </td>
                <td className="whitespace-nowrap px-2 text-right">{line?.issue ? <span className="text-red-300" title={line.issue}>no aplicada</span> : <Money value={line?.cost ?? 0} />}</td>
              </tr>
            );
          })}
        </Table>
        <div className="mt-3 max-w-md">
          <Stat label="Cargos de Meta"><Money value={r.whatsapp.metaTotal} /></Stat>
          <Stat label="Cargos del proveedor"><Money value={r.whatsapp.providerTotal} /></Stat>
          <Stat label="Total WhatsApp/mes"><span className="text-gold-300"><Money value={r.whatsapp.total} /></span></Stat>
        </div>
        {r.whatsapp.issues.map((i) => (
          <div key={i} className="mt-2"><Note tone={wa.channel === 'no_oficial' ? 'danger' : 'warn'}>{i}</Note></div>
        ))}
      </Card>

      <Card title="Otros consumos variables y despliegue">
        <div className="grid gap-x-6 md:grid-cols-3">
          <NumberField label="LLM · USD por 1.000 interacciones" value={active.otherVariable.llmPer1kInteractions} min={0} max={500} step={0.5} status="demo" onChange={(x) => update((s) => { s.otherVariable.llmPer1kInteractions = x; })} />
          <NumberField label="Transcripción" unit="USD/min" value={active.otherVariable.transcriptionPerMin} min={0} max={1} step={0.001} onChange={(x) => update((s) => { s.otherVariable.transcriptionPerMin = x; })} hint="0 si está incluida en Retell" />
          <NumberField label="Almacenamiento" unit="USD/mes" value={active.otherVariable.storageMonthly} min={0} max={1000} status="demo" onChange={(x) => update((s) => { s.otherVariable.storageMonthly = x; })} />
          <NumberField label="Arranque WhatsApp (mes)" value={active.rollout.whatsappStartMonth} min={1} max={36} onChange={(x) => update((s) => { s.rollout.whatsappStartMonth = Math.round(x); })} />
          <NumberField label="Arranque voz (mes)" value={active.rollout.voiceStartMonth} min={1} max={36} onChange={(x) => update((s) => { s.rollout.voiceStartMonth = Math.round(x); })} />
          <NumberField label="Meses de rampa hasta volumen pleno" value={active.rollout.rampMonths} min={1} max={24} onChange={(x) => update((s) => { s.rollout.rampMonths = Math.round(x); })} />
        </div>
        <p className="text-xs text-zinc-500">
          LLM y almacenamiento/mes en régimen: <b className="text-zinc-300">{fmtUSD(r.otherVariableMonthly)}</b>. La rampa hace que el costo del año 1 sea menor que OpEx × 12.
        </p>
      </Card>
    </div>
  );
}
