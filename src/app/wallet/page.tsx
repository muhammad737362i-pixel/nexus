'use client';

import { useState, useEffect } from 'react';
import {
  Wallet,
  Landmark,
  PlusCircle,
  MinusCircle,
  ArrowLeftRight,
  TrendingUp,
  Sliders,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Building,
} from 'lucide-react';

export default function WalletPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Form State
  const [actionType, setActionType] = useState<string>('CAPITAL_DEPOSIT');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USD');
  const [amount, setAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [sourceOrDestination, setSourceOrDestination] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const fetchWallet = async () => {
    try {
      const res = await fetch('/api/wallet');
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.currencies && json.currencies.length > 0 && !selectedCurrency) {
          setSelectedCurrency(json.currencies[0].code);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const openActionModal = (type: string, currencyCode?: string) => {
    setActionType(type);
    if (currencyCode) setSelectedCurrency(currencyCode);
    setAmount('');
    setSourceOrDestination('');
    setNotes('');
    setError(null);
    setSuccessMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: actionType,
          currencyCode: selectedCurrency,
          amount: numAmount,
          paymentMethod,
          sourceOrDestination,
          notes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg('Wallet transaction recorded successfully!');
        await fetchWallet();
        setTimeout(() => {
          setModalOpen(false);
          setSuccessMsg(null);
        }, 1200);
      } else {
        setError(json.error || 'Failed to execute wallet transaction');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const inventories = data?.inventories || [];
  const currencies = data?.currencies || [];
  const transactions = data?.transactions || [];

  return (
    <div className="w-full space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Wallet className="w-7 h-7 text-indigo-400" /> Wallet & Capital Control Center
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => openActionModal('CAPITAL_DEPOSIT')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" /> Add Money / Inject Capital
          </button>
          <button
            onClick={() => openActionModal('CAPITAL_WITHDRAWAL')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white text-xs font-semibold shadow-lg shadow-rose-600/20 transition cursor-pointer"
          >
            <MinusCircle className="w-4 h-4" /> Draw / Withdraw Capital
          </button>
          <button
            onClick={() => openActionModal('TRANSFER_CASH_TO_BANK')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition cursor-pointer"
          >
            <ArrowLeftRight className="w-4 h-4" /> Transfer Cash ↔ Bank
          </button>
        </div>
      </div>

      {/* Main Balance Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Main Balance Total */}
        <div className="glass-card rounded-2xl p-5 border border-indigo-500/40 relative overflow-hidden group bg-gradient-to-br from-indigo-950/50 via-slate-900/80 to-slate-900">
          <div className="absolute top-0 right-0 w-28 h-28 bg-indigo-500/20 rounded-full blur-2xl group-hover:bg-indigo-500/30 transition" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Total Main Balance</span>
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white tracking-tight">
            ${summary.totalMainBalance?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-300 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Total Liquid Capital ({summary.baseCurrencyCode})
          </div>
        </div>

        {/* Card 2: Cash in Vault */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cash Safe / Vault</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            ${summary.totalCashValuation?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            Physical Cash Reserves
          </div>
        </div>

        {/* Card 3: Bank Accounts */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bank Accounts</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-cyan-400">
            ${summary.totalBankValuation?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
            Digital Bank Holdings
          </div>
        </div>

        {/* Card 4: Currency Breakdown Stats */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Configured Vaults</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {currencies.length} <span className="text-sm font-normal text-slate-400">Currencies</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-purple-400">
            Ready for buying & selling trades
          </div>
        </div>
      </div>

      {/* Per-Currency Vault Cards Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-400" /> Currency Capital Vaults
          </h2>
          <span className="text-xs text-slate-400">Cash Safe vs Bank Account holdings per currency</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {inventories.map((inv: any) => {
            const total = inv.cashBalance + inv.bankBalance;
            const currObj = currencies.find((c: any) => c.code === inv.currencyCode);
            const isBase = currObj?.isBase;

            return (
              <div
                key={inv.currencyCode}
                className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-indigo-500/40 transition space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-sm">
                      {inv.currencyCode}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{inv.currencyCode}</h3>
                      <p className="text-xs text-slate-400">{currObj?.name || 'Currency Vault'}</p>
                    </div>
                  </div>
                  {isBase && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Base Currency
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Wallet className="w-3.5 h-3.5 text-emerald-400" /> Cash Safe
                    </span>
                    <div className="font-bold text-sm text-emerald-400 mt-1">
                      {inv.cashBalance.toLocaleString('en-US')} {inv.currencyCode}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Landmark className="w-3.5 h-3.5 text-cyan-400" /> Bank Account
                    </span>
                    <div className="font-bold text-sm text-cyan-400 mt-1">
                      {inv.bankBalance.toLocaleString('en-US')} {inv.currencyCode}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-400 font-medium">Combined Vault Total:</span>
                  <span className="text-base font-extrabold text-white">
                    {total.toLocaleString('en-US')} {inv.currencyCode}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                  <button
                    onClick={() => openActionModal('CAPITAL_DEPOSIT', inv.currencyCode)}
                    className="w-full py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> + Deposit
                  </button>
                  <button
                    onClick={() => openActionModal('TRANSFER_CASH_TO_BANK', inv.currencyCode)}
                    className="w-full py-2 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" /> Transfer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audit Trail & Capital History Table */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" /> Capital & Wallet Audit Trail
            </h2>
            <p className="text-xs text-slate-400">Full record of money added, withdrawn, transferred, or adjusted</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Action Type</th>
                <th className="py-3 px-4">Account / Channel</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Source / Destination</th>
                <th className="py-3 px-4">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    No capital transactions recorded yet. Click "Add Money / Inject Capital" to begin.
                  </td>
                </tr>
              ) : (
                transactions.map((tx: any) => {
                  const isDeposit = tx.type === 'CAPITAL_DEPOSIT';
                  const isWithdrawal = tx.type === 'CAPITAL_WITHDRAWAL';
                  const isTransfer = tx.type.includes('TRANSFER');

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/40 transition text-xs">
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                            isDeposit
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isWithdrawal
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : isTransfer
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {isDeposit && '+ CAPITAL INJECT'}
                          {isWithdrawal && '- CAPITAL DRAW'}
                          {tx.type === 'TRANSFER_CASH_TO_BANK' && '⇆ CASH → BANK'}
                          {tx.type === 'TRANSFER_BANK_TO_CASH' && '⇆ BANK → CASH'}
                          {tx.type === 'ADJUSTMENT' && '⚙ ADJUSTMENT'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-300">
                        {tx.paymentMethod === 'BANK' ? '🏛️ Bank Account' : '💵 Cash Safe'}
                      </td>
                      <td className="py-3 px-4 font-bold text-white">
                        <span className={isDeposit ? 'text-emerald-400' : isWithdrawal ? 'text-rose-400' : 'text-white'}>
                          {isDeposit ? '+' : isWithdrawal ? '-' : ''}
                          {tx.amount.toLocaleString('en-US')} {tx.currencyCode}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 font-medium">{tx.sourceOrDestination || '—'}</td>
                      <td className="py-3 px-4 text-slate-400 italic">{tx.notes || '—'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modal Dialog */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card rounded-2xl w-full max-w-lg p-6 border border-slate-800 shadow-2xl relative space-y-5 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-400" /> Record Wallet / Capital Transaction
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-0.5 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Action Type Selector */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  Transaction Category
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="CAPITAL_DEPOSIT">➕ Add Capital / Deposit Money (Owner Investment)</option>
                  <option value="CAPITAL_WITHDRAWAL">➖ Withdraw Capital (Owner Draw / Expense)</option>
                  <option value="TRANSFER_CASH_TO_BANK">⇆ Transfer Funds: Cash Safe → Bank Account</option>
                  <option value="TRANSFER_BANK_TO_CASH">⇆ Transfer Funds: Bank Account → Cash Safe</option>
                  <option value="ADJUSTMENT">⚙ Audit Balance Adjustment</option>
                </select>
              </div>

              {/* Currency & Amount Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    Currency
                  </label>
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500"
                  >
                    {currencies.map((c: any) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Payment Method / Account Target */}
              {actionType !== 'TRANSFER_CASH_TO_BANK' && actionType !== 'TRANSFER_BANK_TO_CASH' && (
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    Target Account / Safe
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CASH">💵 Cash Safe / Vault</option>
                    <option value="BANK">🏛️ Bank Account / Digital Liquidity</option>
                  </select>
                </div>
              )}

              {/* Source / Destination Details */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  Source / Reference Info (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Personal Savings, Meezan Bank, Cash Vault #1"
                  value={sourceOrDestination}
                  onChange={(e) => setSourceOrDestination(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  Internal Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Add details about this capital injection or transfer..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Recording...' : 'Confirm & Update Balance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
