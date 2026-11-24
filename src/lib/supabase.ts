import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() || '';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

const rawWhatsappNumber = (
  (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined)?.trim() || ''
).replace(/[^0-9]/g, '');

export const APP_CONFIG = {
  supabaseUrl,
  supabaseAnonKey,
  whatsappNumber:
    !rawWhatsappNumber || rawWhatsappNumber === '234813133815'
      ? '2348135133815'
      : rawWhatsappNumber,
  priceUsd: Number(import.meta.env.VITE_PRICE_USD || 150),
  anchorPriceUsd: import.meta.env.VITE_ANCHOR_PRICE_USD
    ? Number(import.meta.env.VITE_ANCHOR_PRICE_USD)
    : null,
};
