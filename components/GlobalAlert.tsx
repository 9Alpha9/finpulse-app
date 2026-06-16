"use client";

import React, { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function GlobalAlert() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-500 relative">
          <AlertTriangle className="h-4 w-4" color="currentColor" />
          <AlertTitle className="font-bold">Volatilitas Pasar Tinggi!</AlertTitle>
          <AlertDescription className="text-red-500/80 mt-1 pr-6 text-sm">
            Terdapat anomali harga pada pasar aset kripto (terutama BTC dan ETH) hari ini. Harap berhati-hati dalam melakukan trading dan perhatikan manajemen risiko Anda.
          </AlertDescription>
          <button
            onClick={() => setIsVisible(false)}
            className="absolute top-4 right-4 text-red-500/60 hover:text-red-500 transition-colors"
            title="Tutup Notifikasi"
          >
            <X className="h-4 w-4" />
          </button>
        </Alert>
      </motion.div>
    </AnimatePresence>
  );
}
