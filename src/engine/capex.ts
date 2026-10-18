import type { CapexActivity, Stage } from './types';
import { sum } from './money';

/** Costo de actividad = Horas × Tarifa horaria + Costos externos. */
export function activityCost(a: CapexActivity): number {
  return Math.max(0, a.hours) * Math.max(0, a.hourlyRate) + Math.max(0, a.externalCost);
}

/**
 * Actividades que cuentan como inversión.
 * Si la formación inicial NO está incluida en CapEx, las partidas marcadas como formación
 * se excluyen y el costo lo aporta el bloque de capacitación (evita doble conteo).
 */
export function countedActivities(activities: CapexActivity[], trainingIncludedInCapex: boolean): CapexActivity[] {
  return activities.filter((a) => trainingIncludedInCapex || !a.isTraining);
}

export interface StageTotal {
  stageId: number;
  name: string;
  quarter: string;
  oneTime: number;
  recurringMonthly: number;
  activities: number;
}

export interface CapexSummary {
  stages: StageTotal[];
  /** Inversión de implementación (partidas únicas). */
  totalOneTime: number;
  /** Partidas recurrentes de las etapas (mensual, van a OpEx). */
  recurringMonthly: number;
  /** Partidas de formación dentro del CapEx (contadas o no). */
  trainingInCapex: number;
  /** Desembolso único por mes (índice 0 = mes 1). */
  oneTimeByMonth: (month: number) => number;
  recurringByMonth: (month: number) => number;
}

export function summarizeCapex(stages: Stage[], activities: CapexActivity[], trainingIncludedInCapex: boolean): CapexSummary {
  const counted = countedActivities(activities, trainingIncludedInCapex);
  const unique = counted.filter((a) => a.recurrence === 'unico');
  const recurring = counted.filter((a) => a.recurrence === 'recurrente');

  const stageTotals: StageTotal[] = stages.map((s) => ({
    stageId: s.id,
    name: s.name,
    quarter: s.quarter,
    oneTime: sum(unique.filter((a) => a.stageId === s.id).map(activityCost)),
    recurringMonthly: sum(recurring.filter((a) => a.stageId === s.id).map(activityCost)),
    activities: counted.filter((a) => a.stageId === s.id).length,
  }));

  return {
    stages: stageTotals,
    totalOneTime: sum(unique.map(activityCost)),
    recurringMonthly: sum(recurring.map(activityCost)),
    trainingInCapex: sum(activities.filter((a) => a.isTraining).map(activityCost)),
    oneTimeByMonth: (m) => sum(unique.filter((a) => a.month === m).map(activityCost)),
    recurringByMonth: (m) => sum(recurring.filter((a) => a.month <= m).map(activityCost)),
  };
}

/** Detecta dependencias imposibles: una etapa programada antes que una etapa de la que depende. */
export function dependencyIssues(stages: Stage[], activities: CapexActivity[]): string[] {
  const firstMonth = (stageId: number) => {
    const months = activities.filter((a) => a.stageId === stageId).map((a) => a.month);
    return months.length ? Math.min(...months) : null;
  };
  const issues: string[] = [];
  for (const s of stages) {
    const start = firstMonth(s.id);
    if (start === null) continue;
    for (const dep of s.dependsOn) {
      const depStart = firstMonth(dep);
      if (depStart !== null && depStart > start) {
        issues.push(`La etapa ${s.id} comienza (mes ${start}) antes que la etapa ${dep} de la que depende (mes ${depStart}).`);
      }
    }
  }
  return issues;
}
