import React, { useState } from 'react';
import { Bell, ShieldCheck, Lock, Webhook, Send } from 'lucide-react';

interface AlertDashboardProps {
  userTier: 'free' | 'premium';
}

export default function AlertDashboard({ userTier }: AlertDashboardProps) {
  // Mock alerts data
  const [alerts] = useState([
    { id: 1, asset: 'BTC', condition: 'Harga > $65.000', status: 'aktif' },
    { id: 2, asset: 'ETH', condition: 'Lonjakan Vol > 2x', status: 'terpicu' },
    { id: 3, asset: 'SOL', condition: 'Harga < $120', status: 'aktif' },
  ]);

  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [telegramEnabled, setTelegramEnabled] = useState(false);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Alert Aktif</h3>
            <p className="text-xs text-muted-foreground">Kelola trigger pintar kamu</p>
          </div>
        </div>
        {userTier === 'free' ? (
          <span className="flex items-center gap-1 rounded-full bg-slate-500/10 px-3 py-1 text-xs font-bold text-slate-500">
            <Lock className="h-3 w-3" /> 3/3 Terpakai
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-500">
            <ShieldCheck className="h-3.5 w-3.5" /> Tanpa Batas
          </span>
        )}
      </div>

      <div className="p-6">
        {/* Integrations (Premium) */}
        <div className="mb-6 flex flex-wrap gap-4 border-b border-border/50 pb-6">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
            <Webhook className="h-5 w-5 text-indigo-500" />
            <div>
              <div className="text-sm font-semibold text-foreground">Webhook</div>
              <div className="text-xs text-muted-foreground">Kirim ke server kamu</div>
            </div>
            <button
              disabled={userTier === 'free'}
              onClick={() => setWebhookEnabled(!webhookEnabled)}
              className={`ml-4 h-6 w-10 rounded-full p-1 transition-colors ${
                webhookEnabled ? 'bg-indigo-500' : 'bg-muted'
              } ${userTier === 'free' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`h-4 w-4 rounded-full bg-white transition-transform ${webhookEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
            <Send className="h-5 w-5 text-blue-500" />
            <div>
              <div className="text-sm font-semibold text-foreground">Telegram</div>
              <div className="text-xs text-muted-foreground">Pesan instan</div>
            </div>
            <button
              disabled={userTier === 'free'}
              onClick={() => setTelegramEnabled(!telegramEnabled)}
              className={`ml-4 h-6 w-10 rounded-full p-1 transition-colors ${
                telegramEnabled ? 'bg-blue-500' : 'bg-muted'
              } ${userTier === 'free' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className={`h-4 w-4 rounded-full bg-white transition-transform ${telegramEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>

        {/* Alerts Grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alerts.map((alert) => (
            <div key={alert.id} className="relative rounded-xl border border-border bg-background p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-bold text-foreground">{alert.asset}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  alert.status === 'aktif' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                }`}>
                  {alert.status}
                </span>
              </div>
              <div className="text-sm text-muted-foreground font-medium">{alert.condition}</div>
            </div>
          ))}
          
          <button
            disabled={userTier === 'free'}
            className={`flex h-full min-h-[100px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/50 text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground ${
              userTier === 'free' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Bell className="mb-2 h-6 w-6" />
            <span className="text-sm font-semibold">
              {userTier === 'free' ? 'Batas Tercapai' : 'Tambah Alert Baru'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
