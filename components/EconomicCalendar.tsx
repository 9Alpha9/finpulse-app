"use client";

import React, { useState, useEffect } from "react";
import { CalendarDays, AlertCircle, Clock, Activity, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// Types & Mock Data
// ─────────────────────────────────────────────────────────────────────────────

type ImpactLevel = "High" | "Medium" | "Low";

interface CalendarEvent {
    id: string;
    time: string;
    dateObj?: Date;
    countryCode: string;
    countryName: string;
    event: string;
    impact: ImpactLevel;
    actual?: string;
    forecast: string;
    previous: string;
}

const MOCK_EVENTS: CalendarEvent[] = [
    {
        id: "1",
        time: "19:30",
        dateObj: new Date(),
        countryCode: "US",
        countryName: "Amerika Serikat",
        event: "Core CPI (MoM) (Mei)",
        impact: "High",
        actual: "0.2%",
        forecast: "0.3%",
        previous: "0.3%",
    },
    {
        id: "2",
        time: "19:30",
        dateObj: new Date(),
        countryCode: "US",
        countryName: "Amerika Serikat",
        event: "Initial Jobless Claims",
        impact: "High",
        forecast: "220K",
        previous: "225K",
    },
    {
        id: "3",
        time: "10:00",
        dateObj: new Date(),
        countryCode: "ID",
        countryName: "Indonesia",
        event: "Suku Bunga Acuan BI",
        impact: "High",
        actual: "6.25%",
        forecast: "6.25%",
        previous: "6.25%",
    },
];

const COUNTRY_MAP: Record<string, { code: string; name: string }> = {
    USD: { code: "US", name: "Amerika Serikat" },
    IDR: { code: "ID", name: "Indonesia" },
    EUR: { code: "EU", name: "Eropa" },
    JPY: { code: "JP", name: "Jepang" },
    GBP: { code: "GB", name: "Inggris" },
    AUD: { code: "AU", name: "Australia" },
    CAD: { code: "CA", name: "Kanada" },
    NZD: { code: "NZ", name: "Selandia Baru" },
    CNY: { code: "CN", name: "Tiongkok" },
    CHF: { code: "CH", name: "Swiss" },
    All: { code: "UN", name: "Global" }
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function ImpactBadge({ impact }: { impact: ImpactLevel }) {
    const config = {
        High: { color: "bg-red-500", text: "text-red-500", bg: "bg-red-500/10", label: "TINGGI" },
        Medium: { color: "bg-orange-500", text: "text-orange-500", bg: "bg-orange-500/10", label: "SEDANG" },
        Low: { color: "bg-slate-400", text: "text-slate-400", bg: "bg-slate-500/10", label: "RENDAH" },
    };
    const c = config[impact];

    return (
        <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-extrabold tracking-widest ${c.bg} ${c.text}`}>
            <span className="flex gap-0.5 sm:gap-1">
                <span className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${c.color}`} />
                <span className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${impact === "High" || impact === "Medium" ? c.color : "bg-muted"}`} />
                <span className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${impact === "High" ? c.color : "bg-muted"}`} />
            </span>
            {c.label}
        </span>
    );
}

function getFlagEmoji(countryCode: string) {
    if (countryCode === "UN") return "🌐";
    const codePoints = countryCode
        .toUpperCase()
        .split("")
        .map((char) => 127397 + char.charCodeAt(0));
    return String.fromCodePoint(...codePoints);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function EconomicCalendar() {
    const [filter, setFilter] = useState<"Today" | "Tomorrow">("Today");
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    useEffect(() => {
        setCurrentPage(1);
    }, [filter]);

    useEffect(() => {
        let active = true;
        const fetchEvents = async () => {
            try {
                const res = await fetch("/api/calendar");
                const data = await res.json();
                if (!Array.isArray(data)) throw new Error("Invalid format");
                
                const mapped: CalendarEvent[] = data.map((item: any, i: number) => {
                    const country = COUNTRY_MAP[item.country] || { code: "UN", name: item.country };
                    let impact: ImpactLevel = "Low";
                    if (item.impact === "High") impact = "High";
                    if (item.impact === "Medium") impact = "Medium";

                    const d = new Date(item.date);
                    return {
                        id: `ev-${i}`,
                        time: d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
                        dateObj: d,
                        countryCode: country.code,
                        countryName: country.name,
                        event: item.title,
                        impact: impact,
                        forecast: item.forecast,
                        previous: item.previous,
                    };
                });

                if (active) {
                    setEvents(mapped);
                    setLoading(false);
                }
            } catch (err) {
                if (active) {
                    setEvents(MOCK_EVENTS);
                    setLoading(false);
                }
            }
        };

        fetchEvents();
        const interval = setInterval(fetchEvents, 60000); // Real-time refresh every minute
        return () => { active = false; clearInterval(interval); };
    }, []);

    const now = new Date();
    const todayStr = now.toDateString();
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toDateString();

    const filteredEvents = events.filter(e => {
        if (!e.dateObj) return true;
        const evStr = e.dateObj.toDateString();
        return filter === "Today" ? evStr === todayStr : evStr === tomorrowStr;
    }).sort((a, b) => a.time.localeCompare(b.time));

    const totalPages = Math.ceil(filteredEvents.length / ITEMS_PER_PAGE);
    const paginatedEvents = filteredEvents.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm space-y-4">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border/60 pb-4 gap-3 sm:gap-0">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-[0_4px_10px_rgba(59,130,246,0.3)] border border-white/20 shrink-0">
                        <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5 drop-shadow-md" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-foreground leading-tight">Kalender Ekonomi</h3>
                            <span className="flex items-center gap-1 bg-brand-green/10 text-brand-green text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-widest border border-brand-green/20">
                                <Activity className="h-1.5 w-1.5 sm:h-2 sm:w-2 animate-pulse" /> Live
                            </span>
                        </div>
                        <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> Auto-update Jadwal Makro
                        </p>
                    </div>
                </div>

                {/* Tab Filter */}
                <div className="flex rounded-lg border border-border bg-background p-1 text-[10px] font-bold shrink-0 self-start sm:self-auto w-full sm:w-auto">
                    <button
                        onClick={() => setFilter("Today")}
                        className={`flex-1 sm:flex-none rounded-md px-3 py-1.5 transition select-none cursor-pointer text-center ${filter === "Today" ? "bg-brand-green text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Hari Ini
                    </button>
                    <button
                        onClick={() => setFilter("Tomorrow")}
                        className={`flex-1 sm:flex-none rounded-md px-3 py-1.5 transition select-none cursor-pointer text-center ${filter === "Tomorrow" ? "bg-brand-green text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Besok
                    </button>
                </div>
            </div>

            {/* List Events */}
            <div className="space-y-0 text-sm overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                        <Loader2 className="h-6 w-6 animate-spin text-brand-green" />
                        <span className="text-xs font-semibold">Memuat data real-time...</span>
                    </div>
                ) : filteredEvents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                        <AlertCircle className="h-6 w-6 opacity-30" />
                        <span className="text-xs font-semibold">Belum ada jadwal rilis penting.</span>
                    </div>
                ) : (
                    <AnimatePresence mode="popLayout">
                        {paginatedEvents.map((ev, i) => (
                            <motion.div
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={ev.id}
                                className={`py-3 sm:py-3.5 group hover:bg-secondary/20 transition-colors rounded-xl px-2 sm:px-3 min-w-[320px] sm:min-w-0 ${i !== paginatedEvents.length - 1 ? "border-b border-border/40" : ""}`}
                            >
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4">

                                    {/* Waktu & Bendera & Judul */}
                                    <div className="flex items-start gap-2.5 sm:gap-3 w-full sm:w-auto">
                                        <div className="text-[10px] sm:text-[11px] font-mono font-bold text-muted-foreground bg-secondary/80 border border-border/50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md shrink-0">
                                            {ev.time}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-1.5 mb-1">
                                                <span className="text-base sm:text-lg leading-none" title={ev.countryName}>{getFlagEmoji(ev.countryCode)}</span>
                                                <ImpactBadge impact={ev.impact} />
                                            </div>
                                            <div className="text-xs sm:text-sm font-bold text-foreground group-hover:text-brand-green transition-colors line-clamp-2 sm:line-clamp-1 pr-2">
                                                {ev.event}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Angka Aktual, Prediksi, Sebelumnya */}
                                    <div className="flex items-center justify-between sm:justify-end gap-4 sm:gap-6 ml-[3.25rem] sm:ml-0 shrink-0 bg-background/50 sm:bg-transparent p-2 sm:p-0 rounded-lg sm:rounded-none">
                                        <div className="flex flex-col text-center sm:text-right">
                                            <span className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Aktual</span>
                                            <span className={`text-[10px] sm:text-[12px] font-black tabular-nums ${ev.actual
                                                    ? (parseFloat(ev.actual) > parseFloat(ev.forecast) ? "text-[#089981]" : parseFloat(ev.actual) < parseFloat(ev.forecast) ? "text-[#f23645]" : "text-foreground")
                                                    : "text-muted-foreground"
                                                }`}>
                                                {ev.actual || "—"}
                                            </span>
                                        </div>
                                        <div className="flex flex-col text-center sm:text-right">
                                            <span className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Prediksi</span>
                                            <span className="text-[10px] sm:text-[12px] font-bold tabular-nums text-foreground">{ev.forecast || "—"}</span>
                                        </div>
                                        <div className="flex flex-col text-center sm:text-right">
                                            <span className="text-[8px] sm:text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Sblm</span>
                                            <span className="text-[10px] sm:text-[12px] font-medium tabular-nums text-muted-foreground">{ev.previous || "—"}</span>
                                        </div>
                                    </div>

                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 mt-2 border-t border-border/40">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded-md border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
                    >
                        <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span>Sblmnya</span>
                    </button>
                    <span className="text-[10px] sm:text-xs text-muted-foreground font-semibold">
                        Hal {currentPage} dari {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold rounded-md border border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary transition-colors"
                    >
                        <span>Berikutnya</span>
                        <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                    </button>
                </div>
            )}

        </div>
    );
}