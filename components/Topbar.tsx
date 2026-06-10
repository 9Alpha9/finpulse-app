"use client";

import React, { useState } from "react";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";
import {
  Bell,
  Menu,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Sparkles,
  Crown,
} from "lucide-react";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout, theme, toggleTheme, subscriptionTier, setSubscriptionTier } = useThemeAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const displayName = user?.name || "Tamim";
  const isPremium   = subscriptionTier === "premium";

  const handleToggleTier = () => {
    setSubscriptionTier(isPremium ? "free" : "premium");
  };

  return (
    <header className="fixed top-0 right-0 left-0 lg:left-64 z-[9999] flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6 shadow-sm transition-all duration-300">

      {/* ── Left ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden cursor-pointer transition"
          aria-label="Open Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* App name — mobile only (when no sidebar) */}
        <span className="lg:hidden text-base font-extrabold text-foreground tracking-tight select-none">
          FinPulse
        </span>

        {/* Greeting — desktop only */}
        <h1 className="hidden lg:flex items-center gap-1.5 text-sm font-semibold text-foreground truncate">
          Good Morning, <span className="font-extrabold">{displayName}</span>
          <span className="animate-bounce">👋</span>
        </h1>
      </div>

      {/* ── Right ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 shrink-0">

        {/* Tier badge */}
        <button
          onClick={handleToggleTier}
          title="Klik untuk toggle tier demo"
          className={`hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-extrabold tracking-wide transition cursor-pointer border ${
            isPremium
              ? "bg-amber-500/10 border-amber-500/25 text-amber-500 hover:bg-amber-500/20"
              : "bg-muted border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {isPremium ? (
            <>
              <Crown className="h-3 w-3 fill-current" />
              PREMIUM
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              FREE
            </>
          )}
        </button>

        {/* Tier badge — icon only on mobile */}
        <button
          onClick={handleToggleTier}
          title="Klik untuk toggle tier demo"
          className={`sm:hidden flex items-center justify-center h-8 w-8 rounded-full border transition cursor-pointer ${
            isPremium
              ? "bg-amber-500/10 border-amber-500/25 text-amber-500"
              : "bg-muted border-border text-muted-foreground"
          }`}
        >
          {isPremium ? <Crown className="h-3.5 w-3.5 fill-current" /> : <Sparkles className="h-3.5 w-3.5" />}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
          title="Toggle Light/Dark"
        >
          {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>

        {/* Notifications */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-xl hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-destructive" />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-border mx-0.5" />

        {/* User avatar + dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 focus:outline-none cursor-pointer group"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-green font-bold text-white select-none text-sm shadow-inner group-hover:ring-2 group-hover:ring-brand-green/30 transition">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block transition-transform duration-200" style={{ transform: showDropdown ? "rotate(180deg)" : "rotate(0deg)" }} />
          </button>

          {showDropdown && (
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)} />

              {/* Dropdown menu */}
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User info */}
                <div className="px-3 py-2.5 border-b border-border mb-1">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-green font-bold text-white text-sm select-none">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user?.email || "tamim@finpulse.com"}</p>
                    </div>
                  </div>

                  {/* Tier badge inside dropdown */}
                  <div className={`mt-2 flex items-center gap-1 text-[9px] font-extrabold px-2 py-1 rounded-full w-fit ${
                    isPremium
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {isPremium ? <Crown className="h-2.5 w-2.5 fill-current" /> : <Sparkles className="h-2.5 w-2.5" />}
                    {isPremium ? "Premium" : "Free Tier"}
                  </div>
                </div>

                <button
                  onClick={() => setShowDropdown(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted text-left transition cursor-pointer"
                >
                  <UserIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  Profil Saya
                </button>

                <button
                  onClick={() => { setShowDropdown(false); logout(); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 text-left transition cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Keluar Akun
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}