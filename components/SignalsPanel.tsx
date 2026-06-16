"use client";

import React, { useState, useEffect } from "react";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";
import { getLocalSignalSettings, saveLocalSignalSettings, SignalSettings } from "@/app/utils/supabase";
import { Bell, ShieldAlert, CheckCircle, HelpCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SignalsPanel() {
  const { subscriptionTier, setSubscriptionTier } = useThemeAuth();
  const isPremium = subscriptionTier === "premium";

  const [selectedAsset, setSelectedAsset] = useState<"BTC" | "BBCA" | "WBSA">("BTC");
  const [whatsapp, setWhatsapp] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [dca, setDca] = useState<"off" | "daily" | "weekly" | "monthly">("off");

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Load existing settings when selected asset changes
  useEffect(() => {
    const settings = getLocalSignalSettings(selectedAsset);
    if (settings) {
      setWhatsapp(settings.whatsapp_number);
      setTakeProfit(settings.take_profit.toString());
      setStopLoss(settings.stop_loss.toString());
      setDca(settings.dca_frequency);
    } else {
      setWhatsapp("");
      setTakeProfit("");
      setStopLoss("");
      setDca("off");
    }
    setSuccessMsg("");
    setErrorMsg("");
  }, [selectedAsset]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!isPremium) {
      setErrorMsg("Gagal: Fitur notifikasi WhatsApp hanya tersedia untuk anggota Premium.");
      return;
    }

    if (!whatsapp) {
      setErrorMsg("Nomor WhatsApp wajib diisi.");
      return;
    }

    if (!whatsapp.startsWith("+") && !/^\d+$/.test(whatsapp)) {
      setErrorMsg("Format nomor WhatsApp tidak valid. Gunakan format internasional (contoh: 62812345678).");
      return;
    }

    setIsSaving(true);
    // Simulate Supabase API save latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    const settings: SignalSettings = {
      whatsapp_number: whatsapp,
      symbol: selectedAsset,
      take_profit: takeProfit ? parseFloat(takeProfit) : 0,
      stop_loss: stopLoss ? parseFloat(stopLoss) : 0,
      dca_frequency: dca,
    };

    saveLocalSignalSettings(selectedAsset, settings);
    setIsSaving(false);
    setSuccessMsg(`Konfigurasi sinyal untuk ${selectedAsset} berhasil disimpan! Anda akan menerima notifikasi di ${whatsapp}.`);
  };

  return (
    <div className="space-y-6">

      {/* Premium Alert Indicator Banner */}
      {!isPremium && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 flex items-start gap-4 animate-in fade-in duration-200">
          <ShieldAlert className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-foreground">Akses Premium Terkunci</h4>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              Anda saat ini terdaftar di paket **Free**. Sinyal otomatis melalui WhatsApp, Take Profit/Stop Loss real-time alerts, dan notifikasi DCA mingguan hanya tersedia untuk pengguna **Premium**.
            </p>
            <button
              onClick={() => setSubscriptionTier("premium")}
              className="mt-3.5 rounded-full bg-brand-green py-2 px-5 text-xs font-bold text-white shadow-md shadow-brand-green/20 hover:opacity-95 transition cursor-pointer"
            >
              Tingkatkan ke Premium Sekarang
            </button>
          </div>
        </div>
      )}

      {/* Main Signal Form */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border pb-4 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-green to-emerald-600 text-white shadow-[0_4px_10px_rgba(16,185,129,0.3)] border border-white/20 shrink-0">
            <Bell className="h-5 w-5 drop-shadow-md" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Konfigurasi Parameter WhatsApp Signal</h3>
        </div>

        <form onSubmit={handleSave} className="space-y-5">

          {/* Form Overlay in case of Free Tier */}
          {!isPremium && (
            <div className="absolute inset-x-0 bottom-0 top-14 z-20 bg-card/60 backdrop-blur-2xs cursor-not-allowed select-none" />
          )}

          {/* Select Asset */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Pilih Aset Investasi</label>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value as "BTC" | "BBCA" | "WBSA")}
              className="block w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:outline-none focus:border-brand-green"
            >
              <option value="BTC">Bitcoin (BTC)</option>
              <option value="BBCA">Bank Central Asia (BBCA)</option>
              <option value="WBSA">Wahana Buana Samudra (WBSA)</option>
            </select>
          </div>

          {/* WhatsApp Number */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Nomor WhatsApp Penerima</label>
            <input
              type="text"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Contoh: 628123456789 (gunakan kode negara)"
              disabled={!isPremium}
              className="block w-full rounded-lg border border-border bg-background py-2 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-brand-green disabled:opacity-50"
            />
          </div>

          {/* Risk Alert Parameters (Take Profit & Stop Loss) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Take Profit (Target Harga)</label>
              <input
                type="number"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder={selectedAsset === "BTC" ? "Contoh: 75000" : "Contoh: 11000"}
                disabled={!isPremium}
                className="block w-full rounded-lg border border-border bg-background py-2 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-brand-green disabled:opacity-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Stop Loss (Batas Pengaman)</label>
              <input
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder={selectedAsset === "BTC" ? "Contoh: 60000" : "Contoh: 9800"}
                disabled={!isPremium}
                className="block w-full rounded-lg border border-border bg-background py-2 px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-brand-green disabled:opacity-50"
              />
            </div>
          </div>

          {/* DCA Frequency Select */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Frekuensi Cicil (Dollar-Cost Averaging - DCA)</label>
            <select
              value={dca}
              onChange={(e) => setDca(e.target.value as "off" | "daily" | "weekly" | "monthly")}
              disabled={!isPremium}
              className="block w-full rounded-lg border border-border bg-background py-2 px-3 text-sm focus:outline-none focus:border-brand-green disabled:opacity-50"
            >
              <option value="off">Mati (Off)</option>
              <option value="daily">Setiap Hari (Daily)</option>
              <option value="weekly">Setiap Minggu (Weekly)</option>
              <option value="monthly">Setiap Bulan (Monthly)</option>
            </select>
          </div>

          {/* Status Message */}
          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-start gap-2.5 text-xs text-emerald-500 font-medium"
              >
                <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </motion.div>
            )}

            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2.5 text-xs text-destructive font-medium"
              >
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Button */}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSaving || !isPremium}
              className="rounded-lg bg-brand-green text-white font-bold py-2.5 px-6 text-xs transition cursor-pointer disabled:opacity-50 hover:bg-opacity-95 shadow-md flex items-center justify-center min-w-[140px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin h-3.5 w-3.5 mr-1.5" />
                  Menyimpan...
                </>
              ) : (
                "Simpan Konfigurasi"
              )}
            </button>
          </div>

        </form>
      </div>

      {/* Legal Disclaimer Banner */}
      <div className="rounded-2xl border border-border bg-muted/40 p-5 flex items-start gap-4">
        <HelpCircle className="h-5.5 w-5.5 text-muted-foreground shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Peringatan Risiko & Disclaimer Legal</h4>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Semua pemberitahuan sinyal, alert Take Profit (TP), dan rekomendasi DCA yang dihasilkan oleh **FinPulse** didasarkan pada kalkulasi algoritma statistik komputer yang bersifat probabilitas. Sinyal ini **BUKAN** merupakan jaminan keuntungan absolut, melainkan probabilitas matematika semata. FinPulse tidak bertanggung jawab atas kerugian modal yang dialami pengguna. Pengguna wajib melakukan analisis fundamental dan teknikal mandiri (*Do Your Own Research - DYOR*) sebelum melakukan aksi beli atau jual aset di pasar keuangan.
          </p>
        </div>
      </div>

    </div>
  );
}
