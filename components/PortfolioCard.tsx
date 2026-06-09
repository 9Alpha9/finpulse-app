"use client";

import React from "react";
import { ChevronRight } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface PortfolioCardProps {
  isMounted: boolean;
}

export default function PortfolioCard({ isMounted }: PortfolioCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Investments Portfolio</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex justify-between items-baseline">
        <div>
          <span className="text-xs text-muted-foreground">Nilai Investasi</span>
          <h3 className="text-2xl font-extrabold tracking-tight text-foreground">$3.84</h3>
        </div>
        <span className="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
          -0.25%
        </span>
      </div>

      {/* Mini chart visual */}
      <div className="h-16 mt-4 w-full">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={[
              { x: 1, y: 3.1 },
              { x: 2, y: 3.2 },
              { x: 3, y: 3.4 },
              { x: 4, y: 3.5 },
              { x: 5, y: 3.84 },
            ]}>
              <Area 
                type="monotone" 
                dataKey="y" 
                stroke="var(--brand-green)" 
                strokeWidth={1.5}
                fill="transparent"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full bg-muted animate-pulse rounded-lg" />
        )}
      </div>
    </div>
  );
}
