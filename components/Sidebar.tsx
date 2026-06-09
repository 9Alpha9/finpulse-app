"use client";

import React from "react";
import {
  Home,
  TrendingUp,
  Coins,
  Bell,
  Newspaper,
  X,
  ChevronRight
} from "lucide-react";
import { cn } from "@/app/utils/cn";

export type DashboardTab = "overview" | "crypto" | "stocks" | "signals" | "news";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
}

const menuItems = [
  { id: "overview", name: "Overview", icon: Home },
  { id: "crypto", name: "Crypto Panel", icon: Coins },
  { id: "stocks", name: "Stocks Panel", icon: TrendingUp },
  { id: "signals", name: "WhatsApp Signals", icon: Bell },
  { id: "news", name: "News Feed", icon: Newspaper }
] as const;

export default function Sidebar({ isOpen, onClose, activeTab, setActiveTab }: SidebarProps) {
  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/45 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 flex w-64 flex-col border-r border-border bg-card transition-transform duration-300 lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header (Logo) */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-green font-bold text-white shadow-md shadow-brand-green/20">
              A
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">ArthaVerse</span>
          </div>

          {/* Close button for mobile */}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted text-muted-foreground hover:text-foreground lg:hidden cursor-pointer"
            aria-label="Close Sidebar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menu Navigation */}
        <nav className="flex-1 space-y-1.5 px-3 py-6 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = item.id === activeTab;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose(); // Auto close on mobile
                }}
                className={cn(
                  "w-full group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all duration-150 cursor-pointer text-left focus:outline-none",
                  isActive
                    ? "bg-brand-green/10 text-brand-green dark:bg-brand-green-light/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <div className="flex items-center gap-3">
                  <item.icon className={cn(
                    "h-5 w-5 transition-colors duration-150",
                    isActive ? "text-brand-green" : "text-muted-foreground group-hover:text-foreground"
                  )} />
                  <span>{item.name}</span>
                </div>
                {isActive && (
                  <div className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer info in sidebar */}
        <div className="border-t border-border p-4 bg-muted/40">
          <div className="rounded-xl border border-border bg-card p-3 shadow-xs">
            <h4 className="text-xs font-semibold text-foreground">Butuh Bantuan?</h4>
            <p className="mt-1 text-[11px] text-muted-foreground leading-normal">
              Akses panduan lengkap kami untuk memulai analisis sinyal.
            </p>
            <a
              href="#"
              className="mt-2.5 inline-flex items-center text-xs font-bold text-brand-green hover:underline gap-0.5"
            >
              Pusat Panduan <ChevronRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </aside>
    </>
  );
}