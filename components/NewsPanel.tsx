"use client";

import React, { useState, useEffect } from "react";
import { ArrowUpRight, Newspaper, Loader2, RefreshCw } from "lucide-react";

interface NewsItem {
  guid: string;
  title: string;
  link: string;
  pubDate: string;
  description: string;
  thumbnail?: string;
  category: "crypto" | "stocks" | "macro";
  sentiment: "positive" | "negative" | "neutral";
}

const stripHtml = (html: string) => {
  return html.replace(/<[^>]*>?/gm, "").trim();
};

const getCategoryAndSentiment = (title: string, desc: string) => {
  const text = (title + " " + desc).toLowerCase();
  let category: "crypto" | "stocks" | "macro" = "macro";
  if (
    text.includes("crypto") || 
    text.includes("bitcoin") || 
    text.includes("eth") || 
    text.includes("kripto") || 
    text.includes("btc") ||
    text.includes("koin")
  ) {
    category = "crypto";
  } else if (
    text.includes("saham") || 
    text.includes("idx") || 
    text.includes("ihsg") || 
    text.includes("emiten") || 
    text.includes("dividen") ||
    text.includes("bursa") ||
    text.includes("obligasi")
  ) {
    category = "stocks";
  }
  
  let sentiment: "positive" | "negative" | "neutral" = "neutral";
  if (
    text.includes("naik") || 
    text.includes("untung") || 
    text.includes("melonjak") || 
    text.includes("rekor") || 
    text.includes("tumbuh") || 
    text.includes("laba") || 
    text.includes("hijau") ||
    text.includes("melesat")
  ) {
    sentiment = "positive";
  } else if (
    text.includes("turun") || 
    text.includes("rugi") || 
    text.includes("ambles") || 
    text.includes("anjlok") || 
    text.includes("merah") || 
    text.includes("jatuh") ||
    text.includes("koreksi")
  ) {
    sentiment = "negative";
  }
  
  return { category, sentiment };
};

export default function NewsPanel() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLiveNews = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const feedUrl = "https://www.cnbcindonesia.com/market/rss";
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`);
      
      if (!res.ok) throw new Error("Gagal mengambil berita live dari CNBC");
      
      const data = await res.json();
      
      if (data.status !== "ok") {
        throw new Error(data.message || "Gagal memproses RSS feed");
      }
      
      const formattedItems = data.items.map((item: any) => {
        const cleanedDesc = stripHtml(item.description);
        const { category, sentiment } = getCategoryAndSentiment(item.title, cleanedDesc);
        
        return {
          guid: item.guid || item.link,
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          description: cleanedDesc,
          thumbnail: item.thumbnail,
          category,
          sentiment,
        };
      });
      
      setNews(formattedItems);
    } catch (err: any) {
      console.error(err);
      setError("Gagal memuat berita finansial real-time. Menampilkan data fallback...");
      
      // Fallback local data if feed loading is blocked/offline
      setNews([
        {
          guid: "fb-1",
          title: "IHSG Ditutup Menguat Tipis Ditopang Sentimen Suku Bunga BI",
          link: "https://www.cnbcindonesia.com/market",
          pubDate: new Date().toISOString(),
          description: "Indeks Harga Saham Gabungan (IHSG) ditutup menghijau sore ini seiring investor menyerap sinyal stabilitas makroekonomi domestik dan potensi pelonggaran suku bunga acuan di Q4.",
          category: "stocks",
          sentiment: "positive",
        },
        {
          guid: "fb-2",
          title: "Emas & Bitcoin Kompak Menguat Ditengah Pelemahan Dolar AS",
          link: "https://www.cnbcindonesia.com/market",
          pubDate: new Date().toISOString(),
          description: "Harga emas global dan Bitcoin kembali mencatatkan kenaikan tipis malam ini seiring melemahnya indeks dolar AS di tengah spekulasi inflasi bulanan.",
          category: "crypto",
          sentiment: "positive",
        },
        {
          guid: "fb-3",
          title: "Sektor Logistik Pelayaran Terkoreksi Akibat Tarif Kontainer Global",
          link: "https://www.cnbcindonesia.com/market",
          pubDate: new Date().toISOString(),
          description: "Beberapa saham emiten perkapalan dan logistik mengalami koreksi wajar menyusul normalisasi tarif angkut peti kemas global pasca lonjakan musiman.",
          category: "stocks",
          sentiment: "negative",
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveNews();
  }, []);

  return (
    <div className="space-y-4 flex flex-col h-full">
      
      {/* Title */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-foreground tracking-tight">Market News Feed</h2>
            <p className="text-[10px] text-muted-foreground">CNBC Indonesia • Real-Time RSS Stream</p>
          </div>
        </div>
        
        <button 
          onClick={fetchLiveNews}
          disabled={isLoading}
          className="p-2 hover:bg-secondary rounded-lg transition text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Error/Fallback Notice */}
      {error && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-xl p-3 text-xs leading-relaxed shrink-0">
          ⚠️ {error}
        </div>
      )}

      {/* News Grid */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
        {isLoading ? (
          <div className="flex flex-col h-32 items-center justify-center text-muted-foreground gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
            <span className="text-xs font-semibold">Mengambil berita live...</span>
          </div>
        ) : (
          news.map((item) => {
            const friendlyDate = new Date(item.pubDate).toLocaleTimeString("id-ID", {
              hour: "2-digit",
              minute: "2-digit",
            }) + ", " + new Date(item.pubDate).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
            });
            
            return (
              <div 
                key={item.guid} 
                className="rounded-xl border border-border bg-card p-4 shadow-xs hover:border-muted-foreground/30 transition duration-150 flex flex-col gap-2.5 justify-between"
              >
                <div className="space-y-1.5">
                  {/* Category Badges */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      item.category === "crypto" 
                        ? "bg-amber-500/10 text-amber-500" 
                        : item.category === "stocks"
                        ? "bg-emerald-500/10 text-emerald-500"
                        : "bg-blue-500/10 text-blue-500"
                    }`}>
                      {item.category}
                    </span>

                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      item.sentiment === "positive" 
                        ? "bg-emerald-500/10 text-emerald-500" 
                        : item.sentiment === "negative"
                        ? "bg-red-500/10 text-red-500"
                        : "bg-slate-500/10 text-slate-500"
                    }`}>
                      {item.sentiment}
                    </span>

                    <span className="text-[9px] text-muted-foreground ml-auto font-semibold">
                      {friendlyDate}
                    </span>
                  </div>

                  {/* Title & Summary */}
                  <h3 className="text-xs font-extrabold text-foreground leading-snug hover:text-brand-green transition">
                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                      {item.title}
                    </a>
                  </h3>
                  <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                </div>

                {/* Read Source Link Button */}
                <div className="flex justify-between items-center border-t border-border/60 pt-2.5 mt-1">
                  <span className="text-[10px] text-muted-foreground font-bold font-mono">
                    CNBC Indonesia
                  </span>
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-0.5 text-[10px] font-extrabold text-brand-green hover:underline cursor-pointer group"
                  >
                    <span>BACA SELENGKAPNYA</span>
                    <ArrowUpRight className="h-3 w-3 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition duration-150" />
                  </a>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
