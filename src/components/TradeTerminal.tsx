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
  Receipt,
  Printer,
  DollarSign,
  TrendingUp,
  Percent,
  Layers,
  Building2,
  Users,
  Wallet,
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

  // Asset & Currency
  const [assetCurrency, setAssetCurrency] = useState('USDT');
  const [fiatCurrency, setFiatCurrency] = useState('INR');

  // Volume
  const [usdtAmount, setUsdtAmount] = useState<string>('1000');

  // Buy Leg State (Customer)
  const [buyRate, setBuyRate] = useState<string>('88.50');
  const [isCustomBuyRate, setIsCustomBuyRate] = useState<boolean>(false);
  const [buyPaymentMethod, setBuyPaymentMethod] = useState<'CASH' | 'BANK'>('CASH');
  const [buyAmountINR, setBuyAmountINR] = useState<string>('88500');
  const [buyFee, setBuyFee] = useState<string>('0');
  const [buyNotes, setBuyNotes] = useState('');

  // Sell Leg State (Banker)
  const [sellRate, setSellRate] = useState<string>('89.20');
  const [isCustomSellRate, setIsCustomSellRate] = useState<boolean>(false);
  const [sellPaymentMethod, setSellPaymentMethod] = useState<'CASH' | 'BANK'>('BANK');
  const [sellAmountINR, setSellAmountINR] = useState<string>('89200');
  const [sellFee, setSellFee] = useState<string>('0');
  const [sellNotes, setSellNotes] = useState('');

  // Global Deal Notes & Date
  const [dealNotes, setDealNotes] = useState('');
  const [customDateTime, setCustomDateTime] = useState<string>('');

  // UI States
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [buyRateLoading, setBuyRateLoading] = useState(false);
  const [sellRateLoading, setSellRateLoading] = useState(false);
  const [successReceipts, setSuccessReceipts] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setCustomDateTime(getWorkingDateTimeISO());
  }, []);

  // Load parties and currencies
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
          const usdt = currJson.currencies.find((c: any) => c.code === 'USDT' || c.code === 'USD');
          if (usdt) {
            setAssetCurrency(usdt.code);
            setBuyRate(usdt.defaultBuyRate?.toString() || '88.50');
            setSellRate(usdt.defaultSellRate?.toString() || '89.20');
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

  // Fetch customer rate
  useEffect(() => {
    if (!selectedCustomerId || !assetCurrency) return;
    async function fetchCustomerRate() {
      setBuyRateLoading(true);
      try {
        const res = await fetch(`/api/rates?partyId=${selectedCustomerId}&currencyCode=${assetCurrency}`);
        const json = await res.json();
        if (json.success && json.rateInfo) {
          const rateVal = json.rateInfo.appliedBuyRate.toString();
          setBuyRate(rateVal);
          setIsCustomBuyRate(json.rateInfo.isCustom);
          const numU = parseFloat(usdtAmount) || 0;
          const numR = parseFloat(rateVal) || 0;
          setBuyAmountINR((numU * numR).toFixed(2));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setBuyRateLoading(false);
      }
    }
    fetchCustomerRate();
  }, [selectedCustomerId, assetCurrency]);

  // Fetch banker rate
  useEffect(() => {
    if (!selectedBankerId || !assetCurrency) return;
    async function fetchBankerRate() {
      setSellRateLoading(true);
      try {
        const res = await fetch(`/api/rates?partyId=${selectedBankerId}&currencyCode=${assetCurrency}`);
        const json = await res.json();
        if (json.success && json.rateInfo) {
          const rateVal = json.rateInfo.appliedSellRate.toString();
          setSellRate(rateVal);
          setIsCustomSellRate(json.rateInfo.isCustom);
          const numU = parseFloat(usdtAmount) || 0;
          const numR = parseFloat(rateVal) || 0;
          setSellAmountINR((numU * numR).toFixed(2));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setSellRateLoading(false);
      }
    }
    fetchBankerRate();
  }, [selectedBankerId, assetCurrency]);

  // Handle USDT amount changes
  const handleUsdtChange = (val: string) => {
    setUsdtAmount(val);
    const numU = parseFloat(val) || 0;
    const numBuyR = parseFloat(buyRate) || 0;
    const numSellR = parseFloat(sellRate) || 0;
    setBuyAmountINR(numU > 0 && numBuyR > 0 ? (numU * numBuyR).toFixed(2) : '');
    setSellAmountINR(numU > 0 && numSellR > 0 ? (numU * numSellR).toFixed(2) : '');
  };

  // Handle Buy Rate changes
  const handleBuyRateChange = (val: string) => {
    setBuyRate(val);
    const numU = parseFloat(usdtAmount) || 0;
    const numR = parseFloat(val) || 0;
    if (numU > 0 && numR > 0) {
      setBuyAmountINR((numU * numR).toFixed(2));
    }
  };

  // Handle Sell Rate changes
  const handleSellRateChange = (val: string) => {
    setSellRate(val);
    const numU = parseFloat(usdtAmount) || 0;
    const numR = parseFloat(val) || 0;
    if (numU > 0 && numR > 0) {
      setSellAmountINR((numU * numR).toFixed(2));
    }
  };

  // Handle Buy Amount INR change (adjusts USDT or Rate)
  const handleBuyAmountChange = (val: string) => {
    setBuyAmountINR(val);
    const numINR = parseFloat(val) || 0;
    const numR = parseFloat(buyRate) || 0;
    if (mode === 'BUY' && numINR > 0 && numR > 0) {
      setUsdtAmount((numINR / numR).toFixed(2));
    }
  };

  // Handle Sell Amount INR change
  const handleSellAmountChange = (val: string) => {
    setSellAmountINR(val);
    const numINR = parseFloat(val) || 0;
    const numR = parseFloat(sellRate) || 0;
    if (mode === 'SELL' && numINR > 0 && numR > 0) {
      setUsdtAmount((numINR / numR).toFixed(2));
    }
  };

  // Calculations
  const numUsdt = parseFloat(usdtAmount) || 0;
  const numBuyRate = parseFloat(buyRate) || 0;
  const numSellRate = parseFloat(sellRate) || 0;
  const numBuyINR = parseFloat(buyAmountINR) || (numUsdt * numBuyRate);
  const numSellINR = parseFloat(sellAmountINR) || (numUsdt * numSellRate);
  const numBuyFee = parseFloat(buyFee) || 0;
  const numSellFee = parseFloat(sellFee) || 0;

  const spreadPerUnit = numSellRate - numBuyRate;
  const grossProfitINR = numSellINR - numBuyINR + numBuyFee + numSellFee;
  const grossProfitUSDT = numSellRate > 0 ? grossProfitINR / numSellRate : 0;
  const profitMarginPercent = numBuyINR > 0 ? (grossProfitINR / numBuyINR) * 100 : 0;

  // Selected party objects
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);
  const selectedBanker = bankers.find((b) => b.id === selectedBankerId);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (mode === 'DEAL') {
      if (!selectedCustomerId || !selectedBankerId) {
        setErrorMsg('Please select both a Customer and a Banker for the deal');
        return;
      }
      if (numUsdt <= 0 || numBuyRate <= 0 || numSellRate <= 0) {
        setErrorMsg('Please enter valid USDT volume and rates');
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
            usdtAmount: numUsdt,
            buyRate: numBuyRate,
            sellRate: numSellRate,
            buyAmountINR: numBuyINR,
            sellAmountINR: numSellINR,
            buyPaymentMethod,
            sellPaymentMethod,
            buyFee: numBuyFee,
            sellFee: numSellFee,
            notes: dealNotes || buyNotes || sellNotes || undefined,
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
          });
          setCustomDateTime(getWorkingDateTimeISO());
        } else {
          setErrorMsg(json.error || 'Failed to record deal transactions');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error submitting deal');
      } finally {
        setSubmitting(false);
      }
    } else if (mode === 'BUY') {
      if (!selectedCustomerId || numBuyINR <= 0 || numBuyRate <= 0) {
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
            amountGiven: numBuyINR,
            appliedRate: numBuyRate,
            fee: numBuyFee,
            paymentMethod: buyPaymentMethod,
            notes: buyNotes || dealNotes || undefined,
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
        } else {
          setErrorMsg(json.error || 'Failed to execute buy transaction');
        }
      } catch (err: any) {
        setErrorMsg(err.message || 'Error submitting buy order');
      } finally {
        setSubmitting(false);
      }
    } else if (mode === 'SELL') {
      if (!selectedBankerId || numSellINR <= 0 || numSellRate <= 0) {
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
            amountGiven: numSellINR,
            appliedRate: numSellRate,
            fee: numSellFee,
            paymentMethod: sellPaymentMethod,
            notes: sellNotes || dealNotes || undefined,
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
    <div className="w-full space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            Unified Trade Terminal
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Record paired 2-in-1 exchange deals or single orders with live rate calculations and profit analytics.
          </p>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setMode('DEAL')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'DEAL'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" /> Complete Deal (2-in-1)
          </button>
          <button
            type="button"
            onClick={() => setMode('BUY')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'BUY'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" /> Buy Only
          </button>
          <button
            type="button"
            onClick={() => setMode('SELL')}
            className={`px-3 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              mode === 'SELL'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" /> Sell Only
          </button>
        </div>
      </div>

      {/* Success Notification Banner / Modal */}
      {successReceipts && (
        <div className="glass-card rounded-2xl p-6 border border-emerald-500/40 bg-emerald-950/30 space-y-4 animate-fadeIn shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-7 h-7 text-emerald-400 shrink-0" />
              <div>
                <h3 className="font-bold text-lg text-emerald-300">
                  {successReceipts.type === 'DEAL'
                    ? '2-in-1 Trade Deal Executed Successfully!'
                    : successReceipts.type === 'BUY'
                    ? 'Buy Order Executed Successfully!'
                    : 'Sell Order Executed Successfully!'}
                </h3>
                <p className="text-xs text-slate-300">
                  {successReceipts.type === 'DEAL'
                    ? 'Two linked transactions were recorded into the master ledger with updated inventories.'
                    : 'Transaction was successfully logged and inventory balances adjusted.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSuccessReceipts(null)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            >
              Dismiss
            </button>
          </div>

          {/* Dual Receipts Card */}
          {successReceipts.type === 'DEAL' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Buy Receipt Box */}
              <div className="bg-slate-900/90 p-4 rounded-xl border border-emerald-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <ArrowDownLeft className="w-3.5 h-3.5" /> Buy Leg (Customer)
                  </span>
                  <span className="font-mono text-xs font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {successReceipts.buyTransaction.receiptNo}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Customer</span>
                    <span className="font-bold text-white">{successReceipts.customerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Payout (INR)</span>
                    <span className="font-bold text-emerald-400">₹{successReceipts.buyTransaction.amountGiven.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Applied Buy Rate</span>
                    <span className="font-bold text-amber-300">₹{successReceipts.buyTransaction.appliedRate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">USDT Received</span>
                    <span className="font-bold text-white">{successReceipts.buyTransaction.amountReceived} USDT</span>
                  </div>
                </div>
              </div>

              {/* Sell Receipt Box */}
              <div className="bg-slate-900/90 p-4 rounded-xl border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Sell Leg (Banker)
                  </span>
                  <span className="font-mono text-xs font-bold text-white bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    {successReceipts.sellTransaction.receiptNo}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Banker</span>
                    <span className="font-bold text-white">{successReceipts.bankerName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Collection (INR)</span>
                    <span className="font-bold text-amber-400">₹{successReceipts.sellTransaction.amountGiven.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Applied Sell Rate</span>
                    <span className="font-bold text-amber-300">₹{successReceipts.sellTransaction.appliedRate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">USDT Delivered</span>
                    <span className="font-bold text-white">{successReceipts.sellTransaction.amountReceived} USDT</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 text-xs">
              <span className="text-slate-400">Receipt No: </span>
              <span className="font-mono font-bold text-white">
                {successReceipts.buyTransaction?.receiptNo || successReceipts.sellTransaction?.receiptNo}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-2">
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

      {/* Main Trade Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Global Deal Settings Banner */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Trade Asset Volume ({assetCurrency})
              </span>
              <p className="text-[11px] text-slate-400">
                {mode === 'DEAL'
                  ? 'Shared USDT volume exchanged between Customer and Banker.'
                  : `Amount of ${assetCurrency} for this transaction.`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            {/* USDT Input */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">{assetCurrency}:</span>
              <div className="relative">
                <input
                  type="number"
                  step="any"
                  value={usdtAmount}
                  onChange={(e) => handleUsdtChange(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-36 bg-slate-950 border border-indigo-500/50 rounded-xl px-3 py-2 text-white font-extrabold text-sm focus:outline-none focus:border-indigo-400"
                />
              </div>
            </div>

            {/* Currency Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-semibold">Asset:</span>
              <select
                value={assetCurrency}
                onChange={(e) => setAssetCurrency(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-xs focus:outline-none focus:border-indigo-500"
              >
                {currencies
                  .filter((c) => !c.isBase)
                  .map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code}
                    </option>
                  ))}
              </select>
            </div>

            {/* Date & Time Picker */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-indigo-300 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Date:
              </span>
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="bg-slate-950 border border-indigo-500/40 rounded-xl px-3 py-2 text-indigo-200 font-bold text-xs focus:outline-none focus:border-indigo-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 2-COLUMN TRANSACTION CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN: BUY LEG (CUSTOMER) */}
          {(mode === 'DEAL' || mode === 'BUY') && (
            <div className="glass-card rounded-2xl p-6 border border-emerald-500/30 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 space-y-5">
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <ArrowDownLeft className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Buy Leg — Customer
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                        Payout INR
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      We buy USDT from customer and pay them INR.
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Select */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Select Customer *
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
                >
                  {customers.length === 0 ? (
                    <option value="">No customers registered yet</option>
                  ) : (
                    customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))
                  )}
                </select>
                {selectedCustomer && (
                  <div className="text-[10px] text-slate-400 flex justify-between px-1">
                    <span>Contact: {selectedCustomer.phone || 'N/A'}</span>
                    <span>Type: Customer</span>
                  </div>
                )}
              </div>

              {/* Buy Settlement Source */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Payout Settlement Source *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setBuyPaymentMethod('CASH')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      buyPaymentMethod === 'CASH'
                        ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Cash Safe
                  </button>
                  <button
                    type="button"
                    onClick={() => setBuyPaymentMethod('BANK')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      buyPaymentMethod === 'BANK'
                        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Bank Account
                  </button>
                </div>
              </div>

              {/* Buy Rate & Buy Amount INR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Applied Buy Rate */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Buy Rate (₹) *
                    </label>
                    {isCustomBuyRate ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Custom
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-500">Base</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={buyRate}
                      onChange={(e) => handleBuyRateChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-amber-300 font-extrabold text-xs focus:outline-none focus:border-amber-500"
                    />
                    {buyRateLoading && (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500 absolute right-3 top-3" />
                    )}
                  </div>
                </div>

                {/* Buy Amount INR Payout */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Total INR Payout (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={buyAmountINR}
                    onChange={(e) => handleBuyAmountChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-extrabold text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Fee & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Buy Commission / Fee (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={buyFee}
                    onChange={(e) => setBuyFee(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-slate-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Customer Notes
                  </label>
                  <input
                    type="text"
                    value={buyNotes}
                    onChange={(e) => setBuyNotes(e.target.value)}
                    placeholder="e.g. Cash handed over..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-slate-600"
                  />
                </div>
              </div>
            </div>
          )}

          {/* RIGHT COLUMN: SELL LEG (BANKER) */}
          {(mode === 'DEAL' || mode === 'SELL') && (
            <div className="glass-card rounded-2xl p-6 border border-amber-500/30 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 space-y-5">
              {/* Card Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      Sell Leg — Banker
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                        Collect INR
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      We sell USDT to banker and receive INR from them.
                    </p>
                  </div>
                </div>
              </div>

              {/* Banker Select */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Select Banker *
                </label>
                <select
                  value={selectedBankerId}
                  onChange={(e) => setSelectedBankerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs font-semibold focus:outline-none focus:border-amber-500"
                >
                  {bankers.length === 0 ? (
                    <option value="">No bankers registered yet</option>
                  ) : (
                    bankers.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} {b.phone ? `(${b.phone})` : ''}
                      </option>
                    ))
                  )}
                </select>
                {selectedBanker && (
                  <div className="text-[10px] text-slate-400 flex justify-between px-1">
                    <span>Contact: {selectedBanker.phone || 'N/A'}</span>
                    <span>Type: Banker</span>
                  </div>
                )}
              </div>

              {/* Sell Settlement Source */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  Collection Settlement Source *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSellPaymentMethod('CASH')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      sellPaymentMethod === 'CASH'
                        ? 'bg-amber-600/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Cash Safe
                  </button>
                  <button
                    type="button"
                    onClick={() => setSellPaymentMethod('BANK')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      sellPaymentMethod === 'BANK'
                        ? 'bg-cyan-600/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    Bank Account
                  </button>
                </div>
              </div>

              {/* Sell Rate & Sell Amount INR */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Applied Sell Rate */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                      Sell Rate (₹) *
                    </label>
                    {isCustomSellRate ? (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Custom
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-500">Base</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      value={sellRate}
                      onChange={(e) => handleSellRateChange(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-amber-300 font-extrabold text-xs focus:outline-none focus:border-amber-500"
                    />
                    {sellRateLoading && (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-500 absolute right-3 top-3" />
                    )}
                  </div>
                </div>

                {/* Sell Amount INR Collection */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                    Total INR Collection (₹) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={sellAmountINR}
                    onChange={(e) => handleSellAmountChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-extrabold text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Fee & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Sell Commission / Fee (₹)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={sellFee}
                    onChange={(e) => setSellFee(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-slate-600"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Banker Notes
                  </label>
                  <input
                    type="text"
                    value={sellNotes}
                    onChange={(e) => setSellNotes(e.target.value)}
                    placeholder="e.g. Bank IMPS reference..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-slate-600"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* LIVE DEAL METRICS & EXECUTE BAR */}
        <div className="glass-card rounded-2xl p-6 border border-indigo-500/40 bg-gradient-to-r from-slate-950 via-indigo-950/40 to-slate-950 space-y-4 shadow-2xl">
          {mode === 'DEAL' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-800/80">
              {/* Spread per USDT */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Net Spread per USDT
                </span>
                <div className={`text-xl font-extrabold mt-1 ${spreadPerUnit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {spreadPerUnit >= 0 ? '+' : ''}₹{spreadPerUnit.toFixed(3)}
                </div>
                <span className="text-[10px] text-slate-500">Sell ₹{numSellRate} - Buy ₹{numBuyRate}</span>
              </div>

              {/* Total INR Profit */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Gross Profit (INR)
                </span>
                <div className={`text-xl font-extrabold mt-1 ${grossProfitINR >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {grossProfitINR >= 0 ? '+' : ''}₹{grossProfitINR.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-slate-500">Margin: {profitMarginPercent.toFixed(2)}%</span>
              </div>

              {/* Total USDT Profit */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Est. Profit (USDT)
                </span>
                <div className={`text-xl font-extrabold mt-1 ${grossProfitUSDT >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {grossProfitUSDT >= 0 ? '+' : ''}${grossProfitUSDT.toFixed(2)} USDT
                </div>
                <span className="text-[10px] text-slate-500">at ₹{numSellRate}/USDT</span>
              </div>

              {/* Net Payout / Collection */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Trade Net Flow
                </span>
                <div className="text-xs text-white font-semibold mt-1">
                  Pay: <strong className="text-emerald-400">₹{numBuyINR.toLocaleString()}</strong>
                </div>
                <div className="text-xs text-white font-semibold">
                  Collect: <strong className="text-amber-400">₹{numSellINR.toLocaleString()}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
            <div className="text-xs text-slate-400">
              {mode === 'DEAL' ? (
                <>
                  Executing this will create <strong className="text-emerald-300">Buy Receipt</strong> for {selectedCustomer?.name || 'Customer'} and{' '}
                  <strong className="text-amber-300">Sell Receipt</strong> for {selectedBanker?.name || 'Banker'} atomically.
                </>
              ) : mode === 'BUY' ? (
                <>Will record single BUY transaction for {selectedCustomer?.name || 'Customer'}.</>
              ) : (
                <>Will record single SELL transaction for {selectedBanker?.name || 'Banker'}.</>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className={`px-8 py-4 rounded-xl font-extrabold text-sm text-white shadow-xl transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 ${
                mode === 'DEAL'
                  ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 shadow-indigo-600/30'
                  : mode === 'BUY'
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                  : 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/30'
              }`}
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Recording Transactions...
                </>
              ) : mode === 'DEAL' ? (
                <>
                  <ArrowLeftRight className="w-5 h-5" />
                  Confirm & Record Both Transactions
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
        </div>
      </form>
    </div>
  );
}
