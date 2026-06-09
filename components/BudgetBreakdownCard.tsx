"use client";

import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface BudgetBreakdownCardProps {
  isMounted: boolean;
}

const budgetData = [
  { name: "Auto & Transport", value: 120, color: "#f97316" }, // Orange
  { name: "Financial", value: 350, color: "#3b82f6" },       // Blue
  { name: "Food & Dining", value: 480, color: "#10b981" },    // Teal
  { name: "Bills & Utilities", value: 250, color: "#8b5cf6" } // Purple
];

export default function BudgetBreakdownCard({ isMounted }: BudgetBreakdownCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Budget Breakdown</span>
      </div>

      {/* Pie / Donut Chart with absolute center value */}
      <div className="h-44 mt-6 w-full flex items-center justify-center relative">
        <div className="absolute text-center">
          <span className="text-lg font-extrabold text-foreground">$1,200</span>
          <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">Spent</p>
        </div>
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={budgetData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={65}
                paddingAngle={3}
                dataKey="value"
              >
                {budgetData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-28 w-28 rounded-full border-4 border-dashed border-muted animate-spin" />
        )}
      </div>

      {/* Budget items list */}
      <div className="mt-4 space-y-2 border-t border-border pt-3">
        {budgetData.slice(0, 2).map((item) => (
          <div key={item.name} className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-semibold text-muted-foreground">{item.name}</span>
            </div>
            <span className="font-bold text-foreground">${item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
