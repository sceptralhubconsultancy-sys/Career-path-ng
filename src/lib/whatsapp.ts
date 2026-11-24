import { APP_CONFIG } from './supabase';

export interface WhatsAppMessageParams {
  firstName: string;
  chosenPath: string;
  leadId: string;
  priceUsd?: number;
}

export function buildWhatsAppMessage({
  firstName,
  chosenPath,
  leadId,
  priceUsd = APP_CONFIG.priceUsd,
}: WhatsAppMessageParams): string {
  const safeName = firstName.trim() || 'there';
  const safePath = chosenPath.trim() || 'my recommended career path';
  return `Hi, I'm ${safeName}. I completed the PathShift assessment and I'm most interested in ${safePath}. I'd like the $${priceUsd} 3-month career transition coaching. My reference: ${leadId}`;
}

export function buildWhatsAppUrl(params: WhatsAppMessageParams): string {
  const number = APP_CONFIG.whatsappNumber;
  const message = buildWhatsAppMessage(params);
  const encoded = encodeURIComponent(message);
  if (!number) {
    return `https://wa.me/?text=${encoded}`;
  }
  return `https://wa.me/${number}?text=${encoded}`;
}
