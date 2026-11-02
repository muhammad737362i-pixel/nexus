'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  DollarSign,
  Building2,
  Users,
} from 'lucide-react';
import { getWorkingDateTimeISO } from '@/lib/dateUtils';

export type TradeMode = 'DEAL' | 'BUY' | 'SELL';

interface TradeTerminalProps {
  initialMode?: TradeMode;
}

export default function TradeTerminal({ initialMode = 'DEAL' }: TradeTerminalProps) {
  const router = useRouter();

  const [mode, setMode] = useState<TradeMode>(initialMode);

  // Parties & Currencies lists
  const [customers, setCustomers] = useState<any[]>([]);
  const [bankers, setBankers] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);

  // Selected Parties
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedBankerId, setSelectedBankerId] = useState('');

  // Asset & Fiat
  const [assetCurrency, setAssetCurrency] = useState('USDT');
  const [fiatCurrency, setFiatCurrency] = useState('INR');

  // Trade Amount Currency Mode & Value (Default: INR, starts empty/0)
  const [inputCurrencyMode, setInputCurrencyMode] = useState<'INR' | 'USDT'>('INR');
  const [amountInput, setAmountInput] = useState<string>('');

  // Handle switching between INR and USDT without losing equivalent value
  const handleCurrencyModeChange = (newMode: 'INR' | 'USDT') => {
    if (newMode === inputCurrencyMode) return;
    const numAmt = parseFloat(amountInput);
    const numBR = parseFloat(buyRate) || 0;
    const numSR = parseFloat(sellRate) || 0;
    const rateToUse = mode === 'SELL' ? numSR : numBR;

    if (!isNaN(numAmt) && numAmt > 0 && rateToUse > 0) {
      if (newMode === 'USDT') {
        setAmountInput((numAmt / rateToUse).toFixed(2));
      } else {
        setAmountInput((numAmt * rateToUse).toFixed(2));
      }
    }
    setInputCurrencyMode(newMode);
  };

  // Rates (Auto-fetched from Rates Setup for INR)
  const [buyRate, setBuyRate] = useState<string>('88.50');
  const [sellRate, setSellRate] = useState<string>('89.20');
  const [isCustomBuyRate, setIsCustomBuyRate] = useState<boolean>(false);
  const [isCustomSellRate, setIsCustomSellRate] = useState<boolean>(false);
  // Transaction Date
  const [customDateTime, setCustomDateTime] = useState<string>('');

  // UI States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ratesLoading, setRatesLoading] = useState(false);
  const [successReceipts, setSuccessReceipts] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setCustomDateTime(getWorkingDateTimeISO());
  }, []);

  // Load initial parties and currencies
  useEffect(() => {
    async function loadData() {
      try {
        const [custRes, bankRes, currRes] = await Promise.all([
          fetch('/api/parties?type=CUSTOMER'),
          fetch('/api/parties?type=BANKER'),
          fetch('/api/currencies'),
        ]);

        const custJson = await custRes.json();
        const bankJson = await bankRes.json();
        const currJson = await currRes.json();

        if (custJson.success && custJson.parties) {
          setCustomers(custJson.parties);
          if (custJson.parties.length > 0) {
            setSelectedCustomerId(custJson.parties[0].id);
          }
        }

        if (bankJson.success && bankJson.parties) {
          setBankers(bankJson.parties);
          if (bankJson.parties.length > 0) {
            setSelectedBankerId(bankJson.parties[0].id);
          }
        }

        if (currJson.success && currJson.currencies) {
          setCurrencies(currJson.currencies);
          const inr = currJson.currencies.find((c: any) => c.code === 'INR');
          if (inr) {
            setFiatCurrency(inr.code);
            setBuyRate(inr.defaultBuyRate?.toString() || '88.50');
            setSellRate(inr.defaultSellRate?.toString() || '89.20');
          }
          const usdt = currJson.currencies.find((c: any) => c.code === 'USDT' || c.code === 'USD');
          if (usdt) {
            setAssetCurrency(usdt.code);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Automatically fetch customer's configured Buy Rate whenever customer changes
  useEffect(() => {
    if (!selectedCustomerId || !fiatCurrency) return;
    async function fetchCustomerRate() {
      setRatesLoading(true);
      try {
        const res = await fetch(`/api/rates?partyId=${selectedCustomerId}&currencyCode=${fiatCurrency}`);
        const json = await res.json();
        if (json.success && json.rateInfo) {
          setBuyRate(json.rateInfo.appliedBuyRate.toString());
          setIsCustomBuyRate(json.rateInfo.isCustom);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setRatesLoading(false);
      }
    }
    fetchCustomerRate();
  }, [selectedCustomerId, fiatCurrency]);

  // Automatically fetch banker's configured Sell Rate whenever banker changes
  useEffect(() => {
    if (!selectedBankerId || !fiatCurrency) return;
    async function fetchBankerRate() {
      setRatesLoading(true);
      try {
        const res = await fetch(`/api/rates?partyId=${selectedBankerId}&currencyCode=${fiatCurrency}`);
        const json = await res.json();
        if (json.success && json.rateInfo) {
          setSellRate(json.rateInfo.appliedSellRate.toString());
          setIsCustomSellRate(json.rateInfo.isCustom);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setRatesLoading(false);
      }
    }
    fetchBankerRate();
  }, [selectedBankerId, fiatCurrency]);

  // Calculations
  const numAmount = parseFloat(amountInput) || 0;
  const numBuyRate = parseFloat(buyRate) || 0;
  const numSellRate = parseFloat(sellRate) || 0;

  let customerUSDT = 0;
  let bankerUSDT = 0;
  let customerPayoutINR = 0;
  let bankerCollectionINR = 0;

  if (inputCurrencyMode === 'INR') {
    customerPayoutINR = Number(numAmount.toFixed(2));
    bankerCollectionINR = Number(numAmount.toFixed(2));
    customerUSDT = (numAmount > 0 && numBuyRate > 0) ? Number((numAmount / numBuyRate).toFixed(4)) : 0;
    bankerUSDT = (numAmount > 0 && numSellRate > 0) ? Number((numAmount / numSellRate).toFixed(4)) : 0;
  } else {
    // USDT mode
    customerUSDT = Number(numAmount.toFixed(4));
    bankerUSDT = Number(numAmount.toFixed(4));
    customerPayoutINR = Number((numAmount * numBuyRate).toFixed(2));
    bankerCollectionINR = Number((numAmount * numSellRate).toFixed(2));
  }

  const effectiveUSDT = mode === 'SELL' ? bankerUSDT : customerUSDT;
  const grossProfitUSDT = (customerUSDT > 0 && bankerUSDT > 0) ? Number((customerUSDT - bankerUSDT).toFixed(4)) : 0;
  const grossProfitINR = Number((bankerCollectionINR - customerPayoutINR).toFixed(2));
  const spreadPerUnit = Number((numSellRate - numBuyRate).toFixed(3));
  const profitMarginPercent = customerPayoutINR > 0 ? (grossProfitINR / customerPayoutINR) * 100 : 0;

  // Selected party objects
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedBanker = bankers.find((b) => b.id === selectedBankerId);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (mode === 'DEAL') {
      if (!selectedCustomerId) {
        setErrorMsg('Please select a Customer');
        return;
      }
      if (!selectedBankerId) {
        setErrorMsg('Please select a Banker');
        return;
      }
      if (numAmount <= 0) {
        setErrorMsg(`Please enter a valid trade amount in ${inputCurrencyMode}`);
        return;
      }
      if (effectiveUSDT <= 0) {
        setErrorMsg('Calculated trade volume is invalid');
        return;
      }
      if (numBuyRate <= 0 || numSellRate <= 0) {
        setErrorMsg('Valid Buy Rate and Sell Rate are required');
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch('/api/transactions/deal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: selectedCustomerId,
            bankerId: selectedBankerId,
            fromCurrency: fiatCurrency,
            toCurrency: assetCurrency,
            usdtAmount: effectiveUSDT,
            buyUsdtAmount: customerUSDT,
            sellUsdtAmount: bankerUSDT,
            buyRate: numBuyRate,
            sellRate: numSellRate,
            buyAmountINR: customerPayoutINR,
            sellAmountINR: bankerCollectionINR,
            buyPaymentMethod: 'CASH',
            sellPaymentMethod: 'CASH',
            createdAt: customDateTime || undefined,
          }),
        });

        const json = await res.json();
        if (json.success) {
          setSuccessReceipts({
            type: 'DEAL',
            buyTransaction: json.buyTransaction,
            sellTransaction: json.sellTransaction,
            grossProfitINR: json.grossProfitINR,
            grossProfitUSDT: json.grossProfitUSDT,
            spreadPerUSDT: json.spreadPerUSDT,
            customerName: selectedCustomer?.name,
            bankerName: selectedBanker?.name,
            customerUSDT,
            bankerUSDT,
            payoutINR: customerPayoutINR,
            collectionINR: bankerCollectionINR,
            usdtAmount: effectiveUSDT,
          });
          setCustomDateTime(getWorkingDateTimeISO());
          setAmountInput('');
        } else {
          setErrorMsg(json.error || 'Failed to record transaction deal');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error submitting deal');
      } finally {
        setSubmitting(false);
      }
    } else if (mode === 'BUY') {
      if (!selectedCustomerId || customerPayoutINR <= 0 || numBuyRate <= 0) {
        setErrorMsg('Please enter valid buy parameters');
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'BUY',
            partyId: selectedCustomerId,
            fromCurrency: fiatCurrency,
            toCurrency: assetCurrency,
            amountGiven: customerPayoutINR,
            appliedRate: numBuyRate,
            fee: 0,
            paymentMethod: 'CASH',
            createdAt: customDateTime || undefined,
          }),
        });

        const json = await res.json();
        if (json.success) {
          setSuccessReceipts({
            type: 'BUY',
            buyTransaction: json.transaction,
            customerName: selectedCustomer?.name,
          });
          setCustomDateTime(getWorkingDateTimeISO());
          setAmountInput('');
        } else {
          setErrorMsg(json.error || 'Failed to execute buy transaction');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error submitting buy order');
      } finally {
        setSubmitting(false);
      }
    } else if (mode === 'SELL') {
      if (!selectedBankerId || bankerCollectionINR <= 0 || numSellRate <= 0) {
        setErrorMsg('Please enter valid sell parameters');
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'SELL',
            partyId: selectedBankerId,
            fromCurrency: fiatCurrency,
            toCurrency: assetCurrency,
            amountGiven: bankerCollectionINR,
            appliedRate: numSellRate,
            fee: 0,
            paymentMethod: 'CASH',
            createdAt: customDateTime || undefined,
          }),
        });

        const json = await res.json();
        if (json.success) {
          setSuccessReceipts({
            type: 'SELL',
            sellTransaction: json.transaction,
            bankerName: selectedBanker?.name,
          });
          setCustomDateTime(getWorkingDateTimeISO());
          setAmountInput('');
        } else {
          setErrorMsg(json.error || 'Failed to execute sell transaction');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error submitting sell order');
      } finally {
        setSubmitting(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 max-w-4xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            {mode === 'DEAL' ? 'New Trade Transaction' : mode === 'BUY' ? 'Buy Currency' : 'Sell Currency'}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {mode === 'DEAL'
              ? 'Select Customer and Banker to record the trade deal. Rates are auto-applied from the Rates Setup.'
              : 'Record a single transaction leg with configured party rates.'}
          </p>
        </div>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('DEAL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'DEAL'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" /> Deal (Customer + Banker)
          </button>
          <button
            type="button"
            onClick={() => setMode('BUY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'BUY'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" /> Buy Only
          </button>
          <button
            type="button"
            onClick={() => setMode('SELL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'SELL'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> Sell Only
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successReceipts && (
        <div className="glass-card rounded-2xl p-6 border border-emerald-500/40 bg-emerald-950/30 space-y-4 animate-fadeIn shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
              <div>
                <h3 className="font-bold text-lg text-emerald-300">
                  {successReceipts.type === 'DEAL'
                    ? 'Transaction Deal Recorded Successfully!'
                    : successReceipts.type === 'BUY'
                    ? 'Buy Transaction Executed!'
                    : 'Sell Transaction Executed!'}
                </h3>
                <p className="text-xs text-slate-300">
                  {successReceipts.type === 'DEAL'
                    ? 'Customer Buy and Banker Sell transactions were added automatically.'
                    : 'Transaction was added to the master ledger.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSuccessReceipts(null)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition"
            >
              Dismiss
            </button>
          </div>

          {/* Deal Confirmation Summary */}
          {successReceipts.type === 'DEAL' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 block text-[11px] font-semibold">Customer (Buy Leg)</span>
                <div className="font-bold text-white text-sm">{successReceipts.customerName}</div>
                <div className="text-emerald-400 font-mono font-bold text-sm">
                  {successReceipts.customerUSDT ?? successReceipts.usdtAmount} USDT
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  Receipt: <span className="text-white">{successReceipts.buyTransaction.receiptNo}</span>
                </div>
              </div>

              <div className="space-y-1 sm:border-l sm:border-slate-800 sm:pl-4">
                <span className="text-slate-400 block text-[11px] font-semibold">Banker (Sell Leg)</span>
                <div className="font-bold text-white text-sm">{successReceipts.bankerName}</div>
                <div className="text-amber-400 font-mono font-bold text-sm">
                  {successReceipts.bankerUSDT ?? successReceipts.usdtAmount} USDT
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  Receipt: <span className="text-white">{successReceipts.sellTransaction.receiptNo}</span>
                </div>
              </div>
            </div>
          )}

          {successReceipts.type === 'BUY' && (
            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="text-slate-400 block text-[11px] font-semibold">Customer (Buy Order)</span>
              <div className="font-bold text-white text-sm">{successReceipts.customerName}</div>
              <div className="text-emerald-400 font-mono font-bold">
                Paid ₹{successReceipts.buyTransaction.amountGiven.toLocaleString()} for {successReceipts.buyTransaction.amountReceived} USDT
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                Receipt: <span className="text-white">{successReceipts.buyTransaction.receiptNo}</span>
              </div>
            </div>
          )}

          {successReceipts.type === 'SELL' && (
            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="text-slate-400 block text-[11px] font-semibold">Banker (Sell Order)</span>
              <div className="font-bold text-white text-sm">{successReceipts.bankerName}</div>
              <div className="text-amber-400 font-mono font-bold">
                Collected ₹{successReceipts.sellTransaction.amountGiven.toLocaleString()} for {successReceipts.sellTransaction.amountReceived} USDT
              </div>
              <div className="text-slate-500 font-mono text-[11px]">
                Receipt: <span className="text-white">{successReceipts.sellTransaction.receiptNo}</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={() => setSuccessReceipts(null)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition"
            >
              Record Another Deal
            </button>
            <button
              onClick={() => router.push('/transactions')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              View in Transactions Audit Log
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

      {/* SINGLE UNIFIED TRANSACTION FORM */}
      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 sm:p-8 border border-slate-800 space-y-6 shadow-2xl">
        {/* Step 1: Select Parties */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">1</span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Select Counterparties</h2>
          </div>

          <div className={`grid grid-cols-1 ${mode === 'DEAL' ? 'sm:grid-cols-2' : ''} gap-4`}>
            {/* Customer Dropdown */}
            {(mode === 'DEAL' || mode === 'BUY') && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-emerald-400" /> Select Customer *
                  </label>
                  {isCustomBuyRate && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Custom Rate Active
                    </span>
                  )}
                </div>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-medium focus:outline-none focus:border-indigo-500"
                >
                  {customers.length === 0 ? (
                    <option value="">No customers found</option>
                  ) : (
                    customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))
                  )}
                </select>
                {selectedCustomer && (
                  <div className="text-[11px] text-slate-400 flex justify-between px-1">
                    <span>Contact: <strong className="text-slate-300">{selectedCustomer.phone || 'N/A'}</strong></span>
                    <span>Rate Applied: <strong className="text-emerald-400 font-mono">₹{buyRate}</strong></span>
                  </div>
                )}
              </div>
            )}

            {/* Banker Dropdown */}
            {(mode === 'DEAL' || mode === 'SELL') && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-400" /> Select Banker *
                  </label>
                  {isCustomSellRate && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Custom Rate Active
                    </span>
                  )}
                </div>
                <select
                  value={selectedBankerId}
                  onChange={(e) => setSelectedBankerId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm font-medium focus:outline-none focus:border-indigo-500"
                >
                  {bankers.length === 0 ? (
                    <option value="">No bankers found</option>
                  ) : (
                    bankers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.phone ? `(${b.phone})` : ''}
                      </option>
                    ))
                  )}
                </select>
                {selectedBanker && (
                  <div className="text-[11px] text-slate-400 flex justify-between px-1">
                    <span>Contact: <strong className="text-slate-300">{selectedBanker.phone || 'N/A'}</strong></span>
                    <span>Rate Applied: <strong className="text-amber-400 font-mono">₹{sellRate}</strong></span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Trade Amount & Date */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">2</span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Amount & Date</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Amount Input with Currency Mode Toggle (Default: INR) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  {inputCurrencyMode === 'INR' ? (
                    <span className="text-emerald-400 font-extrabold text-sm leading-none">₹</span>
                  ) : (
                    <DollarSign className="w-4 h-4 text-indigo-400" />
                  )}
                  <span>Trade Amount ({inputCurrencyMode === 'INR' ? 'INR ₹' : 'USDT $'}) *</span>
                </label>

                {/* Instant Currency Toggle: INR (Default) vs USDT */}
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => handleCurrencyModeChange('INR')}
                    className={`px-2.5 py-0.5 rounded-md transition cursor-pointer ${
                      inputCurrencyMode === 'INR'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ₹ INR
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCurrencyModeChange('USDT')}
                    className={`px-2.5 py-0.5 rounded-md transition cursor-pointer ${
                      inputCurrencyMode === 'USDT'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    $ USDT
                  </button>
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3.5 top-3 text-base font-extrabold text-slate-400 pointer-events-none select-none">
                  {inputCurrencyMode === 'INR' ? '₹' : '$'}
                </span>
                <input
                  type="number"
                  step="any"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="0"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-14 py-3 text-white font-extrabold text-base focus:outline-none focus:border-indigo-500"
                />
                <span className="absolute right-4 top-3.5 text-xs font-bold text-slate-400 pointer-events-none select-none">
                  {inputCurrencyMode}
                </span>
              </div>
            </div>

            {/* Transaction Date & Time */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-indigo-400" /> Transaction Date & Time
              </label>
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-indigo-200 font-bold text-xs focus:outline-none focus:border-indigo-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Step 3: Custom Rates */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold">3</span>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Custom Rates
            </h2>
          </div>

          <div className={`grid grid-cols-1 ${mode === 'DEAL' ? 'sm:grid-cols-2' : ''} gap-4`}>
            {(mode === 'DEAL' || mode === 'BUY') && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    Customer Buy Rate (₹) *
                  </label>
                  {isCustomBuyRate && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Party Custom Rate
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  value={buyRate}
                  onChange={(e) => setBuyRate(e.target.value)}
                  placeholder="e.g. 100.3"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-amber-300 font-bold text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            {(mode === 'DEAL' || mode === 'SELL') && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    Banker Sell Rate (₹) *
                  </label>
                  {isCustomSellRate && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" /> Party Custom Rate
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  value={sellRate}
                  onChange={(e) => setSellRate(e.target.value)}
                  placeholder="e.g. 101.0"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-amber-300 font-bold text-sm focus:outline-none focus:border-amber-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Big Action Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 rounded-xl font-extrabold text-base text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Recording Transactions...
              </>
            ) : mode === 'DEAL' ? (
              <>
                <ArrowLeftRight className="w-5 h-5" />
                Confirm & Record Transaction Deal
              </>
            ) : mode === 'BUY' ? (
              <>
                <ArrowDownLeft className="w-5 h-5" />
                Execute Buy Transaction
              </>
            ) : (
              <>
                <ArrowUpRight className="w-5 h-5" />
                Execute Sell Transaction
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
