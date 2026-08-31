'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, SlidersHorizontal, RefreshCw } from 'lucide-react';

export function Navbar() {
  const [rates, setRates] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/currencies');
      const data = await res.json();
      if (data.success) {
        setRates(data.currencies.filter((c: any) => !c.isBase));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 bg-slate-900/60 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Live Base Rate Ticker */}
      <div className="flex items-center gap-3 overflow-x-auto py-1 scrollbar-none max-w-3xl">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Base Rates:
        </span>
        <div className="flex items-center gap-3">
          {rates.map((c) => (
            <div
              key={c.code}
              className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs shrink-0"
            >
              <span className="font-bold text-slate-200">{c.code}</span>
              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="text-emerald-400">B: {c.defaultBuyRate}</span>
                <span className="text-slate-600">|</span>
                <span className="text-amber-400">S: {c.defaultSellRate}</span>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={fetchRates}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          title="Refresh rates"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Quick Trade Action Buttons */}
      <div className="flex items-center gap-2.5">
        <Link
          href="/buying"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-semibold transition"
        >
          <ArrowDownLeft className="w-3.5 h-3.5" /> Buy
        </Link>

        <Link
          href="/selling"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600/20 text-amber-300 border border-amber-500/30 hover:bg-amber-600/30 text-xs font-semibold transition"
        >
          <ArrowUpRight className="w-3.5 h-3.5" /> Sell
        </Link>

        <Link
          href="/rates"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 text-xs font-semibold shadow-md shadow-indigo-600/20 transition"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" /> Custom Rates
        </Link>
      </div>
    </header>
  );
}
