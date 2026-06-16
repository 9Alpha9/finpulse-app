"use client";

import React from "react";
import {
    LayoutDashboard,
    Bitcoin,
    BarChart2,
    Wallet,
    User // Menggunakan ikon User untuk Profil
} from "lucide-react";
import { motion } from "framer-motion";

interface BottomNavProps {
    activeTab: string;
    setActiveTab: (tab: any) => void;
    onProfileClick: () => void; // Prop diganti namanya agar lebih relevan
    isVisible?: boolean;
}

export default function BottomNav({ activeTab, setActiveTab, onProfileClick, isVisible = true }: BottomNavProps) {
    if (!isVisible) return null;
    const navItems = [
        { id: "overview", label: "Overview", icon: LayoutDashboard },
        { id: "crypto", label: "Crypto", icon: Bitcoin },
        { id: "stocks", label: "Saham", icon: BarChart2 },
        { id: "portfolio", label: "Portfolio", icon: Wallet },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden pb-safe">
            {/* Efek Gradasi Bayangan ke atas agar tidak bentrok dengan teks */}
            <div className="absolute bottom-full left-0 right-0 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />

            {/* Kontainer Navigasi */}
            <div className="bg-card/90 backdrop-blur-lg border-t border-border shadow-[0_-5px_20px_rgba(0,0,0,0.1)] px-2 pt-2 pb-3 flex items-center justify-between">

                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className="relative flex flex-col items-center justify-center w-full py-1 gap-1 cursor-pointer select-none touch-manipulation active:scale-95 transition-transform"
                        >
                            {isActive && (
                                <motion.div
                                    layoutId="bottomNavBubble"
                                    className="absolute inset-0 bg-brand-green/10 rounded-xl"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                />
                            )}

                            <Icon
                                className={`h-5 w-5 transition-colors duration-200 z-10 ${isActive ? "text-brand-green" : "text-muted-foreground"
                                    }`}
                            />
                            <span
                                className={`text-[9px] font-bold z-10 transition-colors duration-200 ${isActive ? "text-brand-green" : "text-muted-foreground"
                                    }`}
                            >
                                {item.label}
                            </span>
                        </button>
                    );
                })}

                {/* Tombol Profil — SEKARANG PINDAH TAB */}
                <button
                    onClick={() => setActiveTab("profile")} // <--- Ganti jadi ini
                    className="relative flex flex-col items-center justify-center w-full py-1 gap-1 cursor-pointer select-none touch-manipulation active:scale-95 transition-transform"
                >
                    {activeTab === "profile" && (
                        <motion.div
                            layoutId="bottomNavBubble"
                            className="absolute inset-0 bg-brand-green/10 rounded-xl"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <User className={`h-5 w-5 transition-colors duration-200 z-10 ${activeTab === "profile" ? "text-brand-green" : "text-muted-foreground"
                        }`} />
                    <span className={`text-[9px] font-bold z-10 transition-colors duration-200 ${activeTab === "profile" ? "text-brand-green" : "text-muted-foreground"
                        }`}>
                        Profil
                    </span>
                </button>

            </div>
        </div>
    );
}