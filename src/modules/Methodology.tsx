import { useStore } from '../state/store';
import { Card, Money, Note, PageHeader, StatusBadge, Table } from '../components/ui';
import { fmtPct } from '../engine/money';
import { PRESENTACION, VERSIONES_FUTURAS, TIPOS_CONSULTA, brechaFinanciamiento } from '../data/referencia';

const FORMULAS: [string, string][] = [
  ['Costo de actividad', 'Horas × Tarifa horaria + Costos externos'],
  ['Sesiones de capacitación', '⌈ participantes / capacidad por sesión ⌉'],
  ['Minutos IA entrantes', 'Llamadas entrantes × Duración media × % IA'],
  ['Minutos IA salientes', 'Llamadas salientes × Duración media × % IA + reintentos (salientes IA × % fallidas × reintentos × min/intento)'],
  ['Costo Retell', 'Minutos voz integrada × tarifa + minutos voz ElevenLabs × (tarifa − componente de voz) + telefonía + cargos'],
  ['ElevenLabs', 'Abono (fijo) + max(0, minutos con voz ElevenLabs − incluidos) × excedente'],
  ['WhatsApp', 'Σ categorías (mensajes facturables × tarifa país/categoría). Servicio y utilidad en ventana: 0'],
  ['OpEx mensual', 'Fijos + Semifijos + Variables'],
  ['Costo año 1', 'Σ meses 1–12 (Inversión + OpEx), con arranque de canales, rampa y fechas'],
  ['Consultas', 'Llamadas entrantes + conversaciones entrantes de WhatsApp'],
  ['Recuperadas fuera de horario', 'Consultas × % fuera de horario × % perdidas × cobertura IA × % recuperación'],
  ['Operaciones adicionales', '(Visitas por leads recuperados + mejora de visitas base) × conversión'],
  ['Contribución incremental', 'Operaciones adicionales × contribución marginal por operación (no facturación)'],
  ['Horas liberadas', 'Consultas automatizadas en horario × (1 − % derivación) × minutos humanos / 60'],
  ['Factor de adopción', '(1 − d) + d × adopción efectiva'],
  ['Beneficio bruto', '(Ahorro evitable + Capacidad monetizada + Contribución) × factor de adopción'],
  ['Beneficio neto', 'Beneficio bruto − OpEx'],
  ['ROI', '(Beneficios acumulados − Costos acumulados) / Costos acumulados × 100'],
  ['Payback', 'Primer mes con flujo acumulado ≥ 0'],
  ['VAN', 'Σ Flujo_m / (1 + r_m)^m, r_m = (1 + r_anual)^(1/12) − 1'],
  ['TIR', 'r_m tal que VAN = 0 (bisección), anualizada'],
  ['Índice cultural', 'Σ (peso × puntaje) / Σ pesos'],
];

export default function Methodology() {
  const { result: r } = useStore();
  const dq = r.dataQuality;

  return (
    <div className="space-y-6">
      <PageHeader kicker="Fuentes, supuestos y metodología" title="Qué está confirmado y qué no">
        El simulador separa datos confirmados, cifras de la presentación, supuestos, proyecciones y resultados medidos. Esta pestaña lista lo que falta validar antes de
        presentar una cifra como definitiva.
      </PageHeader>

      <Card title="Leyenda de estados del dato">
        <div className="flex flex-wrap gap-3">
          {(['confirmado', 'presentacion', 'historico', 'supuesto', 'demo', 'proyeccion', 'real'] as const).map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </Card>

      <Card
        title="Supuestos no confirmados con impacto en el costo del año 1"
        subtitle={dq.confirmedShareYear1 === null ? undefined : `Aproximadamente ${fmtPct(dq.confirmedShareYear1)} del costo del año 1 se apoya en datos confirmados o calculados; el resto, en las partidas siguientes.`}
      >
        <Table head={['Área', 'Partida', 'Estado', 'Impacto año 1']}>
          {dq.unconfirmed.map((u, i) => (
            <tr key={i}>
              <td className="px-2 py-1 text-zinc-400">{u.area}</td>
              <td className="px-2 text-zinc-100">{u.item}</td>
              <td className="px-2"><StatusBadge status={u.status} /></td>
              <td className="px-2 text-right"><Money value={u.amount} decimals={false} /></td>
            </tr>
          ))}
        </Table>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Cifras de la presentación (hipótesis originales)">
          <ul className="space-y-2 text-sm text-zinc-300">
            <li>• Presupuesto original de referencia: <Money value={PRESENTACION.presupuestoOriginal} decimals={false} /> (diap. 9).</li>
            <li>• CapEx revisado <Money value={PRESENTACION.capex} decimals={false} /> (setup, integración, capacitación) + OpEx <Money value={PRESENTACION.opexAnual} decimals={false} /> (licencias, telefonía IA 12 meses) = <Money value={PRESENTACION.inversionAnio1} decimals={false} /> año 1, condicionado a gates.</li>
            <li>• Beneficio: <Money value={PRESENTACION.ahorroHorasOperativas} decimals={false} /> horas operativas + <Money value={PRESENTACION.leadsFueraHorario} decimals={false} /> leads fuera de horario = <Money value={PRESENTACION.beneficioDeclarado} decimals={false} />. Rotulado "Ahorro Neto Directo", es <b>beneficio bruto</b>.</li>
            <li>• Votación de directorio (diap. 10): G1 <Money value={6000} decimals={false} /> + G2 <Money value={12000} decimals={false} /> + G3 <Money value={12000} decimals={false} /> = <Money value={30000} decimals={false} />. Brecha frente a los 47.000: <Money value={brechaFinanciamiento} decimals={false} />.</li>
            <li>• Piloto: respuesta ≤ 1 min · datos CRM ≥ 90% · exactitud ≥ 98% · visitas +15% vs línea base de 4 semanas.</li>
          </ul>
          <div className="mt-4">
            <Note tone="warn">
              Discrepancia a resolver antes de la exposición: el presupuesto total (47.000), los fondos solicitados inicialmente (6.000) y los desembolsos sujetos a
              aprobación (12.000 + 12.000) son tres conceptos distintos. Con las cifras de la propia presentación, el neto anual es 30.000 − 22.000 = 8.000 y el CapEx
              de 25.000 se recupera en algo más de 3 años.
            </Note>
          </div>
        </Card>

        <Card title="Precauciones técnicas sobre tarifas">
          <ul className="space-y-2 text-sm text-zinc-300">
            <li>• <b>Retell:</b> USD 0,159/min tomado de la captura del panel. La tarifa publicada depende de infraestructura, modelo LLM, voz, telefonía y complementos: no sumar de nuevo componentes ya incluidos.</li>
            <li>• <b>ElevenLabs:</b> Starter USD 6/mes con 75 minutos incluidos. Esos minutos no se descuentan del consumo procesado por Retell. Precios de los demás planes y del componente de voz de Retell: supuestos a validar.</li>
            <li>• <b>WhatsApp:</b> la tabla aportada corresponde a 2025 y el modelo de cobro cambió (por mensaje, por categoría y país, con mensajes de servicio sin cargo). Las tarifas cargadas son una referencia histórica aproximada: reemplazar con la tabla vigente o con los valores exactos de la captura.</li>
            <li>• <b>Evolution API:</b> importe USD 83 con periodicidad no confirmada.</li>
            <li>• <b>Hosting, CRM, mantenimiento, auditoría, LLM:</b> valores demo; no son cotizaciones.</li>
            <li>• <b>Margen por operación, conversión y costo laboral:</b> valores demo que deben surgir de la línea base de la inmobiliaria.</li>
          </ul>
        </Card>
      </div>

      <Card title="Fórmulas del modelo">
        <Table head={['Concepto', 'Fórmula']}>
          {FORMULAS.map(([k, f]) => (
            <tr key={k}>
              <td className="whitespace-nowrap px-2 py-1.5 text-zinc-200">{k}</td>
              <td className="px-2 font-mono text-xs text-gold-300">{f}</td>
            </tr>
          ))}
        </Table>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card title="Alcance funcional">
          <p className="text-sm text-zinc-400">Tipos de consulta que cubre la captura omnicanal:</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {TIPOS_CONSULTA.map((t) => (
              <span key={t} className="rounded-full border border-ink-600 px-3 py-1 text-xs text-zinc-200">{t}</span>
            ))}
          </div>
          <p className="mt-4 text-sm text-zinc-400">Versiones futuras (fuera del alcance de este caso de negocio):</p>
          <ul className="mt-1 space-y-1 text-sm text-zinc-300">
            {VERSIONES_FUTURAS.map((v) => <li key={v}>• {v}</li>)}
          </ul>
        </Card>
        <Card title="Criterios del modelo">
          <ul className="space-y-2 text-sm text-zinc-300">
            <li>• Determinista: no se usan números aleatorios.</li>
            <li>• Las llamadas son totales de la organización: no se multiplican por sucursal ni por empleado salvo en el modo "por sucursal", que se activa de forma explícita.</li>
            <li>• La capacitación inicial se cuenta una sola vez (en el CapEx o en el bloque de capacitación).</li>
            <li>• Si la plantilla se mantiene, las horas liberadas son capacidad, no ahorro de nómina, y no se monetizan dos veces.</li>
            <li>• Los resultados negativos se muestran en rojo y con signo, como pérdida.</li>
            <li>• Éxito = consultas bien resueltas + oportunidades + menor costo sin deteriorar la experiencia del cliente, no volumen de conversaciones.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
