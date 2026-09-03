'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownLeft, Sparkles, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export default function BuyingPage() {
  const router = useRouter();

  const [parties, setParties] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);

  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [fromCurrency, setFromCurrency] = useState('INR');
  const [toCurrency, setToCurrency] = useState('USD');
  const [amountGiven, setAmountGiven] = useState<string>('1000');
  const [appliedRate, setAppliedRate] = useState<string>('88.50');
  const [isCustomRate, setIsCustomRate] = useState<boolean>(false);
  const [fee, setFee] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rateLoading, setRateLoading] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [partiesRes, currRes] = await Promise.all([
          fetch('/api/parties?type=CUSTOMER'),
          fetch('/api/currencies'),
        ]);

        const partiesJson = await partiesRes.json();
        const currJson = await currRes.json();

        if (partiesJson.success) {
          setParties(partiesJson.parties);
          if (partiesJson.parties.length > 0) {
            setSelectedPartyId(partiesJson.parties[0].id);
          }
        }

        if (currJson.success && currJson.currencies.length > 0) {
          setCurrencies(currJson.currencies);
          const baseCurr = currJson.currencies.find((c: any) => c.isBase) || currJson.currencies[0];
          const nonBaseCurr = currJson.currencies.find((c: any) => !c.isBase) || currJson.currencies[0];
          if (nonBaseCurr) setFromCurrency(nonBaseCurr.code);
          if (baseCurr) setToCurrency(baseCurr.code);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Whenever selectedPartyId or fromCurrency changes, pull effective custom rate
  useEffect(() => {
    if (!selectedPartyId || !fromCurrency) return;

    async function fetchPartyRate() {
      setRateLoading(true);
      try {
        const res = await fetch(`/api/rates?partyId=${selectedPartyId}&currencyCode=${fromCurrency}`);
        const json = await res.json();
        if (json.success && json.rateInfo) {
          setAppliedRate(json.rateInfo.appliedBuyRate.toString());
          setIsCustomRate(json.rateInfo.isCustom);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setRateLoading(false);
      }
    }

    fetchPartyRate();
  }, [selectedPartyId, fromCurrency]);

  const numAmount = parseFloat(amountGiven) || 0;
  const numRate = parseFloat(appliedRate) || 0;
  const numFee = parseFloat(fee) || 0;
  const amountReceived = numRate > 0 ? (numAmount / numRate).toFixed(2) : '0.00';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartyId || numAmount <= 0 || numRate <= 0) {
      setErrorMsg('Please enter valid trade parameters');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'BUY',
          partyId: selectedPartyId,
          fromCurrency,
          toCurrency,
          amountGiven: numAmount,
          appliedRate: numRate,
          fee: numFee,
          paymentMethod,
          notes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessReceipt(json.transaction);
      } else {
        setErrorMsg(json.error || 'Failed to execute buy transaction');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  const selectedParty = parties.find((p) => p.id === selectedPartyId);

  return (
    <div className="w-full space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
            Buy Currency Terminal
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Buy foreign currency or digital assets from Customers or Bankers using dynamic rate rules.
          </p>
        </div>
      </div>

      {/* Success Modal / Alert Banner */}
      {successReceipt && (
        <div className="glass-card rounded-2xl p-6 border border-emerald-500/40 bg-emerald-950/30 space-y-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            <div>
              <h3 className="font-bold text-lg text-emerald-300">Transaction Executed Successfully!</h3>
              <p className="text-xs text-slate-300">
                Receipt Number: <span className="font-mono font-bold text-white">{successReceipt.receiptNo}</span>
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-900/80 p-4 rounded-xl text-xs border border-slate-800">
            <div>
              <span className="text-slate-500 block">Customer</span>
              <span className="font-bold text-white">{selectedParty?.name}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Bought Amount</span>
              <span className="font-bold text-emerald-400">
                {successReceipt.amountGiven} {successReceipt.fromCurrency}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Applied Rate</span>
              <span className="font-bold text-amber-400">{successReceipt.appliedRate}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Total Payout</span>
              <span className="font-bold text-white">
                {successReceipt.amountReceived} {successReceipt.toCurrency}
              </span>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setSuccessReceipt(null);
                setAmountGiven('1000');
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
            >
              Execute Another Buy Order
            </button>
            <button
              onClick={() => router.push('/transactions')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
            >
              View in Ledger
            </button>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Main Order Form */}
      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 border border-slate-800 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Selection */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Select Customer *
            </label>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
            >
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {selectedParty && (
              <div className="text-[11px] text-slate-400 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 flex justify-between">
                <span>Customer: <strong className="text-indigo-400">{selectedParty.name}</strong></span>
                <span>Contact: <strong className="text-slate-300">{selectedParty.phone || 'N/A'}</strong></span>
              </div>
            )}
          </div>

          {/* Payment Method Account */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Payment Source / Settlement Account *
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-3 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  paymentMethod === 'CASH'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Cash Holding (Safe)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod('BANK')}
                className={`py-3 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                  paymentMethod === 'BANK'
                    ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Bank Transfer (Account)
              </button>
            </div>
          </div>
        </div>

        <hr className="border-slate-800" />

        {/* Currency Pair & Amount Input */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Buying Currency (From) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Buying Currency (Given) *
            </label>
            <select
              value={fromCurrency}
              onChange={(e) => setFromCurrency(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500 font-bold"
            >
              {currencies
                .filter((c) => !c.isBase)
                .map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} - {c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Amount Given */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Amount Given *
            </label>
            <input
              type="number"
              step="any"
              value={amountGiven}
              onChange={(e) => setAmountGiven(e.target.value)}
              placeholder="e.g. 5000"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Applied Buy Rate */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Applied Buy Rate *
              </label>
              {isCustomRate ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Party Custom Rate
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Default Base Rate</span>
              )}
            </div>
            <div className="relative">
              <input
                type="number"
                step="any"
                value={appliedRate}
                onChange={(e) => setAppliedRate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-amber-300 font-bold text-sm focus:outline-none focus:border-amber-500"
              />
              {rateLoading && (
                <RefreshCw className="w-4 h-4 animate-spin text-slate-500 absolute right-3 top-3.5" />
              )}
            </div>
          </div>
        </div>

        {/* Optional Fee & Notes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Processing Fee / Commission ($)
            </label>
            <input
              type="number"
              step="any"
              value={fee}
              onChange={(e) => setFee(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Transaction Notes / Ref
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Serial numbers, cash delivery notes..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Live Order Payout Preview Box */}
        <div className="p-5 rounded-xl bg-slate-900/90 border border-indigo-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider block font-semibold">
              Total Calculated Payout ({toCurrency})
            </span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-0.5">
              {amountReceived} {toCurrency}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Rate: <span className="text-white font-mono">{appliedRate}</span> ({fromCurrency} → {toCurrency})
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <ArrowDownLeft className="w-5 h-5" />
            )}
            Confirm & Execute Buy Order
          </button>
        </div>
      </form>
    </div>
  );
}
