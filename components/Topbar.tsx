"use client";

import React, { useState } from "react";
import { useThemeAuth } from "@/app/context/ThemeAuthContext";
import {
  Bell,
  HelpCircle,
  Menu,
  Plus,
  Gift,
  Sun,
  Moon,
  LogOut,
  User as UserIcon,
  ChevronDown,
  Zap,
  Sparkles
} from "lucide-react";

interface TopbarProps {
  onMenuClick: () => void;
}

export default function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout, theme, toggleTheme, subscriptionTier, setSubscriptionTier } = useThemeAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const displayName = user?.name || "Tamim";

  const handleToggleTier = () => {
    const nextTier = subscriptionTier === "free" ? "premium" : "free";
    setSubscriptionTier(nextTier);
  };

  return (
    // PERBAIKAN: Mengganti sticky menjadi fixed, dan menambahkan left-0 right-0 serta lg:left-64
    <header className="fixed top-0 right-0 left-0 lg:left-64 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6 shadow-xs transition-all duration-300">
      {/* Left side: Hamburger menu (mobile) & Greeting */}
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground lg:hidden cursor-pointer"
          aria-label="Open Sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="hidden sm:block">
          <h1 className="text-lg font-bold text-foreground flex items-center gap-1.5 md:text-xl">
            Good Morning, {displayName} <span className="animate-bounce">👋</span>
          </h1>
        </div>

        <div className="block sm:hidden">
          <span className="text-md font-bold text-foreground">FinPulse</span>
        </div>
      </div>

      {/* Right side: Actions & User Profiling */}
      <div className="flex items-center gap-2 md:gap-3">

        {/* Tier Demo Switcher Toggle */}
        <button
          onClick={handleToggleTier}
          className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[10px] font-extrabold transition cursor-pointer border ${subscriptionTier === "premium"
            ? "bg-amber-500/10 border-amber-500/20 text-amber-500 hover:bg-amber-500/20"
            : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          title="Klik untuk mengubah paket langganan (Free / Premium)"
        >
          {subscriptionTier === "premium" ? (
            <>
              <Sparkles className="h-3 w-3 fill-current animate-pulse" />
              <span>PREMIUM</span>
            </>
          ) : (
            <>
              <span>FREE TIER</span>
            </>
          )}
        </button>

        {/* Promotion Banner Button: Get $25 */}
        <button className="hidden md:flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background hover:bg-opacity-95 shadow-sm transition cursor-pointer">
          <Gift className="h-3.5 w-3.5 text-brand-green" />
          <span>Get $25</span>
        </button>

        {/* Add Account Button */}
        <button className="hidden sm:flex items-center gap-1 rounded-full border border-border bg-card hover:bg-muted px-4 py-2 text-xs font-bold text-foreground transition cursor-pointer">
          <Plus className="h-3.5 w-3.5" />
          <span>ACCOUNT</span>
        </button>

        {/* Theme Switcher Toggle */}
        <button
          onClick={toggleTheme}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer"
          title="Toggle Light/Dark Theme"
        >
          {theme === "light" ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
        </button>

        {/* Help Icon */}
        <button className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer">
          <HelpCircle className="h-4.5 w-4.5" />
        </button>

        {/* Notifications Button with indicator */}
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition cursor-pointer">
          <Bell className="h-4.5 w-4.5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </button>

        {/* Divider */}
        <div className="h-8 w-px bg-border mx-1" />

        {/* User Avatar & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-1.5 focus:outline-none cursor-pointer"
          >
            <div className="flex h-8.5 w-8.5 items-center justify-center rounded-full bg-brand-green font-bold text-white shadow-inner select-none text-sm">
              {displayName.charAt(0).toUpperCase()}
            </div>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </button>

          {showDropdown && (
            <>
              {/* Overlay to close */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              />

              {/* Dropdown Menu */}
              <div className="absolute right-0 mt-2.5 w-48 rounded-xl border border-border bg-card p-1 shadow-lg z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-border text-left">
                  <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email || "tamim@finpulse.com"}</p>
                </div>

                <button
                  onClick={() => setShowDropdown(false)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted text-left transition cursor-pointer"
                >
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  Profil Saya
                </button>

                <button
                  onClick={() => {
                    setShowDropdown(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 text-left transition cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
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