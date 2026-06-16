import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, ShieldCheck, Zap } from 'lucide-react';

interface UpsellModalProps {
  onUpgrade?: () => void;
}

export default function UpsellModal({ onUpgrade }: UpsellModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-card to-slate-900 p-6 md:p-8 shadow-2xl backdrop-blur-md"
    >
      {/* Background Glow Effect */}
      <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative z-10 flex flex-col items-center text-center">
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 shadow-[0_0_20px_rgba(245,158,11,0.4)]"
        >
          <Sparkles className="h-7 w-7 text-white" />
        </motion.div>

        <motion.h3
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl"
        >
          Buka Akses Deep Analyst AI
        </motion.h3>

        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mb-8 max-w-md text-sm text-slate-300 sm:text-base"
        >
          Tingkatkan ke Premium untuk membuka wawasan kelas institusi, skor risiko real-time, dan metrik prediksi finansial.
        </motion.p>

        <div className="mb-8 flex flex-col gap-3 text-left sm:flex-row sm:gap-6">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="flex items-center gap-2"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
              <Zap className="h-3 w-3" />
            </div>
            <span className="text-sm font-medium text-slate-200">Skor Risiko Real-time</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="flex items-center gap-2"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
            </div>
            <span className="text-sm font-medium text-slate-200">Smart Alerts Tanpa Batas</span>
          </motion.div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          onClick={onUpgrade}
          className="group flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-3 font-bold text-white shadow-lg transition-all hover:shadow-amber-500/25"
        >
          Tingkatkan Sekarang
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </motion.button>
      </div>
    </motion.div>
  );
}
