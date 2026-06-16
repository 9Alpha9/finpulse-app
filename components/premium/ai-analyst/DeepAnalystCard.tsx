import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrainCircuit, TrendingUp, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react';
import UpsellModal from './UpsellModal';

interface DeepAnalystCardProps {
  userTier: 'free' | 'premium';
  ticker: string;
  onUpgrade?: () => void;
}

export default function DeepAnalystCard({ userTier, ticker, onUpgrade }: DeepAnalystCardProps) {
  // Mock data for the premium view
  const riskScore = 6.5; // 1 to 10
  const riskColor = riskScore > 7 ? 'text-rose-500' : riskScore > 4 ? 'text-amber-500' : 'text-emerald-500';
  const riskBg = riskScore > 7 ? 'bg-rose-500/10' : riskScore > 4 ? 'bg-amber-500/10' : 'bg-emerald-500/10';

  const showPremiumContent = userTier === 'premium';

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-sm transition-all hover:shadow-md">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border/50 bg-muted/30 px-6 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
          <BrainCircuit className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-foreground">Deep Analyst AI</h3>
          <p className="text-xs text-muted-foreground">Analisis teknikal & fundamental komprehensif</p>
        </div>
        <div className="ml-auto">
          <span className="rounded-md bg-secondary px-2 py-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {ticker}
          </span>
        </div>
      </div>

      <div className="relative p-6">
        <AnimatePresence mode="wait">
          {!showPremiumContent ? (
            <motion.div
              key="upsell"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-4"
            >
              <UpsellModal onUpgrade={onUpgrade} />
            </motion.div>
          ) : (
            <motion.div
              key="premium-content"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Risk Score & Quick Verdict */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-card shadow-inner ${riskBg}`}>
                    <span className={`text-xl font-black ${riskColor}`}>{riskScore}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Skor Risiko</h4>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-lg font-bold text-foreground">Risiko Menengah</span>
                      <AlertTriangle className={`h-4 w-4 ${riskColor}`} />
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-border bg-background p-3 sm:text-right">
                  <div className="text-xs text-muted-foreground mb-1">Prediksi AI</div>
                  <div className="text-sm font-bold text-emerald-500 flex items-center gap-1.5 sm:justify-end">
                    <TrendingUp className="h-4 w-4" /> Akumulasi / Beli
                  </div>
                </div>
              </div>

              {/* Financial Metrics Table */}
              <div>
                <h4 className="mb-3 text-sm font-bold text-foreground flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-indigo-500" /> Metrik Prediksi Utama
                </h4>
                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-semibold">Metrik</th>
                        <th className="px-4 py-2 font-semibold">Nilai</th>
                        <th className="px-4 py-2 font-semibold">Tren</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      <tr className="bg-background hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium text-foreground">Volatilitas (30h)</td>
                        <td className="px-4 py-3 text-muted-foreground">4.2%</td>
                        <td className="px-4 py-3 text-rose-500"><TrendingUp className="h-4 w-4" /></td>
                      </tr>
                      <tr className="bg-background hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium text-foreground">Kekuatan Momentum</td>
                        <td className="px-4 py-3 text-muted-foreground">Kuat</td>
                        <td className="px-4 py-3 text-emerald-500"><TrendingUp className="h-4 w-4" /></td>
                      </tr>
                      <tr className="bg-background hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium text-foreground">Skor Likuiditas</td>
                        <td className="px-4 py-3 text-muted-foreground">8.9/10</td>
                        <td className="px-4 py-3 text-slate-400"><TrendingRightIcon className="h-4 w-4" /></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pros & Cons List */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <h4 className="mb-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" /> Faktor Bullish
                  </h4>
                  <ul className="space-y-2 text-sm text-foreground/80">
                    <li className="flex gap-2">
                      <span className="text-emerald-500">•</span> Akumulasi kuat oleh dompet institusi.
                    </li>
                    <li className="flex gap-2">
                      <span className="text-emerald-500">•</span> Persilangan MACD menunjukkan momentum bullish jangka pendek.
                    </li>
                  </ul>
                </div>
                <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4">
                  <h4 className="mb-3 text-sm font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Faktor Bearish
                  </h4>
                  <ul className="space-y-2 text-sm text-foreground/80">
                    <li className="flex gap-2">
                      <span className="text-rose-500">•</span> Mendekati level resisten historis utama.
                    </li>
                    <li className="flex gap-2">
                      <span className="text-rose-500">•</span> RSI menunjukkan kondisi sedikit overbought.
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Simple fallback icon for horizontal trend
function TrendingRightIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
