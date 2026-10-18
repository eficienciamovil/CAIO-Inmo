import type { TrainingConfig } from './types';
import { sessionsNeeded } from './money';

export interface TrainingResult {
  participants: number;
  sessions: number;
  instructorCost: number;
  materialsCost: number;
  feesCost: number;
  /** Costo directo de la formación inicial (caja). */
  initialDirect: number;
  /** Horas de empleados × costo de oportunidad (no es caja). */
  opportunityCost: number;
  /** Importe inicial que efectivamente se suma al modelo (0 si ya está en CapEx). */
  initialCounted: number;
  refresherAnnual: number;
  newHires: number;
  newHiresAnnual: number;
  /** Formación recurrente (OpEx) anual y mensual. */
  recurringAnnual: number;
  recurringMonthly: number;
  includedInCapex: boolean;
}

export function computeTraining(cfg: TrainingConfig, employees: number): TrainingResult {
  const participants = Math.ceil(Math.max(0, employees) * Math.min(100, Math.max(0, cfg.pctToTrain)) / 100);
  const sessions = sessionsNeeded(participants, cfg.sessionCapacity);
  const instructorCost = sessions * cfg.hoursPerEmployee * cfg.instructorRate;
  const materialsCost = participants * cfg.materialsPerParticipant;
  const feesCost = participants * cfg.feePerParticipant;
  const initialDirect = instructorCost + materialsCost + feesCost;
  const opportunityCost = participants * cfg.hoursPerEmployee * cfg.opportunityCostPerHour;

  const initialEconomic = initialDirect + (cfg.includeOpportunityCost ? opportunityCost : 0);
  const initialCounted = cfg.includedInCapex ? 0 : initialEconomic;

  // Refuerzos: cada ronda vuelve a dictarse a todos los participantes.
  const refresherAnnual = cfg.refresherSessionsPerYear * sessions * cfg.refresherHours * cfg.instructorRate
    + (cfg.includeOpportunityCost ? cfg.refresherSessionsPerYear * participants * cfg.refresherHours * cfg.opportunityCostPerHour : 0);

  // Nuevas incorporaciones por rotación: reciben la formación inicial completa.
  const newHires = cfg.trainNewHires ? Math.ceil(participants * Math.max(0, cfg.turnoverPctAnnual) / 100) : 0;
  const newHireSessions = sessionsNeeded(newHires, cfg.sessionCapacity);
  const newHiresAnnual = newHireSessions * cfg.hoursPerEmployee * cfg.instructorRate
    + newHires * (cfg.materialsPerParticipant + cfg.feePerParticipant)
    + (cfg.includeOpportunityCost ? newHires * cfg.hoursPerEmployee * cfg.opportunityCostPerHour : 0);

  const recurringAnnual = refresherAnnual + newHiresAnnual;

  return {
    participants,
    sessions,
    instructorCost,
    materialsCost,
    feesCost,
    initialDirect,
    opportunityCost,
    initialCounted,
    refresherAnnual,
    newHires,
    newHiresAnnual,
    recurringAnnual,
    recurringMonthly: recurringAnnual / 12,
    includedInCapex: cfg.includedInCapex,
  };
}
