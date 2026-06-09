import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

export const isSupabaseConfigured = 
  process.env.NEXT_PUBLIC_SUPABASE_URL !== undefined && 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== undefined;

if (!isSupabaseConfigured) {
  console.warn(
    "Warning: Supabase keys are not configured. ArthaVerse is running in local developer mock mode."
  );
}

// Initialize Supabase Client (uses placeholder strings if env is missing to prevent build crashes)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// --- Local Mock Fallback Functions for Development Persistence ---

export interface SignalSettings {
  whatsapp_number: string;
  symbol: string;
  take_profit: number;
  stop_loss: number;
  dca_frequency: "off" | "daily" | "weekly" | "monthly";
}

export const getLocalSignalSettings = (symbol: string): SignalSettings | null => {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem(`finpulse_signals_${symbol}`);
  return saved ? JSON.parse(saved) : null;
};

export const saveLocalSignalSettings = (symbol: string, settings: SignalSettings) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(`finpulse_signals_${symbol}`, JSON.stringify(settings));
};

export const getLocalWatchlist = (): string[] => {
  if (typeof window === "undefined") return [];
  const saved = localStorage.getItem("finpulse_watchlist");
  return saved ? JSON.parse(saved) : ["BTC", "BBCA"];
};

export const saveLocalWatchlist = (symbols: string[]) => {
  if (typeof window === "undefined") return;
  localStorage.setItem("finpulse_watchlist", JSON.stringify(symbols));
};
