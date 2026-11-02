'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeftRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  DollarSign,
  Building2,
  Users,
  Plus,
  Trash2,
  Split,
} from 'lucide-react';
import { getWorkingDateTimeISO } from '@/lib/dateUtils';

export type TradeMode = 'DEAL';

interface TradeTerminalProps {
  initialMode?: string;
}

export interface BankerAllocation {
  rowId: string;
  bankerId: string;
  amountINR: string;
  sellRate: string;
  isCustomRate: boolean;
}

export default function TradeTerminal({ initialMode }: TradeTerminalProps = {}) {
  const router = useRouter();

  // Parties & Currencies lists
  const [customers, setCustomers] = useState<any[]>([]);
  const [bankers, setBankers] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);

  // Selected Parties
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [bankerAllocations, setBankerAllocations] = useState<BankerAllocation[]>([]);

  // Asset & Fiat
  const [assetCurrency, setAssetCurrency] = useState('USDT');
  const [fiatCurrency, setFiatCurrency] = useState('INR');

  // Trade Amount Currency Mode & Value (Default: INR, starts empty/0)
  const [inputCurrencyMode, setInputCurrencyMode] = useState<'INR' | 'USDT'>('INR');
  const [amountInput, setAmountInput] = useState<string>('');

  // Customer Buy Rate
  const [buyRate, setBuyRate] = useState<string>('88.50');
  const [isCustomBuyRate, setIsCustomBuyRate] = useState<boolean>(false);

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

  // Fetch banker custom rate
  const fetchBankerCustomRate = async (bankerId: string, index: number) => {
    if (!bankerId || !fiatCurrency) return;
    try {
      const res = await fetch(`/api/rates?partyId=${bankerId}&currencyCode=${fiatCurrency}`);
      const json = await res.json();
      if (json.success && json.rateInfo) {
        setBankerAllocations((prev) => {
          if (!prev[index]) return prev;
          const copy = [...prev];
          copy[index] = {
            ...copy[index],
            sellRate: json.rateInfo.appliedSellRate.toString(),
            isCustomRate: json.rateInfo.isCustom,
          };
          return copy;
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

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

        let defaultSellRate = '89.20';
        if (currJson.success && currJson.currencies) {
          setCurrencies(currJson.currencies);
          const inr = currJson.currencies.find((c: any) => c.code === 'INR');
          if (inr) {
            setFiatCurrency(inr.code);
            setBuyRate(inr.defaultBuyRate?.toString() || '88.50');
            defaultSellRate = inr.defaultSellRate?.toString() || '89.20';
          }
          const usdt = currJson.currencies.find((c: any) => c.code === 'USDT' || c.code === 'USD');
          if (usdt) {
            setAssetCurrency(usdt.code);
          }
        }

        if (bankJson.success && bankJson.parties) {
          setBankers(bankJson.parties);
          if (bankJson.parties.length > 0) {
            const firstBanker = bankJson.parties[0];
            setBankerAllocations([
              {
                rowId: '1',
                bankerId: firstBanker.id,
                amountINR: '',
                sellRate: defaultSellRate,
                isCustomRate: false,
              },
            ]);
            // Load rate for first banker
            fetchBankerCustomRate(firstBanker.id, 0);
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

  // Handle switching between INR and USDT without losing equivalent value
  const handleCurrencyModeChange = (newMode: 'INR' | 'USDT') => {
    if (newMode === inputCurrencyMode) return;
    const numAmt = parseFloat(amountInput);
    const numBR = parseFloat(buyRate) || 0;
    const rateToUse = numBR > 0 ? numBR : 1;

    if (!isNaN(numAmt) && numAmt > 0 && rateToUse > 0) {
      if (newMode === 'USDT') {
        const newUsdt = (numAmt / rateToUse).toFixed(2);
        setAmountInput(newUsdt);
      } else {
        const newInr = (numAmt * rateToUse).toFixed(2);
        setAmountInput(newInr);
        if (bankerAllocations.length === 1) {
          setBankerAllocations((prev) => prev.map((b) => ({ ...b, amountINR: newInr })));
        }
      }
    }
    setInputCurrencyMode(newMode);
  };

  // Amount input change
  const handleAmountInputChange = (val: string) => {
    setAmountInput(val);
    const num = parseFloat(val) || 0;
    if (bankerAllocations.length === 1) {
      const inrValue = inputCurrencyMode === 'INR' ? val : (num * (parseFloat(buyRate) || 1)).toFixed(2);
      setBankerAllocations((prev) => {
        if (prev.length === 0) return prev;
        return [{ ...prev[0], amountINR: inrValue }];
      });
    }
  };

  // Derived Total Trade INR
  const numAmount = parseFloat(amountInput) || 0;
  const numBuyRate = parseFloat(buyRate) || 0;
  const totalTradeINR = inputCurrencyMode === 'INR'
    ? numAmount
    : Number((numAmount * (numBuyRate > 0 ? numBuyRate : 1)).toFixed(2));

  // Customer USDT
  const customerUSDT = (totalTradeINR > 0 && numBuyRate > 0)
    ? Number((totalTradeINR / numBuyRate).toFixed(4))
    : 0;

  // Banker Legs calculation
  const bankerLegsCalc = bankerAllocations.map((b) => {
    const bAmt = parseFloat(b.amountINR) || 0;
    const bRate = parseFloat(b.sellRate) || 0;
    const usdt = (bAmt > 0 && bRate > 0) ? Number((bAmt / bRate).toFixed(4)) : 0;
    return {
      ...b,
      numAmountINR: bAmt,
      numRate: bRate,
      usdt,
    };
  });

  const totalBankerAllocatedINR = bankerLegsCalc.reduce((sum, b) => sum + b.numAmountINR, 0);
  const totalBankerUSDT = Number(bankerLegsCalc.reduce((sum, b) => sum + b.usdt, 0).toFixed(4));
  const grossProfitUSDT = (customerUSDT > 0 && totalBankerUSDT > 0)
    ? Number((customerUSDT - totalBankerUSDT).toFixed(4))
    : 0;

  const allocationDiff = Number((totalTradeINR - totalBankerAllocatedINR).toFixed(2));
  const isAllocatedMatched = Math.abs(allocationDiff) < 0.05 && totalTradeINR > 0;
  const isOverAllocated = allocationDiff < -0.05;
  const isUnderAllocated = allocationDiff > 0.05;

  // Banker Management Handlers
  const handleAddBanker = () => {
    const selectedIds = new Set(bankerAllocations.map((b) => b.bankerId));
    const availableBanker = bankers.find((b) => !selectedIds.has(b.id)) || bankers[0];
    if (!availableBanker) return;

    const remaining = Math.max(0, totalTradeINR - totalBankerAllocatedINR);
    const inrCurrency = currencies.find((c) => c.code === 'INR');
    const defaultRate = inrCurrency?.defaultSellRate?.toString() || '89.20';

    const newRow: BankerAllocation = {
      rowId: Date.now().toString(),
      bankerId: availableBanker.id,
      amountINR: remaining > 0 ? remaining.toString() : '',
      sellRate: defaultRate,
      isCustomRate: false,
    };

    const newIndex = bankerAllocations.length;
    setBankerAllocations([...bankerAllocations, newRow]);
    fetchBankerCustomRate(availableBanker.id, newIndex);
  };

  const handleRemoveBanker = (index: number) => {
    if (bankerAllocations.length <= 1) return;
    const updated = bankerAllocations.filter((_, i) => i !== index);
    if (updated.length === 1 && totalTradeINR > 0) {
      updated[0].amountINR = totalTradeINR.toString();
    }
    setBankerAllocations(updated);
  };

  const handleBankerChange = (index: number, newBankerId: string) => {
    const updated = [...bankerAllocations];
    updated[index].bankerId = newBankerId;
    setBankerAllocations(updated);
    fetchBankerCustomRate(newBankerId, index);
  };

  const handleBankerAmountChange = (index: number, val: string) => {
    const updated = [...bankerAllocations];
    updated[index].amountINR = val;
    setBankerAllocations(updated);
  };

  const handleBankerRateChange = (index: number, rate: string) => {
    const updated = [...bankerAllocations];
    updated[index].sellRate = rate;
    setBankerAllocations(updated);
  };

  const handleFillRemaining = (index: number) => {
    const otherAllocated = bankerAllocations.reduce(
      (sum, b, i) => (i !== index ? sum + (parseFloat(b.amountINR) || 0) : sum),
      0
    );
    const remaining = Math.max(0, totalTradeINR - otherAllocated);
    const updated = [...bankerAllocations];
    updated[index].amountINR = remaining.toString();
    setBankerAllocations(updated);
  };

  // Selected customer object
  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedCustomerId) {
      setErrorMsg('Please select a Customer');
      return;
    }
    if (bankerAllocations.length === 0) {
      setErrorMsg('Please select at least one Banker');
      return;
    }
    if (totalTradeINR <= 0) {
      setErrorMsg(`Please enter a valid trade amount`);
      return;
    }
    if (numBuyRate <= 0) {
      setErrorMsg('Valid Customer Buy Rate is required');
      return;
    }

    for (let i = 0; i < bankerAllocations.length; i++) {
      const b = bankerAllocations[i];
      const amt = parseFloat(b.amountINR);
      const rate = parseFloat(b.sellRate);
      if (!b.bankerId) {
        setErrorMsg(`Banker #${i + 1} must be selected`);
        return;
      }
      if (isNaN(amt) || amt <= 0) {
        setErrorMsg(`Valid allocation amount is required for Banker #${i + 1}`);
        return;
      }
      if (isNaN(rate) || rate <= 0) {
        setErrorMsg(`Valid Sell Rate is required for Banker #${i + 1}`);
        return;
      }
    }

    if (bankerAllocations.length > 1 && !isAllocatedMatched) {
      setErrorMsg(
        `Total allocated to bankers (₹${totalBankerAllocatedINR.toLocaleString('en-IN')}) does not match the trade amount (₹${totalTradeINR.toLocaleString('en-IN')}). Please balance allocations before recording.`
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/transactions/deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          fromCurrency: fiatCurrency,
          toCurrency: assetCurrency,
          totalAmountINR: totalTradeINR,
          customerBuyRate: numBuyRate,
          bankers: bankerAllocations.map((b) => ({
            bankerId: b.bankerId,
            amountINR: parseFloat(b.amountINR),
            sellRate: parseFloat(b.sellRate),
          })),
          createdAt: customDateTime || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessReceipts({
          type: 'DEAL',
          dealGroupId: json.dealGroupId,
          isSplit: json.isSplit,
          legs: json.legs,
          buyTransaction: json.buyTransaction,
          sellTransaction: json.sellTransaction,
          totalAmountINR: totalTradeINR,
          customerName: selectedCustomer?.name,
          totalCustomerUSDT: json.totalCustomerUSDT ?? customerUSDT,
          totalBankerUSDT: json.totalBankerUSDT ?? totalBankerUSDT,
          totalProfitUSDT: json.totalProfitUSDT ?? grossProfitUSDT,
          bankerName: bankers.find((b) => b.id === bankerAllocations[0]?.bankerId)?.name,
          customerUSDT,
          bankerUSDT: totalBankerUSDT,
          usdtAmount: customerUSDT,
        });
        setCustomDateTime(getWorkingDateTimeISO());
        setAmountInput('');
        // Reset single banker allocation amount
        setBankerAllocations((prev) =>
          prev.slice(0, 1).map((b) => ({ ...b, amountINR: '' }))
        );
      } else {
        setErrorMsg(json.error || 'Failed to record transaction deal');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error submitting deal');
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

  return (
    <div className="w-full space-y-6 max-w-4xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            New Trade Transaction
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Record customer trade deals with single or multiple bankers. Rates are auto-applied from Rates Setup.
          </p>
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
                  {successReceipts.isSplit
                    ? 'Multi-Banker Split Deal Recorded Successfully!'
                    : 'Transaction Deal Recorded Successfully!'}
                </h3>
                <p className="text-xs text-slate-300">
                  {successReceipts.isSplit
                    ? `Customer Buy and ${successReceipts.legs?.length || 2} Banker Sell transactions recorded under Group ${successReceipts.dealGroupId}.`
                    : 'Customer Buy and Banker Sell transactions were added automatically.'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSuccessReceipts(null)}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>

          {/* Deal Confirmation Summary */}
          <div className="space-y-3">
            {/* Customer Order summary */}
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-400 text-[11px] block font-semibold">Customer (Buy Order)</span>
                <strong className="text-white text-sm">{successReceipts.customerName}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[11px] block font-semibold">Total USDT Delivered</span>
                <strong className="text-emerald-400 font-mono text-sm">
                  {successReceipts.totalCustomerUSDT ?? successReceipts.customerUSDT} USDT
                </strong>
              </div>
            </div>

            {/* Banker Legs summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {successReceipts.legs && successReceipts.legs.length > 0 ? (
                successReceipts.legs.map((leg: any, idx: number) => (
                  <div key={idx} className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-amber-400 font-bold uppercase">
                        Banker #{idx + 1} ({leg.splitLeg})
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {leg.sellTransaction?.receiptNo}
                      </span>
                    </div>
                    <div className="font-bold text-white text-sm">{leg.bankerName}</div>
                    <div className="flex justify-between text-slate-400 pt-1">
                      <span>
                        Allocated: <strong className="text-white font-mono">₹{leg.amountINR?.toLocaleString('en-IN')}</strong>
                      </span>
                      <span className="text-amber-400 font-mono font-bold">{leg.bankerUSDT} USDT</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono">
                      Leg Profit: +${leg.profitUSDT} USDT (@ ₹{leg.bankerRate})
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1 sm:col-span-2">
                  <span className="text-slate-400 block text-[11px] font-semibold">Banker (Sell Leg)</span>
                  <div className="font-bold text-white text-sm">{successReceipts.bankerName}</div>
                  <div className="text-amber-400 font-mono font-bold text-sm">
                    {successReceipts.bankerUSDT ?? successReceipts.usdtAmount} USDT
                  </div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    Receipt: <span className="text-white">{successReceipts.sellTransaction?.receiptNo}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center text-xs">
              <span className="font-bold text-emerald-300">Total Net Deal Profit:</span>
              <span className="font-mono font-extrabold text-emerald-400 text-sm">
                +${(successReceipts.totalProfitUSDT ?? successReceipts.grossProfitUSDT)?.toFixed(2)} USDT
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 pt-1">
            <button
              onClick={() => setSuccessReceipts(null)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Record Another Deal
            </button>
            <button
              onClick={() => router.push('/transactions')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Customer Dropdown */}
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

            {/* Banker Sourcing Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-amber-400" /> Select Banker(s) *
                </label>
                <button
                  type="button"
                  onClick={handleAddBanker}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-bold border border-indigo-500/30 flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Another Banker (Split)
                </button>
              </div>

              {/* Multi-banker Allocation status banner */}
              {bankerAllocations.length > 1 && (
                <div
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-semibold ${
                    isAllocatedMatched
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      : isOverAllocated
                      ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <Split className="w-4 h-4 shrink-0" />
                    <span>
                      {isAllocatedMatched ? (
                        <>✓ Split 100% matched: ₹{totalBankerAllocatedINR.toLocaleString('en-IN')}</>
                      ) : isOverAllocated ? (
                        <>⚠️ Over-allocated by ₹{Math.abs(allocationDiff).toLocaleString('en-IN')}</>
                      ) : (
                        <>
                          ₹{totalBankerAllocatedINR.toLocaleString('en-IN')} of ₹{totalTradeINR.toLocaleString('en-IN')} allocated
                          (₹{allocationDiff.toLocaleString('en-IN')} remaining)
                        </>
                      )}
                    </span>
                  </div>
                  {isUnderAllocated && (
                    <button
                      type="button"
                      onClick={() => handleFillRemaining(bankerAllocations.length - 1)}
                      className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-[11px] font-bold border border-amber-500/30 transition cursor-pointer"
                    >
                      Fill Remaining to Banker #{bankerAllocations.length}
                    </button>
                  )}
                </div>
              )}

              {/* Banker Rows */}
              <div className="space-y-3">
                {bankerAllocations.map((allocation, index) => {
                  const bankerParty = bankers.find((b) => b.id === allocation.bankerId);
                  return (
                    <div
                      key={allocation.rowId}
                      className={`p-3.5 rounded-xl border space-y-2.5 transition ${
                        bankerAllocations.length > 1
                          ? 'bg-slate-900/90 border-slate-700/80'
                          : 'bg-transparent border-transparent p-0'
                      }`}
                    >
                      {bankerAllocations.length > 1 && (
                        <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-xs">
                          <span className="font-bold text-amber-400 flex items-center gap-1">
                            <span>Banker #{index + 1}</span>
                            {allocation.isCustomRate && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-normal">
                                Custom Rate
                              </span>
                            )}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveBanker(index)}
                            className="text-rose-400 hover:text-rose-300 p-1 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                            title="Remove this banker"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                        {/* Banker Select Dropdown */}
                        <div className={bankerAllocations.length > 1 ? 'sm:col-span-7' : 'sm:col-span-12'}>
                          <select
                            value={allocation.bankerId}
                            onChange={(e) => handleBankerChange(index, e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm font-medium focus:outline-none focus:border-indigo-500"
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
                        </div>

                        {/* Split Amount Input (Visible if multiple bankers) */}
                        {bankerAllocations.length > 1 && (
                          <div className="sm:col-span-5 relative flex items-center">
                            <span className="absolute left-2.5 text-slate-400 font-bold text-xs pointer-events-none">₹</span>
                            <input
                              type="number"
                              step="any"
                              value={allocation.amountINR}
                              onChange={(e) => handleBankerAmountChange(index, e.target.value)}
                              placeholder="Allocation ₹"
                              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-6 pr-2 py-2.5 text-white font-bold text-xs focus:outline-none focus:border-amber-500"
                            />
                          </div>
                        )}
                      </div>

                      {/* Info & Subtext */}
                      {bankerAllocations.length > 1 ? (
                        <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
                          <span>
                            Rate: <strong className="text-amber-300 font-mono">₹{allocation.sellRate}</strong>
                          </span>
                          <span className="text-amber-400 font-mono font-bold">
                            {bankerLegsCalc[index]?.usdt || 0} USDT
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
                          <span>
                            Contact: <strong className="text-slate-300">{bankerParty?.phone || 'N/A'}</strong>
                          </span>
                          <span>
                            Rate Applied: <strong className="text-amber-400 font-mono">₹{allocation.sellRate}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {bankerAllocations.length === 1 && (
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={handleAddBanker}
                    className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Split this transaction across two bankers?
                  </button>
                </div>
              )}
            </div>
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
                  <span>Total Trade Amount ({inputCurrencyMode === 'INR' ? 'INR ₹' : 'USDT $'}) *</span>
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
                  onChange={(e) => handleAmountInputChange(e.target.value)}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
            {/* Customer Buy Rate */}
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

            {/* Banker Sell Rate(s) */}
            <div className="space-y-3">
              {bankerAllocations.length === 1 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300">
                      Banker Sell Rate (₹) *
                    </label>
                    {bankerAllocations[0]?.isCustomRate && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5" /> Party Custom Rate
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={bankerAllocations[0]?.sellRate || ''}
                    onChange={(e) => handleBankerRateChange(0, e.target.value)}
                    placeholder="e.g. 101.0"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-amber-300 font-bold text-sm focus:outline-none focus:border-amber-500"
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-300 block">
                    Banker Sell Rates (₹) *
                  </span>
                  {bankerAllocations.map((allocation, index) => {
                    const bankerParty = bankers.find((b) => b.id === allocation.bankerId);
                    return (
                      <div key={allocation.rowId} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-white flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-amber-400" />
                            <span>{bankerParty?.name || `Banker #${index + 1}`}</span>
                          </label>
                          {allocation.isCustomRate && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-semibold">
                              Custom
                            </span>
                          )}
                        </div>
                        <input
                          type="number"
                          step="any"
                          value={allocation.sellRate}
                          onChange={(e) => handleBankerRateChange(index, e.target.value)}
                          placeholder="e.g. 92.50"
                          className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-amber-300 font-bold text-xs focus:outline-none focus:border-amber-500"
                        />
                        <div className="text-[10px] text-slate-400 flex justify-between">
                          <span>Allocated: ₹{parseFloat(allocation.amountINR || '0').toLocaleString('en-IN')}</span>
                          <span className="text-amber-400 font-mono font-bold">{bankerLegsCalc[index]?.usdt || 0} USDT</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Live Deal Preview Bar */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px] font-semibold uppercase tracking-wider">
              Deal Calculation Preview
            </span>
            <div className="text-white font-bold text-sm mt-0.5">
              Customer gets <span className="text-emerald-400 font-mono">{customerUSDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USDT</span>
              {' '}from <span className="text-amber-400 font-mono">{totalBankerUSDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} USDT</span> sourced
            </div>
          </div>
          <div className="text-right sm:border-l sm:border-slate-800 sm:pl-4">
            <span className="text-slate-400 block text-[11px] font-semibold uppercase tracking-wider">
              Estimated Deal Profit
            </span>
            <div className={`text-base font-extrabold font-mono ${grossProfitUSDT >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {grossProfitUSDT >= 0 ? '+' : ''}${grossProfitUSDT.toFixed(2)} USDT
            </div>
          </div>
        </div>

        {/* Big Action Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={submitting || (bankerAllocations.length > 1 && !isAllocatedMatched)}
            className="w-full py-4 rounded-xl font-extrabold text-base text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 hover:from-indigo-500 hover:to-purple-500 shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Recording Transactions...
              </>
            ) : (
              <>
                <ArrowLeftRight className="w-5 h-5" />
                {bankerAllocations.length > 1
                  ? `Confirm & Record Split Deal (${bankerAllocations.length} Bankers)`
                  : 'Confirm & Record Transaction Deal'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
