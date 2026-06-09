"use client";

import React from "react";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface CashFlowCardProps {
  isMounted: boolean;
}

const cashFlowData = [
  { name: "Mon", income: 120, expense: 90 },
  { name: "Tue", income: 320, expense: 210 },
  { name: "Wed", income: 540, expense: 380 },
  { name: "Thu", income: 200, expense: 150 },
  { name: "Fri", income: 610, expense: 420 },
  { name: "Sat", income: 150, flex: 290, expense: 290 },
  { name: "Sun", income: 732.35, expense: 320 },
];

export default function CashFlowCard({ isMounted }: CashFlowCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net Cash Flow</span>
        <span className="text-xs font-bold text-foreground bg-secondary px-2.5 py-1 rounded-lg border border-border">$1,382.18</span>
      </div>

      {/* Cash Flow chart */}
      <div className="h-44 mt-6 w-full">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={cashFlowData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ 
                  background: "var(--card)", 
                  borderColor: "var(--border)",
                  color: "var(--foreground)",
                  borderRadius: "12px",
                  fontSize: "12px"
                }}
              />
              <Bar dataKey="income" radius={[15, 15, 15, 15]}>
                {cashFlowData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.name === "Wed" ? "var(--brand-green)" : "var(--border)"} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full bg-muted animate-pulse rounded-lg" />
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-green" />
          <span className="font-semibold text-muted-foreground">Income</span>
        </div>
        <span className="font-bold text-foreground">$732.35</span>
      </div>
    </div>
  );
}
