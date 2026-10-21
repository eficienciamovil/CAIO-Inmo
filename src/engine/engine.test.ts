import { describe, expect, it } from 'vitest';
import type { ScenarioInput, VoiceConfig, ElevenConfig } from './types';
import { BASE_SCENARIO } from '../data/defaults';
import { DEFAULT_SCENARIOS } from '../data/scenarios';
import { activityCost, summarizeCapex } from './capex';
import { lineMonthly, summarizeFixed } from './fixedCosts';
import { computeTraining } from './training';
import { callVolumes, computeVoice } from './voice';
import { computeWhatsApp, isRateUsable } from './whatsapp';
import { computeValue, adoptionFactor } from './value';
import { compositeIndex } from './culture';
import { breakEven, irrAnnual, npv, paybackMonth, roi } from './finance';
import { gateDecision } from './governance';
import { classifyResult, fmtUSD, safeDiv, sessionsNeeded, toMonthly } from './money';
import { sanitize, simulate } from './simulate';
import { computeAlerts } from './alerts';
import { applyAlternative } from './alternatives';
import { sensitivity } from './sensitivity';

const clone = (): ScenarioInput => structuredClone(BASE_SCENARIO);

function demoVoice(): { v: VoiceConfig; e: ElevenConfig } {
  const s = clone();
  s.voice = {
    ...s.voice,
    callMode: 'total',
    inboundCalls: 1000,
    outboundCalls: 200,
    inboundDurationMin: 3,
    outboundDurationMin: 2,
    aiHandledPct: 100,
    failedPct: 0,
    retellPerMin: 0.159,
    telephonyInboundPerMin: 0,
    telephonyOutboundPerMin: 0,
    perOutboundCallFee: 0,
    connectionFeeMonthly: 0,
    addonsMonthly: 0,
  };
  s.eleven.mode = 'integrado';
  return { v: s.voice, e: s.eleven };
}

describe('Caso de control (demo del mensaje)', () => {
  it('3.400 minutos × USD 0,159 = USD 540,60/mes y USD 6.487,20/año', () => {
    const { v, e } = demoVoice();
    const r = computeVoice(v, e, 5);
    expect(r.totalAIMin).toBe(3400);
    expect(r.variableTotal).toBeCloseTo(540.6, 2);
    expect(r.variableTotal * 12).toBeCloseTo(6487.2, 2);
  });

  it('capacitación inicial 50 empleados × USD 50 = USD 2.500 (inversión única, no mensual)', () => {
    const s = clone();
    const t = computeTraining({ ...s.training, includedInCapex: false, pctToTrain: 100, instructorRate: 0, materialsPerParticipant: 0, feePerParticipant: 50, includeOpportunityCost: false }, 50);
    expect(t.initialCounted).toBe(2500);
  });
});

describe('Bloque I — CapEx', () => {
  it('costo de actividad = horas × tarifa + externos', () => {
    expect(activityCost({ ...BASE_SCENARIO.activities[0], hours: 10, hourlyRate: 30, externalCost: 200 })).toBe(500);
  });

  it('el CapEx base suma los USD 25.000 de la presentación', () => {
    const c = summarizeCapex(BASE_SCENARIO.stages, BASE_SCENARIO.activities, true);
    expect(c.totalOneTime).toBe(25000);
  });

  it('las partidas recurrentes no se suman a la inversión única', () => {
    const acts = [{ ...BASE_SCENARIO.activities[0], hours: 10, hourlyRate: 10, externalCost: 0, recurrence: 'recurrente' as const, month: 3 }];
    const c = summarizeCapex(BASE_SCENARIO.stages, acts, true);
    expect(c.totalOneTime).toBe(0);
    expect(c.recurringMonthly).toBe(100);
    expect(c.recurringByMonth(2)).toBe(0);
    expect(c.recurringByMonth(3)).toBe(100);
  });
});

describe('Doble conteo de capacitación', () => {
  it('si la formación está incluida en CapEx, el bloque de capacitación no la suma de nuevo', () => {
    const s = clone();
    s.training.includedInCapex = true;
    const r = simulate(s);
    expect(r.training.initialCounted).toBe(0);
    expect(r.capex.totalOneTime).toBe(25000);
    expect(r.consolidated.initialInvestment).toBe(25000 + r.fixed.oneOffTotal);
  });

  it('si no está incluida, se excluye la partida de formación del CapEx y se usa el bloque de capacitación', () => {
    const s = clone();
    s.training.includedInCapex = false;
    const r = simulate(s);
    const trainingActivity = activityCost(s.activities.find((a) => a.isTraining)!);
    expect(r.capex.totalOneTime).toBe(25000 - trainingActivity);
    expect(r.training.initialCounted).toBeGreaterThan(0);
    expect(r.consolidated.initialInvestment).toBeCloseTo(25000 - trainingActivity + r.training.initialCounted + r.fixed.oneOffTotal, 6);
  });

  it('las sesiones se redondean hacia arriba según capacidad', () => {
    expect(sessionsNeeded(50, 15)).toBe(4);
    expect(sessionsNeeded(45, 15)).toBe(3);
    expect(sessionsNeeded(0, 15)).toBe(0);
    const t = computeTraining({ ...BASE_SCENARIO.training, sessionCapacity: 15 }, 50);
    expect(t.sessions).toBe(4);
  });
});

describe('Bloque II — fijos y semifijos', () => {
  it('convierte periodicidades a mensual', () => {
    expect(toMonthly(120, 'anual')).toBe(10);
    expect(toMonthly(30, 'trimestral')).toBe(10);
    expect(toMonthly(500, 'unico')).toBe(0);
  });

  it('las licencias por empleado escalan con empleados; las por sucursal con sucursales', () => {
    const line = { ...BASE_SCENARIO.fixedLines[0], quantity: 1, unitPrice: 10, periodicity: 'mensual' as const, driver: 'por_empleado' as const };
    expect(lineMonthly(line, { employees: 50, branches: 5 })).toBe(500);
    expect(lineMonthly({ ...line, driver: 'por_sucursal' }, { employees: 50, branches: 5 })).toBe(50);
  });

  it('Evolution API: la periodicidad cambia el costo anual', () => {
    const evo = BASE_SCENARIO.fixedLines.find((l) => l.id === 'f1')!;
    const d = { employees: 50, branches: 5 };
    expect(summarizeFixed([evo], d).fixedMonthly * 12).toBe(996);
    expect(summarizeFixed([{ ...evo, periodicity: 'anual' }], d).fixedMonthly * 12).toBeCloseTo(83, 6);
    expect(summarizeFixed([{ ...evo, periodicity: 'unico' }], d).oneOffTotal).toBe(83);
  });
});

describe('Bloque III — llamadas', () => {
  it('las llamadas NO se multiplican por sucursales ni empleados en modo total', () => {
    const { v, e } = demoVoice();
    const a = computeVoice(v, e, 1);
    const b = computeVoice(v, e, 20);
    expect(a.totalAIMin).toBe(b.totalAIMin);
    const s1 = clone();
    const s2 = clone();
    s2.general.employees = 100;
    s2.general.branches = 20;
    expect(simulate(s1).voice.totalAIMin).toBe(simulate(s2).voice.totalAIMin);
  });

  it('el modo por sucursal multiplica explícitamente y respeta los límites', () => {
    const { v } = demoVoice();
    const vol = callVolumes({ ...v, callMode: 'por_sucursal', inboundPerBranch: 300, outboundPerBranch: 80 }, 20);
    expect(vol.perBranch).toBe(true);
    expect(vol.inbound).toBe(5000); // 6.000 → límite 5.000
    expect(vol.outbound).toBe(1000); // 1.600 → límite 1.000
  });

  it('reintentos de llamadas fallidas suman minutos', () => {
    const { v, e } = demoVoice();
    const r = computeVoice({ ...v, failedPct: 50, retriesPerFailed: 2, failedAttemptMin: 0.5 }, e, 1);
    expect(r.retryMin).toBe(200 * 0.5 * 2 * 0.5);
  });
});

describe('ElevenLabs + Retell — sin doble facturación', () => {
  it('modo integrado: no hay excedente de ElevenLabs y Retell cobra la tarifa completa', () => {
    const { v, e } = demoVoice();
    const r = computeVoice(v, { ...e, mode: 'integrado' }, 1);
    expect(r.elevenOverage).toBe(0);
    expect(r.elevenMinutes).toBe(0);
    expect(r.retellUsage).toBeCloseTo(3400 * 0.159, 6);
  });

  it('modo independiente: se descuenta el componente de voz de Retell', () => {
    const { v, e } = demoVoice();
    const r = computeVoice(v, { ...e, mode: 'independiente', retellVoiceComponentPerMin: 0.07 }, 1);
    expect(r.retellUsage).toBeCloseTo(3400 * (0.159 - 0.07), 6);
    const plan = e.plans.find((p) => p.id === e.planId)!;
    expect(r.elevenOverage).toBeCloseTo((3400 - plan.includedMinutes) * plan.overagePerMin, 6);
    // Nunca se paga tarifa Retell completa + ElevenLabs completo por el mismo minuto
    expect(r.retellUsage + r.elevenOverage).toBeLessThan(3400 * 0.159 + 3400 * plan.overagePerMin);
  });

  it('modo mixto: los minutos se reparten y suman el total', () => {
    const { v, e } = demoVoice();
    const r = computeVoice(v, { ...e, mode: 'mixto', mixSharePct: 25 }, 1);
    expect(r.elevenMinutes).toBeCloseTo(850, 6);
    expect(r.integratedMinutes + r.elevenMinutes).toBeCloseTo(3400, 6);
  });

  it('los minutos incluidos de ElevenLabs no se descuentan del consumo de Retell en modo integrado', () => {
    const { v, e } = demoVoice();
    const r = computeVoice(v, { ...e, mode: 'integrado', subscriptionActive: true }, 1);
    expect(r.retellUsage).toBeCloseTo(3400 * 0.159, 6);
    expect(r.elevenSubscription).toBe(6);
  });
});

describe('WhatsApp', () => {
  it('cobra por mensaje facturable por categoría; servicio y utilidad en ventana no se facturan', () => {
    const wa = structuredClone(BASE_SCENARIO.whatsapp);
    wa.volumes = { marketing: 100, utilidad: 100, autenticacion: 0, servicio: 1000 };
    wa.utilityInWindowPct = 50;
    const r = computeWhatsApp(wa);
    expect(r.metaTotal).toBeCloseTo(100 * 0.0618 + 50 * 0.026, 6);
    expect(r.lines.find((l) => l.category === 'servicio')!.cost).toBe(0);
  });

  it('no aplica tarifas sin fecha o sin categoría y lo informa', () => {
    const wa = structuredClone(BASE_SCENARIO.whatsapp);
    wa.rates = wa.rates.map((r) => (r.country === 'Argentina' && r.category === 'marketing' ? { ...r, effectiveDate: null } : r));
    const r = computeWhatsApp(wa);
    expect(r.lines.find((l) => l.category === 'marketing')!.cost).toBe(0);
    expect(r.issues.some((i) => i.includes('sin fecha'))).toBe(true);
    expect(isRateUsable({ ...wa.rates[0], category: '' })).toBe(false);
  });

  it('canal no oficial: sin cargos de Meta pero con aviso de riesgo', () => {
    const wa = { ...structuredClone(BASE_SCENARIO.whatsapp), channel: 'no_oficial' as const };
    const r = computeWhatsApp(wa);
    expect(r.metaTotal).toBe(0);
    expect(r.issues.length).toBeGreaterThan(0);
  });
});

describe('Valor económico', () => {
  const drivers = { inboundCalls: 1000, aiCallPct: 90, waInbound: 500, waAiPct: 90, transferPct: 20, adoptionPct: 100, branches: 10 };

  it('con plantilla constante, las horas liberadas NO son ahorro de nómina', () => {
    const v = computeValue({ ...BASE_SCENARIO.value, staffKept: true, capacityTreatment: 'no_monetizar', avoidableCostsMonthly: 0 }, drivers);
    expect(v.freedHoursMonthly).toBeGreaterThan(0);
    expect(v.avoidableSavingsMonthly).toBe(0);
    expect(v.capacityMonetizedMonthly).toBe(0);
    expect(v.capacityNotMonetizedMonthly).toBeCloseTo(v.freedHoursValueMonthly, 6);
  });

  it('si se reduce estructura, las horas liberadas son costo evitable', () => {
    const v = computeValue({ ...BASE_SCENARIO.value, staffKept: false, avoidableCostsMonthly: 0, adoptionDependencyPct: 0 }, drivers);
    expect(v.avoidableSavingsMonthly).toBeCloseTo(v.freedHoursValueMonthly, 6);
    expect(v.capacityMonetizedMonthly).toBe(0);
  });

  it('capacidad ya reflejada en ventas no se cuenta dos veces', () => {
    const v = computeValue({ ...BASE_SCENARIO.value, staffKept: true, capacityTreatment: 'ya_en_ventas' }, drivers);
    expect(v.capacityMonetizedMonthly).toBe(0);
  });

  it('la contribución usa margen por operación, no facturación', () => {
    const v = computeValue({ ...BASE_SCENARIO.value, adoptionDependencyPct: 0 }, drivers);
    expect(v.margin).toBe(4500);
    expect(v.contributionMonthly).toBeCloseTo(v.extraOperations * 4500, 6);
  });

  it('factor de adopción explícito', () => {
    expect(adoptionFactor(40, 50)).toBeCloseTo(0.8, 6);
    expect(adoptionFactor(0, 0)).toBe(1);
  });

  it('modo presentación: 30.000 brutos, el neto descuenta el OpEx', () => {
    const s = clone();
    s.value.benefitMode = 'presentacion';
    const r = simulate(s);
    expect(r.value.grossAnnual).toBeCloseTo(30000, 6);
    expect(r.finance.netAnnualSteady).toBeCloseTo(30000 - r.consolidated.opexAnnualSteady, 6);
    expect(r.finance.netAnnualSteady).toBeLessThan(30000);
  });
});

describe('Finanzas', () => {
  it('ROI = (B − C) / C × 100', () => {
    expect(roi(150, 100)).toBe(50);
    expect(roi(50, 100)).toBe(-50);
    expect(roi(100, 0)).toBeNull();
  });

  it('payback y VAN/TIR', () => {
    const flows = [-1000, 300, 300, 300, 300];
    expect(paybackMonth(flows)).toBe(5);
    expect(paybackMonth([-100, 10, 10])).toBeNull();
    expect(npv(0, flows)).toBeCloseTo(200, 6);
    const irr = irrAnnual(flows)!;
    // A la TIR, el VAN es ≈ 0
    expect(npv(irr, flows)).toBeCloseTo(0, 3);
    expect(irrAnnual([100, 100])).toBeNull();
  });

  it('pregunta de equilibrio determinista', () => {
    const b = breakEven(48000, 12000, 2000, 36);
    expect(b.gapToCover).toBe(36000);
    expect(b.operationsTotal).toBe(18);
    expect(b.operationsPerMonth).toBeCloseTo(0.5, 6);
    expect(b.verifiableSavingsPerMonth).toBeCloseTo(48000 / 36, 6);
    expect(breakEven(1000, 0, 0, 12).operationsTotal).toBeNull();
  });

  it('costo del año 1 = inversión inicial + OpEx anual; la caja del año 1 respeta arranques y rampas', () => {
    const r = simulate(clone());
    expect(r.consolidated.costYear1).toBeCloseTo(r.consolidated.initialInvestment + r.consolidated.opexAnnualSteady, 6);
    const sum12 = r.months.slice(0, 12).reduce((a, m) => a + m.totalCost, 0);
    expect(r.consolidated.cashYear1).toBeCloseTo(sum12, 6);
    const ramp = clone();
    ramp.rollout = { whatsappStartMonth: 2, voiceStartMonth: 4, rampMonths: 3, benefitStartMonth: 3, benefitRampMonths: 6 };
    const rr = simulate(ramp);
    expect(rr.consolidated.cashYear1).toBeLessThan(rr.consolidated.costYear1);
  });

  it('el ROI del simulador coincide con la fórmula sobre la serie', () => {
    const r = simulate(clone());
    const H = r.input.general.horizonMonths;
    const B = r.months.slice(0, H).reduce((a, m) => a + m.benefits, 0);
    const C = r.months.slice(0, H).reduce((a, m) => a + m.totalCost, 0);
    expect(r.finance.roiHorizon).toBeCloseTo(((B - C) / C) * 100, 6);
  });
});

describe('Robustez', () => {
  it('división por cero → null, nunca Infinity', () => {
    expect(safeDiv(1, 0)).toBeNull();
    const s = clone();
    s.value.averagePrice = 0;
    s.voice.enabled = false;
    s.whatsapp.enabled = false;
    const r = simulate(s);
    expect(r.consolidated.costPerAICall).toBeNull();
    expect(r.consolidated.costPerUsefulLead === null || Number.isFinite(r.consolidated.costPerUsefulLead)).toBe(true);
    expect(r.finance.opsToCoverOpexMonthly).toBeNull();
    for (const m of r.months) expect(Number.isFinite(m.totalCost)).toBe(true);
  });

  it('valores fuera de rango se acotan', () => {
    const s = clone();
    s.general.employees = 500;
    s.general.branches = 0;
    s.voice.inboundCalls = 99999;
    s.voice.outboundCalls = -5;
    s.voice.aiHandledPct = 150;
    const c = sanitize(s);
    expect(c.general.employees).toBe(100);
    expect(c.general.branches).toBe(1);
    expect(c.voice.inboundCalls).toBe(5000);
    expect(c.voice.outboundCalls).toBe(1);
    expect(c.voice.aiHandledPct).toBe(100);
  });

  it('un resultado negativo se clasifica y formatea como pérdida', () => {
    expect(classifyResult(-10)).toBe('perdida');
    expect(classifyResult(10)).toBe('ganancia');
    expect(classifyResult(null)).toBe('neutro');
    expect(fmtUSD(-1234.5).startsWith('−')).toBe(true);
  });

  it('el ROI negativo genera alerta crítica', () => {
    const s = clone();
    s.value.averagePrice = 0;
    s.value.capacityTreatment = 'no_monetizar';
    const r = simulate(s);
    expect(r.finance.roiHorizon!).toBeLessThan(0);
    expect(computeAlerts(r).some((a) => a.id === 'roi' && a.level === 'critica')).toBe(true);
  });

  it('el motor es determinista', () => {
    const a = simulate(clone());
    const b = simulate(clone());
    expect(a.finance).toEqual(b.finance);
  });
});

describe('Cultura y gobernanza', () => {
  it('el índice medido es null si faltan mediciones (no se inventan datos)', () => {
    const idx = compositeIndex(BASE_SCENARIO.culture.indicators, 'measured');
    expect(idx.value).toBeNull();
    expect(idx.missing.length).toBeGreaterThan(0);
  });

  it('índice ponderado con inversión de indicadores "menor es mejor"', () => {
    const inds = [
      { id: 'a', label: 'A', baseline: 80, target: 80, measured: 80, weight: 1, invert: false, description: '' },
      { id: 'b', label: 'B', baseline: 20, target: 20, measured: 20, weight: 1, invert: true, description: '' },
    ];
    expect(compositeIndex(inds, 'measured').value).toBeCloseTo(80, 6);
  });

  it('puertas de decisión por umbrales', () => {
    const base = BASE_SCENARIO.governance.criteria;
    expect(gateDecision(base).decision).toBe('Continuar piloto');
    const ok = base.map((c) => ({ ...c, measured: c.operator === '>=' ? c.threshold + 1 : c.threshold }));
    expect(gateDecision(ok).decision).toBe('Escalar');
    const fixable = ok.map((c) => (c.id === 'g2' ? { ...c, measured: 80 } : c));
    expect(gateDecision(fixable).decision).toBe('Corregir');
    const kill = ok.map((c) => (c.id === 'g5' ? { ...c, measured: 1 } : c));
    expect(gateDecision(kill).decision).toBe('Suspender');
  });
});

describe('Escenarios y alternativas', () => {
  it('dos escenarios: mismos costos, el optimista con más beneficio', () => {
    expect(DEFAULT_SCENARIOS.map((s) => s.name)).toEqual(['Conservador', 'Optimista']);
    const [c, o] = DEFAULT_SCENARIOS.map((s) => simulate(s));
    expect(c.consolidated.costYear1).toBeCloseTo(o.consolidated.costYear1, 6);
    expect(c.finance.netHorizon).toBeLessThan(o.finance.netHorizon);
  });

  it('sistema actual: costo y beneficio incremental cero', () => {
    const r = simulate(applyAlternative(clone(), 'actual'));
    expect(r.consolidated.costHorizon).toBe(0);
    expect(r.finance.benefitsHorizon).toBe(0);
  });

  it('IA parcial: sin costo de voz', () => {
    const r = simulate(applyAlternative(clone(), 'parcial'));
    expect(r.voice.variableTotal).toBe(0);
    expect(r.capex.totalOneTime).toBeLessThan(25000);
  });

  it('sensibilidad devuelve las 8 variables pedidas', () => {
    const rows = sensitivity(clone(), 20);
    expect(rows).toHaveLength(8);
    const tarifa = rows.find((r) => r.id === 'tarifa')!;
    expect(tarifa.high!).toBeLessThan(tarifa.low!); // tarifa más cara → menor ROI
  });
});

describe('Exportación', () => {
  it('el CSV incluye resumen, serie de 36 meses y supuestos no confirmados', async () => {
    const { buildCsv } = await import('../export/export');
    const csv = buildCsv(simulate(clone()));
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('"Mes 36"');
    expect(csv).toContain('DATOS NO CONFIRMADOS');
    expect(csv).toContain('"Inversión inicial";25000,00');
  });
});

describe('Cifras pedidas para la defensa (presentación + informe AMBA)', () => {
  it('inversión inicial 25.000 + OpEx anual 22.000 = costo año 1 47.000', () => {
    for (const sc of DEFAULT_SCENARIOS) {
      const c = simulate(sc).consolidated;
      expect(c.initialInvestment).toBe(25000);
      expect(Math.round(c.opexAnnualSteady)).toBe(22000);
      expect(Math.round(c.costYear1)).toBe(47000);
      expect(Math.round((c.fixedMonthly + c.semifixedMonthly) * 12)).toBe(14983);
    }
  });

  it('contribución por venta 6.000 × (1 − 25%) = 4.500; después del 35%: 2.925', () => {
    const v = simulate(clone()).value;
    expect(v.margin).toBe(4500);
    expect(v.marginAfterTax).toBeCloseTo(2925, 6);
  });

  it('conservador: 9 ventas adicionales/año → beneficio bruto 40.500; optimista: 18 → 81.000', () => {
    const [c, o] = DEFAULT_SCENARIOS.map((s) => simulate(s));
    expect(c.value.extraOperations * 12).toBeCloseTo(9, 6);
    expect(c.value.grossAnnual).toBeCloseTo(40500, 6);
    expect(o.value.extraOperations * 12).toBeCloseTo(18, 6);
    expect(o.value.grossAnnual).toBeCloseTo(81000, 6);
  });

  it('ventas para recuperar 47.000: 11 antes de impuestos y 17 después (9 por año en 24 meses)', () => {
    const rec = simulate(clone()).finance.recovery;
    expect(rec.salesPreTax).toBe(11);
    expect(rec.salesAfterTax).toBe(17);
    expect(rec.salesPerYearAfterTax).toBe(9);
  });
});

describe('Recuperación', () => {
  it('si el flujo acumulado nunca es negativo, se recupera en el mes 1', () => {
    expect(paybackMonth([10, 10])).toBe(1);
  });

  it('conservador recupera dentro de 24 meses y optimista antes', () => {
    const [c, o] = DEFAULT_SCENARIOS.map((s) => simulate(s).finance.paybackMonth);
    expect(c).not.toBeNull();
    expect(c!).toBeLessThanOrEqual(24);
    expect(o!).toBeLessThan(c!);
  });
});

describe('Índice cultural objetivo', () => {
  it('conservador: el índice objetivo es 79,9', () => {
    const r = simulate(DEFAULT_SCENARIOS[0]);
    expect(Math.round(r.cultureIndex.target.value! * 10) / 10).toBe(79.9);
  });
});
