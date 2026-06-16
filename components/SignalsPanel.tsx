"use client";

import React, { useState, useEffect } from "react";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";
import { getLocalSignalSettings, saveLocalSignalSettings, SignalSettings } from "@/app/utils/supabase";
import { Bell, ShieldAlert, CheckCircle, HelpCircle, Loader2, Send, TrendingUp, Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { fetchCryptoPrice, fetchActiveCryptoPairs } from "@/src/lib/binance";
import { fetchStockPriceFromYahoo, stockTickers } from "@/src/lib/stocks";
import { GOLD_INSTRUMENTS } from "@/components/GoldPanel";

type AssetType = "crypto" | "stock" | "gold";

interface AssetOption {
  id: string;
  name: string;
  type: AssetType;
  short: string;
}

const IDX_ASSETS: AssetOption[] = Object.entries(stockTickers).map(([sym, info]) => ({
  id: sym,
  name: info.name,
  type: "stock",
  short: sym,
}));

const GOLD_ASSETS: AssetOption[] = GOLD_INSTRUMENTS.map((g) => ({
  id: g.symbol,
  name: g.label,
  type: "gold",
  short: g.symbol.replace("=F", "").replace(".JK", ""),
}));

export default function SignalsPanel() {
  const { subscriptionTier, setSubscriptionTier } = useThemeAuth();
  const isPremium = subscriptionTier === "premium";

  const [cryptoAssets, setCryptoAssets] = useState<AssetOption[]>([
    { id: "BTCUSDT", name: "Bitcoin", type: "crypto", short: "BTC" }
  ]);

  useEffect(() => {
    fetchActiveCryptoPairs()
      .then(pairs => {
        setCryptoAssets(pairs.map(p => ({
          id: p,
          name: p,
          type: "crypto",
          short: p.endsWith("USDT") ? p.replace("USDT", "") : p
        })));
      })
      .catch(err => console.warn("Failed to fetch crypto pairs", err));
  }, []);

  const ALL_ASSETS = [...cryptoAssets, ...IDX_ASSETS, ...GOLD_ASSETS];

  // Default selected asset
  const [selectedAssetId, setSelectedAssetId] = useState<string>("BTCUSDT");
  const selectedAsset = ALL_ASSETS.find((a) => a.id === selectedAssetId || a.short === selectedAssetId) || ALL_ASSETS[0];

  const [whatsapp, setWhatsapp] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [dca, setDca] = useState<"off" | "daily" | "weekly" | "monthly">("off");

  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  // Realtime prices for modal
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [isLoadingPrice, setIsLoadingPrice] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [marketTab, setMarketTab] = useState<"crypto" | "stock" | "gold">("crypto");

  useEffect(() => {
    const settings = getLocalSignalSettings(selectedAssetId);
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
    fetchPrice(selectedAsset);
  }, [selectedAssetId, selectedAsset.id]);

  const fetchPrice = async (asset: AssetOption) => {
    setIsLoadingPrice(true);
    try {
      if (asset.type === "crypto") {
        const price = await fetchCryptoPrice(asset.id);
        setLivePrice(price);
      } else {
        // works for both idx stocks and gold (fetchStockPriceFromYahoo uses generic yahoo api)
        let ticker = asset.id;
        if (asset.type === "stock" && !ticker.endsWith(".JK")) ticker = `${ticker}.JK`;
        const price = await fetchStockPriceFromYahoo(ticker);
        setLivePrice(price);
      }
    } catch (err) {
      console.warn(`Failed to fetch price for ${asset.id}`, err);
      setLivePrice(0);
    }
    setIsLoadingPrice(false);
  };

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

    if (!whatsapp.startsWith("+") && !/^[\d\+]+$/.test(whatsapp)) {
      setErrorMsg("Format nomor WhatsApp tidak valid. Gunakan format internasional (contoh: +62812345678).");
      return;
    }

    setIsSaving(true);
    // Simulate Supabase API save latency
    await new Promise((resolve) => setTimeout(resolve, 800));

    const settings: SignalSettings = {
      whatsapp_number: whatsapp,
      symbol: selectedAssetId,
      take_profit: takeProfit ? parseFloat(takeProfit) : 0,
      stop_loss: stopLoss ? parseFloat(stopLoss) : 0,
      dca_frequency: dca,
    };

    saveLocalSignalSettings(selectedAssetId, settings);
    setIsSaving(false);
    setSuccessMsg(`Konfigurasi sinyal untuk ${selectedAsset.short} berhasil disimpan! Anda akan menerima notifikasi di ${whatsapp}.`);
  };

  const handleTestSignal = () => {
    if (!whatsapp) {
      setErrorMsg("Isi nomor WhatsApp terlebih dahulu sebelum melakukan test.");
      return;
    }
    const cleanNumber = whatsapp.replace('+', '');
    const message = `*Alert FinPulse Test*\n\nSinyal aktif untuk aset: *${selectedAsset.short}*\nTarget TP: ${takeProfit || 'Tidak diset'}\nBatas SL: ${stopLoss || 'Tidak diset'}\nDCA: ${dca.toUpperCase()}\n\nJika ini adalah sinyal nyata, Anda akan mendapatkan notifikasi seperti ini secara otomatis.`;
    const url = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const formatCurrency = (val: number | null, type: AssetType) => {
    if (val === null) return "Loading...";
    if (type === "stock") {
      return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(val);
    }
    // Gold and Crypto usually in USD
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(val);
  };

  const handleNumberKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (["e", "E", "+", "-"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const currentAssetsList = marketTab === "crypto" ? cryptoAssets : marketTab === "stock" ? IDX_ASSETS : GOLD_ASSETS;
  const filteredAssets = currentAssetsList.filter(a => 
    a.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
    a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.short.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">

      {/* Premium Alert Indicator Banner */}
      {!isPremium && (
        <Alert variant="destructive" className="bg-amber-500/5 text-amber-500 border-amber-500/20">
          <ShieldAlert className="h-4 w-4 !text-amber-500" />
          <AlertTitle className="font-bold text-foreground">Akses Premium Terkunci</AlertTitle>
          <AlertDescription className="text-muted-foreground mt-1">
            Anda saat ini terdaftar di paket <strong>Free</strong>. Sinyal otomatis melalui WhatsApp, Take Profit/Stop Loss real-time alerts, dan notifikasi DCA mingguan hanya tersedia untuk pengguna <strong>Premium</strong>.
            <div className="mt-3">
              <button
                onClick={() => setSubscriptionTier("premium")}
                className="rounded-full bg-brand-green py-2 px-5 text-xs font-bold text-white shadow-md shadow-brand-green/20 hover:opacity-95 transition cursor-pointer"
              >
                Tingkatkan ke Premium Sekarang
              </button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Signal Form */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-green to-emerald-600 text-white shadow-[0_4px_10px_rgba(16,185,129,0.3)] border border-white/20 shrink-0">
              <Bell className="h-5 w-5 drop-shadow-md" />
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Konfigurasi WhatsApp Signal</h3>
          </div>
          <button
            type="button"
            onClick={handleTestSignal}
            className="flex items-center gap-1.5 rounded-lg border border-border bg-secondary/50 px-3 py-1.5 text-xs font-semibold hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            Test Signal
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6">

          {/* Form Overlay in case of Free Tier */}
          {!isPremium && (
            <div className="absolute inset-x-0 bottom-0 top-20 z-20 bg-card/60 backdrop-blur-sm cursor-not-allowed select-none" />
          )}

          {/* Asset Selection (Dialog Modal) */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pilih Aset Investasi</Label>
            <Dialog 
              open={modalOpen} 
              onOpenChange={(open) => {
                setModalOpen(open);
                if (open) setSearchQuery("");
              }}
              disablePointerDismissal={true} // Membuat modal statis
            >
              <DialogTrigger
                className="flex w-full items-center justify-between rounded-lg border border-border bg-background py-3 px-4 text-sm font-semibold hover:border-brand-green transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-brand-green" />
                  {selectedAsset.name} ({selectedAsset.short})
                </span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {isLoadingPrice ? (
                     <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <span className="font-mono font-bold text-foreground bg-secondary/50 px-2 py-1 rounded-md">
                      {formatCurrency(livePrice, selectedAsset.type)}
                    </span>
                  )}
                  <span className="bg-secondary px-2 py-1 rounded-md">Ubah Aset</span>
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md border-border bg-card">
                <DialogHeader>
                  <DialogTitle>Pilih Aset Investasi</DialogTitle>
                  <DialogDescription>
                    Pilih instrumen kripto, saham, atau emas yang ingin dikonfigurasi sinyalnya.
                  </DialogDescription>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex rounded-lg border border-border bg-background p-1 text-xs font-bold mt-2">
                  <button
                    type="button"
                    onClick={() => { setMarketTab("crypto"); setSearchQuery(""); }}
                    className={`flex-1 rounded-md py-1.5 transition cursor-pointer ${marketTab === "crypto" ? "bg-brand-green text-white" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Kripto
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMarketTab("stock"); setSearchQuery(""); }}
                    className={`flex-1 rounded-md py-1.5 transition cursor-pointer ${marketTab === "stock" ? "bg-brand-green text-white" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Saham
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMarketTab("gold"); setSearchQuery(""); }}
                    className={`flex-1 rounded-md py-1.5 transition cursor-pointer ${marketTab === "gold" ? "bg-brand-green text-white" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    Emas
                  </button>
                </div>

                {/* Search */}
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari aset..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-background"
                  />
                </div>

                {/* List */}
                <div className="max-h-[300px] overflow-y-auto space-y-1 py-2 pr-1 scrollbar-thin">
                  {filteredAssets.length === 0 ? (
                    <div className="text-center py-6 text-xs text-muted-foreground">Tidak ada aset ditemukan.</div>
                  ) : (
                    filteredAssets.map((asset) => (
                      <button
                        type="button"
                        key={asset.id}
                        onClick={() => {
                          setSelectedAssetId(asset.id);
                          setModalOpen(false);
                        }}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${selectedAssetId === asset.id || selectedAssetId === asset.short ? 'border-brand-green bg-brand-green/5' : 'border-border hover:border-muted-foreground/30 bg-background'}`}
                      >
                        <div className="text-left">
                          <p className="font-bold text-foreground text-sm">{asset.short}</p>
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">{asset.name}</p>
                        </div>
                        {(selectedAssetId === asset.id || selectedAssetId === asset.short) && (
                          <CheckCircle className="h-4 w-4 text-brand-green" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* WhatsApp Number */}
          <div className="space-y-2">
            <Label htmlFor="whatsapp" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nomor WhatsApp Penerima</Label>
            <Input
              id="whatsapp"
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Contoh: 6285174295981 (gunakan kode negara tanpa +)"
              disabled={!isPremium}
              className="bg-background"
            />
          </div>

          {/* Risk Alert Parameters (Take Profit & Stop Loss) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="tp" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Take Profit (Target Harga)</Label>
              <Input
                id="tp"
                type="number"
                onKeyDown={handleNumberKeyDown}
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                placeholder={selectedAsset.type === "stock" ? "Contoh: 11000" : "Contoh: 75000"}
                disabled={!isPremium}
                className="bg-background"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sl" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Stop Loss (Batas Pengaman)</Label>
              <Input
                id="sl"
                type="number"
                onKeyDown={handleNumberKeyDown}
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder={selectedAsset.type === "stock" ? "Contoh: 9800" : "Contoh: 60000"}
                disabled={!isPremium}
                className="bg-background"
              />
            </div>
          </div>

          {/* DCA Frequency Select */}
          <div className="space-y-2">
            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Frekuensi Cicil (DCA Alert)</Label>
            <Select 
              value={dca} 
              onValueChange={(val: any) => setDca(val)}
              disabled={!isPremium}
            >
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="Pilih frekuensi DCA" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Mati (Off)</SelectItem>
                <SelectItem value="daily">Setiap Hari (Daily)</SelectItem>
                <SelectItem value="weekly">Setiap Minggu (Weekly)</SelectItem>
                <SelectItem value="monthly">Setiap Bulan (Monthly)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Status Message */}
          {successMsg && (
            <Alert className="bg-emerald-500/10 border-emerald-500/20 text-emerald-500">
              <CheckCircle className="h-4 w-4 !text-emerald-500" />
              <AlertTitle>Berhasil Disimpan!</AlertTitle>
              <AlertDescription>{successMsg}</AlertDescription>
            </Alert>
          )}

          {errorMsg && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
              <ShieldAlert className="h-4 w-4 !text-destructive" />
              <AlertTitle>Terjadi Kesalahan</AlertTitle>
              <AlertDescription>{errorMsg}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSaving || !isPremium}
              className="rounded-lg bg-brand-green text-white font-bold py-2.5 px-6 text-sm transition cursor-pointer disabled:opacity-50 hover:bg-opacity-95 shadow-md flex items-center justify-center min-w-[180px]"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
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
