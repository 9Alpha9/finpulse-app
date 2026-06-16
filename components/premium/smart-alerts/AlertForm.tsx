import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Target, TrendingUp, Activity, Plus } from 'lucide-react';

export default function AlertForm() {
  const [triggerType, setTriggerType] = useState<'price' | 'percentage' | 'volume'>('price');
  const [targetValue, setTargetValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Reset form
    setTargetValue('');
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-bold text-foreground">Atur Smart Alert</h3>
      
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="flex gap-2 rounded-xl bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => setTriggerType('price')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              triggerType === 'price' ? 'bg-background text-foreground shadow' : 'text-muted-foreground'
            }`}
          >
            <Target className="mx-auto mb-1 h-4 w-4" /> Harga
          </button>
          <button
            type="button"
            onClick={() => setTriggerType('percentage')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              triggerType === 'percentage' ? 'bg-background text-foreground shadow' : 'text-muted-foreground'
            }`}
          >
            <TrendingUp className="mx-auto mb-1 h-4 w-4" /> % Lonjakan
          </button>
          <button
            type="button"
            onClick={() => setTriggerType('volume')}
            className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all ${
              triggerType === 'volume' ? 'bg-background text-foreground shadow' : 'text-muted-foreground'
            }`}
          >
            <Activity className="mx-auto mb-1 h-4 w-4" /> Volume
          </button>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            {triggerType === 'price' ? 'Target Harga' : triggerType === 'percentage' ? 'Perubahan Persentase (%)' : 'Multiplier Lonjakan Volume (x)'}
          </label>
          <div className="relative">
            <input
              type="number"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              placeholder={triggerType === 'price' ? 'misal 65000' : triggerType === 'percentage' ? 'misal 5' : 'misal 3'}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-brand-green focus:outline-none focus:ring-1 focus:ring-brand-green"
              required
            />
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-green px-4 py-2.5 text-sm font-bold text-white shadow-md transition-colors hover:bg-brand-green/90"
        >
          <Plus className="h-4 w-4" /> Buat Alert
        </motion.button>
      </form>
    </div>
  );
}
