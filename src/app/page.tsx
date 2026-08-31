'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Users,
  Building2,
  DollarSign,
  Wallet,
  Landmark,
  Clock,
  ChevronRight,
  SlidersHorizontal,
  Banknote,
} from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const inventory = data?.inventory || [];
  const recentTx = data?.recentTransactions || [];

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            Exchange Command Center
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Real-time overview of cash/bank balances, daily volumes, wallet capital, and exchange profits.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/wallet"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
          >
            <Wallet className="w-4 h-4" /> Wallet & Capital
          </Link>
          <Link
            href="/payments"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/20 transition"
          >
            <Banknote className="w-4 h-4" /> Payments Hub
          </Link>
          <Link
            href="/buying"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
          >
            <ArrowDownLeft className="w-4 h-4" /> Buy Trade
          </Link>
          <Link
            href="/selling"
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 transition"
          >
            <ArrowUpRight className="w-4 h-4" /> Sell Trade
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Today Buy Volume */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today Buy Volume</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            ${metrics.todayBuyVolume?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5" /> Express Buy Payouts
          </div>
        </div>

        {/* Metric 2: Today Sell Volume */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Today Sell Volume</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            ${metrics.todaySellVolume?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5" /> Express Sell Receipts
          </div>
        </div>

        {/* Metric 3: Estimated Net Profit */}
        <div className="glass-card rounded-2xl p-5 border border-indigo-500/30 relative overflow-hidden group bg-gradient-to-br from-indigo-950/40 to-slate-900/60">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 rounded-full blur-xl group-hover:bg-indigo-500/30 transition" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Est. Net Profit</span>
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            +${metrics.todayEstProfit?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-300 font-medium">
            Spread + Fees Earned Today
          </div>
        </div>

        {/* Metric 4: Active Parties */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Parties Directory</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-slate-300">Customers:</span>
              <span className="text-lg font-bold text-white">{metrics.customerCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span className="text-sm text-slate-300">Bankers:</span>
              <span className="text-lg font-bold text-white">{metrics.bankerCount}</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">All assigned custom exchange rate matrices active</div>
        </div>
      </div>

      {/* Main Grid: Inventory & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Currency Inventory / Holdings */}
        <div className="lg:col-span-2 glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Wallet className="w-5 h-5 text-indigo-400" /> Currency Inventory Holdings
              </h2>
              <p className="text-xs text-slate-400">Cash in safe vs Bank/Account balances per currency</p>
            </div>
            <Link
              href="/rates"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" /> Rate Setup
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Currency</th>
                  <th className="py-3 px-4">Cash Holding (Safe)</th>
                  <th className="py-3 px-4">Bank Holding (Account)</th>
                  <th className="py-3 px-4 text-right">Total Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {inventory.map((inv: any) => {
                  const total = inv.cashBalance + inv.bankBalance;
                  return (
                    <tr key={inv.currencyCode} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center text-xs">
                          {inv.currencyCode}
                        </span>
                        {inv.currencyCode}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-emerald-400">
                        <span className="flex items-center gap-1.5">
                          <Wallet className="w-3.5 h-3.5 text-slate-500" />
                          {inv.cashBalance.toLocaleString('en-US')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-cyan-400">
                        <span className="flex items-center gap-1.5">
                          <Landmark className="w-3.5 h-3.5 text-slate-500" />
                          {inv.bankBalance.toLocaleString('en-US')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-white">
                        {total.toLocaleString('en-US')} {inv.currencyCode}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Recent Transactions Feed */}
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" /> Recent Trades
              </h2>
              <Link href="/transactions" className="text-xs font-semibold text-slate-400 hover:text-white flex items-center gap-0.5">
                View All <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3">
              {recentTx.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-8">No recent transactions</div>
              ) : (
                recentTx.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center justify-between hover:border-slate-700 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-xl ${
                          tx.type === 'BUY'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {tx.type === 'BUY' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-semibold text-xs text-white flex items-center gap-2">
                          <span>{tx.party.name}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                            {tx.receiptNo}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {tx.type} {tx.fromCurrency} → {tx.toCurrency} @ {tx.appliedRate}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-xs text-white">
                        {tx.amountGiven.toLocaleString('en-US')} {tx.fromCurrency}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-medium">
                        +${tx.totalProfit.toFixed(2)} profit
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <Link
              href="/transactions"
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition"
            >
              Open Full Transactions History Ledger
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
