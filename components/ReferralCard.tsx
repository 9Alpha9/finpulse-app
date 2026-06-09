"use client";

import React, { useState } from "react";
import { Gift } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ReferralCard() {
  const [inviteVisible, setInviteVisible] = useState(true);

  return (
    <AnimatePresence>
      {inviteVisible && (
        <motion.div 
          initial={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, height: 0, y: -20 }}
          className="rounded-2xl bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 text-white p-5 shadow-md relative overflow-hidden"
        >
          {/* Decorative gift element */}
          <div className="absolute -right-6 -bottom-6 opacity-25">
            <Gift className="h-28 w-28 text-teal-500" />
          </div>

          <h4 className="text-xs font-extrabold uppercase tracking-wider text-teal-400">Undang Teman, Dapat Bonus</h4>
          <p className="mt-2.5 text-xs text-zinc-300 leading-relaxed max-w-[85%]">
            Dapatkan bonus Rp 350.000 ($25) dan APY ekstra setelah teman Anda menjadi anggota aktif ArthaVerse.
          </p>

          <div className="mt-5 flex gap-3 relative z-10">
            <button className="rounded-full bg-white hover:bg-zinc-200 px-4 py-2 text-xs font-bold text-black shadow-xs transition">
              BAGIKAN LINK
            </button>
            <button 
              onClick={() => setInviteVisible(false)}
              className="rounded-full bg-transparent border border-zinc-700 hover:bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-300 transition"
            >
              TUTUP
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
