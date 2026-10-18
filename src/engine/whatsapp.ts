import type { WaCategory, WaRate, WhatsAppConfig } from './types';
import { clamp } from './money';

export const WA_CATEGORIES: WaCategory[] = ['marketing', 'utilidad', 'autenticacion', 'servicio'];

export const WA_LABELS: Record<WaCategory, string> = {
  marketing: 'Marketing',
  utilidad: 'Utilidad',
  autenticacion: 'Autenticación',
  servicio: 'Servicio (respuesta dentro de ventana)',
};

/** Una tarifa sólo puede usarse si tiene categoría y fecha de vigencia. */
export function isRateUsable(r: WaRate): boolean {
  return r.category !== '' && !!r.effectiveDate && Number.isFinite(r.pricePerMessage) && r.pricePerMessage >= 0;
}

export function findRate(rates: WaRate[], country: string, category: WaCategory): WaRate | undefined {
  return rates.find((r) => r.country === country && r.category === category);
}

export interface WaCategoryLine {
  category: WaCategory;
  sent: number;
  billable: number;
  price: number | null;
  cost: number;
  rate?: WaRate;
  issue?: string;
}

export interface WhatsAppResult {
  lines: WaCategoryLine[];
  metaTotal: number;
  providerTotal: number;
  total: number;
  billableMessages: number;
  issues: string[];
  aiConversations: number;
}

/**
 * Costo = Σ mensajes facturables por categoría × tarifa aplicable (país, categoría).
 * - Los mensajes de servicio (respuestas libres dentro de la ventana de atención) no se facturan.
 * - Las plantillas de utilidad enviadas dentro de una ventana abierta no se facturan.
 * - No se usa una tarifa única por conversación.
 * - Una tarifa sin fecha o sin categoría no se aplica y genera un aviso.
 */
export function computeWhatsApp(cfg: WhatsAppConfig): WhatsAppResult {
  const issues: string[] = [];
  const aiConversations = cfg.enabled ? Math.max(0, cfg.inboundConversations) * clamp(cfg.aiCoveragePct, 0, 100) / 100 : 0;
  if (!cfg.enabled) {
    return { lines: [], metaTotal: 0, providerTotal: 0, total: 0, billableMessages: 0, issues, aiConversations };
  }

  const inWindow = clamp(cfg.utilityInWindowPct, 0, 100) / 100;
  const lines: WaCategoryLine[] = WA_CATEGORIES.map((category) => {
    const sent = Math.max(0, cfg.volumes[category] ?? 0);
    let billable = sent;
    if (category === 'servicio') billable = 0;
    if (category === 'utilidad') billable = sent * (1 - inWindow);

    if (cfg.channel === 'no_oficial') {
      return { category, sent, billable: 0, price: 0, cost: 0 };
    }
    if (billable === 0) return { category, sent, billable, price: 0, cost: 0 };

    const rate = findRate(cfg.rates, cfg.country, category);
    if (!rate) {
      const issue = `Falta tarifa de WhatsApp para ${cfg.country} / ${WA_LABELS[category]}.`;
      issues.push(issue);
      return { category, sent, billable, price: null, cost: 0, issue };
    }
    if (!isRateUsable(rate)) {
      const issue = `Tarifa de WhatsApp ${cfg.country} / ${WA_LABELS[category]} sin fecha de vigencia o categoría: no se aplica.`;
      issues.push(issue);
      return { category, sent, billable, price: null, cost: 0, rate, issue };
    }
    return { category, sent, billable, price: rate.pricePerMessage, cost: billable * rate.pricePerMessage, rate };
  });

  const metaTotal = lines.reduce((a, l) => a + l.cost, 0);
  const templatesSent = lines.filter((l) => l.category !== 'servicio').reduce((a, l) => a + l.sent, 0);
  const providerTotal = templatesSent * Math.max(0, cfg.providerFeePerMessage);
  if (cfg.channel === 'no_oficial') {
    issues.push('Canal WhatsApp no oficial (Evolution/Baileys): sin cargos de Meta, pero con riesgo de bloqueo por términos de uso.');
  }

  return {
    lines,
    metaTotal,
    providerTotal,
    total: metaTotal + providerTotal,
    billableMessages: lines.reduce((a, l) => a + l.billable, 0),
    issues,
    aiConversations,
  };
}
