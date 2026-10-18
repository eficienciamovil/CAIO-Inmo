/**
 * Cifras de la presentación "Plan Maestro INMO-IA" (Gemini Notebook, 10 diapositivas).
 * Son HIPÓTESIS ORIGINALES, no resultados comprobados. Se muestran como referencia
 * para contrastarlas con el modelo trazable del simulador.
 */
export const PRESENTACION = {
  presupuestoOriginal: 30000, // diap. 9: "Presupuesto original de referencia"
  capex: 25000, // diap. 9: setup, integración, capacitación
  opexAnual: 22000, // diap. 9: licencias, telefonía IA 12 meses
  inversionAnio1: 47000, // diap. 9: "Inversión Total Año 1 Estimada (condicionada a Gates)"
  ahorroHorasOperativas: 18000, // diap. 9: recepción/agenda
  leadsFueraHorario: 12000, // diap. 9: "reducción de coste por lead perdido fuera de horario"
  beneficioDeclarado: 30000, // diap. 9: rotulado "Ahorro Neto Directo" → en realidad beneficio BRUTO
  coberturaDeclaradaPct: 63, // diap. 9: "Cubre el 63% de la inversión"
  gates: [
    { id: 'G1', monto: 6000, destino: 'Línea base y diseño' },
    { id: 'G2', monto: 12000, destino: 'Piloto (tras validar G2)' },
    { id: 'G3', monto: 12000, destino: 'Expansión (tras validar G3)' },
  ],
  comerciales: 50,
  indicadoresPiloto: {
    respuestaInicialMin: 1,
    datosCompletosCrmPct: 90,
    exactitudPct: 98,
    visitasAgendadasUpliftPct: 15,
  },
  lineaBaseSemanas: 4,
} as const;

export const totalGates = PRESENTACION.gates.reduce((a, g) => a + g.monto, 0);

/** Diferencia entre presupuesto revisado y fondos liberados por gates. */
export const brechaFinanciamiento = PRESENTACION.inversionAnio1 - totalGates;

/** Funcionalidades fuera de alcance (documento de ideas). */
export const VERSIONES_FUTURAS = [
  'Control y reclamo automático de pagos de alquileres, rentas y comisiones.',
  'Tasaciones asistidas por IA.',
  'Armado de contratos.',
];

/** Tipos de consulta que debe cubrir la captura omnicanal (documento de ideas). */
export const TIPOS_CONSULTA = ['Comprar', 'Alquilar', 'Vender', 'Poner en alquiler', 'Tasación', 'Mantenimiento / reclamo'];
