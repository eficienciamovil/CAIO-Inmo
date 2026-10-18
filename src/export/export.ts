import type { ScenarioInput } from '../engine/types';
import type { ScenarioResult } from '../engine/simulate';
import { activityCost } from '../engine/capex';
import { computeAlerts } from '../engine/alerts';

/** Número con coma decimal (Excel en español). */
const n = (x: number | null | undefined, d = 2) => (x === null || x === undefined || !Number.isFinite(x) ? 'n/d' : x.toFixed(d).replace('.', ','));
const q = (s: string) => `"${String(s).replace(/"/g, '""')}"`;

function download(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');

/** CSV separado por punto y coma, con BOM UTF-8 para abrir directo en Excel. */
export function buildCsv(r: ScenarioResult): string {
  const { input: s, consolidated: c, finance: f, value: v } = r;
  const rows: string[][] = [];
  const add = (...cols: (string | number)[]) => rows.push(cols.map((x) => (typeof x === 'number' ? n(x) : q(x))));

  add('INMO-IA | Simulador de Inversión, Rentabilidad y Transformación Organizacional');
  add('Escenario', s.name);
  add('Generado', new Date().toLocaleString('es-AR'));
  add('Moneda', 'USD');
  rows.push([]);
  add('RESUMEN', 'Valor', 'Período');
  add('Inversión inicial', c.initialInvestment, 'único');
  add('Costos fijos', c.fixedMonthly, 'mensual');
  add('Costos semifijos', c.semifixedMonthly, 'mensual');
  add('Costos variables', c.variableMonthly, 'mensual');
  add('OpEx total (régimen)', c.opexMonthly, 'mensual');
  add('OpEx anual (régimen)', c.opexAnnualSteady, 'anual');
  add('Costo total año 1', c.costYear1, 'anual');
  add('Costo total 3 años', c.cost3Years, '36 meses');
  add('Beneficio bruto (régimen)', v.grossAnnual, 'anual');
  add('Beneficio neto (régimen)', f.netAnnualSteady, 'anual');
  add(`ROI acumulado (${s.general.horizonMonths} meses)`, f.roiHorizon ?? NaN, '%');
  add('Payback', f.paybackMonth === null ? 'No se recupera en el horizonte' : `${f.paybackMonth} meses`, '');
  add('VAN', f.npv, `${s.general.horizonMonths} meses`);
  add('TIR anual', f.irr ?? NaN, '%');
  add('Costo por sucursal (año 1)', c.costPerBranchYear1 ?? NaN, 'anual');
  add('Costo por empleado (año 1)', c.costPerEmployeeYear1 ?? NaN, 'anual');
  add('Costo por llamada IA', c.costPerAICall ?? NaN, 'unitario');
  add('Costo por lead útil', c.costPerUsefulLead ?? NaN, 'unitario');
  add('Costo por visita', c.costPerVisit ?? NaN, 'unitario');
  rows.push([]);

  add('CAPEX POR ACTIVIDAD', 'Etapa', 'Horas', 'Tarifa', 'Externos', 'Costo', 'Mes', 'Tipo', 'Responsable', 'Estado del dato');
  for (const a of s.activities) {
    add(a.name, a.stageId, a.hours, a.hourlyRate, a.externalCost, activityCost(a), a.month, a.recurrence, a.owner, a.status);
  }
  rows.push([]);

  add('COSTOS FIJOS Y SEMIFIJOS', 'Proveedor', 'Categoría', 'Periodicidad', 'Mensual', 'Anual', 'Único', 'Estado del dato');
  for (const l of s.fixedLines) {
    const b = r.fixed.byLine.find((x) => x.id === l.id)!;
    add(l.concept, l.provider, l.category, l.periodicity, b.monthly, b.annual, b.oneOff, l.status);
  }
  rows.push([]);

  add('SERIE MENSUAL', 'Inversión', 'OpEx', 'Costo total', 'Beneficios', 'Flujo neto', 'Acumulado');
  for (const m of r.months) add(`Mes ${m.month}`, m.investment, m.opex, m.totalCost, m.benefits, m.net, m.cumulative);
  rows.push([]);

  add('ALERTAS');
  for (const a of computeAlerts(r)) add(a.level, a.message);
  rows.push([]);

  add('DATOS NO CONFIRMADOS', 'Área', 'Estado', 'Impacto año 1');
  for (const u of r.dataQuality.unconfirmed) add(u.item, u.area, u.status, u.amount);

  return '﻿' + rows.map((r) => r.join(';')).join('\r\n');
}

export function exportCsv(r: ScenarioResult) {
  download(`inmo-ia-${slug(r.input.name)}.csv`, buildCsv(r), 'text/csv;charset=utf-8');
}

export function exportComparisonCsv(results: ScenarioResult[]) {
  const head = ['Indicador', ...results.map((r) => r.input.name)];
  const line = (label: string, f: (r: ScenarioResult) => number | null) => [q(label), ...results.map((r) => n(f(r)))].join(';');
  const out = [
    head.map(q).join(';'),
    line('Inversión inicial', (r) => r.consolidated.initialInvestment),
    line('OpEx mensual', (r) => r.consolidated.opexMonthly),
    line('Costo año 1', (r) => r.consolidated.costYear1),
    line('Beneficio bruto anual', (r) => r.value.grossAnnual),
    line('Beneficio neto anual', (r) => r.finance.netAnnualSteady),
    line('ROI horizonte %', (r) => r.finance.roiHorizon),
    line('Payback (meses)', (r) => r.finance.paybackMonth),
    line('VAN', (r) => r.finance.npv),
    line('TIR anual %', (r) => r.finance.irr),
  ];
  download('inmo-ia-comparacion-escenarios.csv', '﻿' + out.join('\r\n'), 'text/csv;charset=utf-8');
}

export function exportScenarioJson(s: ScenarioInput) {
  download(`inmo-ia-escenario-${slug(s.name)}.json`, JSON.stringify(s, null, 2), 'application/json');
}

/** PDF: usa el diálogo de impresión del navegador ("Guardar como PDF") con estilos @media print. */
export function exportPdf() {
  window.print();
}
