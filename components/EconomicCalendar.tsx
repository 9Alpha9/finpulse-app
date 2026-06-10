"use client";

import React, { useState } from "react";
import { CalendarDays, AlertCircle, Clock } from "lucide-react";
import { motion } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// Types & Mock Data
// ─────────────────────────────────────────────────────────────────────────────

type ImpactLevel = "High" | "Medium" | "Low";

interface CalendarEvent {
    id: string;
    time: string;
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
        countryCode: "ID",
        countryName: "Indonesia",
        event: "Suku Bunga Acuan BI",
        impact: "High",
        actual: "6.25%",
        forecast: "6.25%",
        previous: "6.25%",
    },
    {
        id: "4",
        time: "15:30",
        countryCode: "EU",
        countryName: "Eropa",
        event: "ECB Press Conference",
        impact: "Medium",
        forecast: "-",
        previous: "-",
    },
    {
        id: "5",
        time: "07:30",
        countryCode: "JP",
        countryName: "Jepang",
        event: "Industrial Production (MoM)",
        impact: "Low",
        actual: "-0.1%",
        forecast: "0.5%",
        previous: "0.6%",
    }
];

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
        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-widest ${c.bg} ${c.text}`}>
            <span className="flex gap-0.5">
                <span className={`h-1.5 w-1.5 rounded-full ${c.color}`} />
                <span className={`h-1.5 w-1.5 rounded-full ${impact === "High" || impact === "Medium" ? c.color : "bg-muted"}`} />
                <span className={`h-1.5 w-1.5 rounded-full ${impact === "High" ? c.color : "bg-muted"}`} />
            </span>
            {c.label}
        </span>
    );
}

function getFlagEmoji(countryCode: string) {
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

    // Sort by time
    const sortedEvents = [...MOCK_EVENTS].sort((a, b) => a.time.localeCompare(b.time));

    return (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/15 text-blue-500 shrink-0">
                        <CalendarDays className="h-4.5 w-4.5" />
                    </div>
                    <div>
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-foreground leading-tight">Kalender Ekonomi</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Jadwal Rilis Data Makro
                        </p>
                    </div>
                </div>

                {/* Tab Filter Sederhana */}
                <div className="flex rounded-lg border border-border bg-background p-1 text-[10px] font-bold shrink-0">
                    <button
                        onClick={() => setFilter("Today")}
                        className={`rounded-md px-3 py-1 transition select-none cursor-pointer ${filter === "Today" ? "bg-brand-green text-white" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Hari Ini
                    </button>
                    <button
                        onClick={() => setFilter("Tomorrow")}
                        className={`rounded-md px-3 py-1 transition select-none cursor-pointer ${filter === "Tomorrow" ? "bg-brand-green text-white" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        Besok
                    </button>
                </div>
            </div>

            {/* List Events */}
            <div className="space-y-0 text-sm">
                {filter === "Tomorrow" ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2 text-muted-foreground">
                        <AlertCircle className="h-6 w-6 opacity-30" />
                        <span className="text-xs font-semibold">Belum ada jadwal rilis penting besok.</span>
                    </div>
                ) : (
                    sortedEvents.map((ev, i) => (
                        <motion.div
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            key={ev.id}
                            className={`py-3.5 group hover:bg-secondary/20 transition-colors rounded-xl px-2 ${i !== sortedEvents.length - 1 ? "border-b border-border/40" : ""}`}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">

                                {/* Waktu & Bendera & Judul */}
                                <div className="flex items-start gap-3">
                                    <div className="text-xs font-mono font-bold text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md shrink-0">
                                        {ev.time}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <span className="text-sm leading-none" title={ev.countryName}>{getFlagEmoji(ev.countryCode)}</span>
                                            <ImpactBadge impact={ev.impact} />
                                        </div>
                                        <div className="text-xs font-bold text-foreground group-hover:text-brand-green transition-colors line-clamp-1">
                                            {ev.event}
                                        </div>
                                    </div>
                                </div>

                                {/* Angka Aktual, Prediksi, Sebelumnya */}
                                <div className="flex items-center gap-4 sm:gap-6 ml-14 sm:ml-0">
                                    <div className="flex flex-col text-right">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Aktual</span>
                                        <span className={`text-[11px] font-black tabular-nums ${ev.actual
                                                ? (parseFloat(ev.actual) > parseFloat(ev.forecast) ? "text-[#089981]" : parseFloat(ev.actual) < parseFloat(ev.forecast) ? "text-[#f23645]" : "text-foreground")
                                                : "text-muted-foreground"
                                            }`}>
                                            {ev.actual || "—"}
                                        </span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Prediksi</span>
                                        <span className="text-[11px] font-bold tabular-nums text-foreground">{ev.forecast}</span>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase mb-0.5">Sblm</span>
                                        <span className="text-[11px] font-medium tabular-nums text-muted-foreground">{ev.previous}</span>
                                    </div>
                                </div>

                            </div>
                        </motion.div>
                    ))
                )}
            </div>

        </div>
    );
}