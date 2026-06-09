"use client";

import React from "react";
import { ChevronRight, Utensils, Wifi, ShoppingBag } from "lucide-react";
import { AreaChart, Area, ResponsiveContainer } from "recharts";

interface SpendingCardProps {
  isMounted: boolean;
}

interface Transaction {
  id: string;
  category: string;
  merchant: string;
  amount: number;
  type: "income" | "expense";
  color: string;
  icon: React.ReactNode;
}

const spendingChartData = [
  { day: "01", amount: 200 },
  { day: "08", amount: 350 },
  { day: "15", amount: 480 },
  { day: "22", amount: 620 },
  { day: "29", amount: 736.53 },
];

const transactions: Transaction[] = [
  {
    id: "1",
    category: "Food & Dining",
    merchant: "Whole Foods",
    amount: 78.00,
    type: "expense",
    color: "bg-emerald-500/10 text-emerald-500",
    icon: <Utensils className="h-4 w-4" />
  },
  {
    id: "2",
    category: "Bills & Utilities",
    merchant: "AT&T Broadband",
    amount: 65.00,
    type: "expense",
    color: "bg-blue-500/10 text-blue-500",
    icon: <Wifi className="h-4 w-4" />
  },
  {
    id: "3",
    category: "Shopping",
    merchant: "REI Outdoor",
    amount: 145.00,
    type: "expense",
    color: "bg-purple-500/10 text-purple-500",
    icon: <ShoppingBag className="h-4 w-4" />
  }
];

export default function SpendingCard({ isMounted }: SpendingCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Spending</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="text-left">
        <span className="text-xs text-muted-foreground">Total Bulan Ini</span>
        <h3 className="text-2xl font-extrabold tracking-tight text-foreground">$736.53</h3>
      </div>

      {/* Spending line graph */}
      <div className="h-24 mt-4 w-full">
        {isMounted ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spendingChartData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="spendingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#spendingGrad)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full w-full bg-muted animate-pulse rounded-lg" />
        )}
      </div>

      {/* Transaction list */}
      <div className="mt-6 space-y-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transaksi Terakhir</span>
        
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${tx.color}`}>
                  {tx.icon}
                </div>
                <div>
                  <p className="font-bold text-foreground">{tx.merchant}</p>
                  <p className="text-[10px] text-muted-foreground">{tx.category}</p>
                </div>
              </div>
              <span className="font-extrabold text-foreground">
                {tx.type === "expense" ? "-" : "+"}${tx.amount.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
