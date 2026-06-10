"use client";

import React, { useState } from "react";
import {
    User,
    ShieldCheck,
    Zap,
    Bell,
    Smartphone,
    LogOut,
    Camera,
    ChevronRight,
    CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";

export default function ProfilePanel() {
    const { user, subscriptionTier, setSubscriptionTier } = useThemeAuth();
    const isPremium = subscriptionTier === "premium";


    const [whatsappNotifications, setWhatsappNotifications] = useState(true);

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-10">

            {/* ── CARD 1: USER INFO ── */}
            <div className="rounded-3xl border border-border bg-card p-6 shadow-sm overflow-hidden relative">
                {/* Background Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-brand-green/5 rounded-full -mr-16 -mt-16 blur-3xl" />

                <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
                    <div className="relative group">
                        <div className="h-24 w-24 rounded-full bg-secondary border-4 border-background flex items-center justify-center overflow-hidden">
                            {user?.user_metadata?.avatar_url ? (
                                <img src={user.user_metadata.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                                <User className="h-12 w-12 text-muted-foreground" />
                            )}
                        </div>
                        <button className="absolute bottom-0 right-0 p-1.5 bg-brand-green text-white rounded-full border-2 border-background hover:scale-110 transition cursor-pointer">
                            <Camera className="h-3.5 w-3.5" />
                        </button>
                    </div>

                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-2xl font-black text-foreground tracking-tight">
                            {user?.user_metadata?.full_name || "Pengguna FinPulse"}
                        </h2>
                        <p className="text-sm text-muted-foreground font-medium">{user?.email}</p>

                        <div className="mt-3 flex flex-wrap justify-center md:justify-start gap-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-[10px] font-bold text-muted-foreground uppercase border border-border/50">
                                <ShieldCheck className="h-3 w-3" /> Akun Terverifikasi
                            </span>
                            {isPremium && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-green/10 text-[10px] font-bold text-brand-green uppercase border border-brand-green/20">
                                    <Zap className="h-3 w-3 fill-current" /> Premium Member
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* ── CARD 2: SUBSCRIPTION ── */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" /> Langganan Saya
                    </h3>

                    <div className={`p-4 rounded-2xl border ${isPremium ? 'border-brand-green/30 bg-brand-green/5' : 'border-border bg-secondary/30'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-xs font-bold text-muted-foreground uppercase">Paket Saat Ini</p>
                                <p className="text-xl font-black text-foreground tracking-tight">
                                    {isPremium ? "Premium Pro" : "Free Plan"}
                                </p>
                            </div>
                            <CheckCircle2 className={`h-6 w-6 ${isPremium ? 'text-brand-green' : 'text-muted-foreground/30'}`} />
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            {isPremium
                                ? "Anda memiliki akses penuh ke sinyal WhatsApp, WebSocket real-time, dan tanpa iklan."
                                : "Tingkatkan untuk mendapatkan sinyal trading instan via WhatsApp."}
                        </p>
                    </div>

                    {!isPremium && (
                        <button
                            onClick={() => setSubscriptionTier("premium")}
                            className="w-full py-3 bg-brand-green text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-green/20 hover:opacity-90 transition cursor-pointer"
                        >
                            UPGRADE KE PREMIUM
                        </button>
                    )}
                </div>

                {/* ── CARD 3: NOTIFICATIONS ── */}
                <div className="rounded-3xl border border-border bg-card p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Bell className="h-4 w-4 text-blue-500" /> Notifikasi
                    </h3>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-xl border border-border/50">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-lg bg-brand-green/10 flex items-center justify-center">
                                    <Smartphone className="h-4 w-4 text-brand-green" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-foreground">Sinyal WhatsApp</p>
                                    <p className="text-[10px] text-muted-foreground">Kirim sinyal ke nomor aktif</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setWhatsappNotifications(!whatsappNotifications)}
                                className={`w-10 h-5 rounded-full transition-colors relative ${whatsappNotifications ? 'bg-brand-green' : 'bg-muted-foreground/30'}`}
                            >
                                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${whatsappNotifications ? 'right-1' : 'left-1'}`} />
                            </button>
                        </div>

                        <button className="w-full flex items-center justify-between p-3 hover:bg-secondary/40 rounded-xl transition cursor-pointer group">
                            <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">Atur Nomor WhatsApp</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </button>
                    </div>
                </div>

            </div>

            {/* ── CARD 4: ACCOUNT ACTION ── */}
            <div className="rounded-3xl border border-border bg-card overflow-hidden">
                <button className="w-full px-6 py-4 flex items-center justify-between text-red-500 hover:bg-red-500/5 transition cursor-pointer">
                    <div className="flex items-center gap-3">
                        <LogOut className="h-4.5 w-4.5" />
                        <span className="text-sm font-black uppercase tracking-wider">Keluar dari Akun</span>
                    </div>
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

        </div>
    );
}