'use client';

import { useState, useEffect } from 'react';
import {
  Banknote,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  Search,
  Filter,
  Users,
  Building2,
  CheckCircle2,
  AlertCircle,
  Calendar,
  CreditCard,
  Receipt,
  Printer,
  Trash2,
  MoreVertical,
  Edit2,
  RotateCcw,
  Clock,
  TrendingUp,
  X,
  FileText,
  DollarSign,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

import { getWorkingDateTimeISO } from '@/lib/dateUtils';

const toLocalISOString = (dateStr?: string) => {
  if (!dateStr) return getWorkingDateTimeISO();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return getWorkingDateTimeISO();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function PaymentsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  // Edit Payment State
  const [editingPayment, setEditingPayment] = useState<any | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Advanced Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState('ALL'); // ALL, RECEIVED, SENT
  const [methodFilter, setMethodFilter] = useState('ALL'); // ALL, CASH, BANK, ONLINE, CHEQUE
  const [partyCategoryFilter, setPartyCategoryFilter] = useState('ALL'); // ALL, BANKER, CUSTOMER
  const [selectedPartyFilter, setSelectedPartyFilter] = useState('ALL'); // ALL or partyId
  const [settlementFilter, setSettlementFilter] = useState('ALL'); // ALL, PENDING, SETTLED
  const [datePreset, setDatePreset] = useState('ALL'); // ALL, TODAY, YESTERDAY, WEEK, MONTH, CUSTOM
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form State for Record Payment Modal
  const [paymentType, setPaymentType] = useState<'RECEIVED' | 'SENT'>('RECEIVED');
  const [partyId, setPartyId] = useState('');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [customDateTime, setCustomDateTime] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/payments');
      const json = await res.json();
      if (json.success) {
        setData(json);
        if (json.parties && json.parties.length > 0 && !partyId) {
          const defaultParty = json.parties.find((p: any) => p.type === 'CUSTOMER') || json.parties[0];
          setPartyId(defaultParty.id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleDirectionChange = (direction: 'RECEIVED' | 'SENT') => {
    setPaymentType(direction);
    const targetType = direction === 'RECEIVED' ? 'CUSTOMER' : 'BANKER';
    const matchingParty = data?.parties?.find((p: any) => p.type === targetType);
    if (matchingParty) {
      setPartyId(matchingParty.id);
    }
  };

  const handleDeletePayment = async (id: string, receiptNo: string) => {
    if (!confirm(`Are you sure you want to delete payment record ${receiptNo}? This will revert inventory balances.`)) return;
    try {
      const res = await fetch(`/api/payments?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchPayments();
      } else {
        alert(json.error || 'Failed to delete payment');
      }
    } catch (e: any) {
      alert(e.message || 'Error deleting payment');
    }
  };

  const handleEditPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    setEditSaving(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingPayment.id,
          type: editingPayment.type,
          partyId: editingPayment.partyId,
          amount: parseFloat(editingPayment.amount),
          currencyCode: editingPayment.currencyCode,
          paymentMethod: editingPayment.paymentMethod,
          referenceNo: editingPayment.referenceNo,
          notes: editingPayment.notes,
          createdAt: editingPayment.createdAt,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingPayment(null);
        await fetchPayments();
      } else {
        alert(json.error || 'Failed to update payment');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating payment');
    } finally {
      setEditSaving(false);
    }
  };

  const openNewPaymentModal = (direction: 'RECEIVED' | 'SENT' = 'RECEIVED', preselectedPartyId?: string) => {
    handleDirectionChange(direction);
    if (preselectedPartyId) {
      setPartyId(preselectedPartyId);
    }
    setAmount('');
    setReferenceNo('');
    setNotes('');
    setCustomDateTime(getWorkingDateTimeISO());
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
      setError('Please enter a valid positive payment amount.');
      return;
    }

    if (!partyId) {
      setError('Please select a Buyer or Seller party.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: paymentType,
          partyId,
          amount: numAmount,
          currencyCode,
          paymentMethod,
          referenceNo,
          notes,
          createdAt: customDateTime,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSuccessMsg(`Payment ${json.data.receiptNo} recorded & synced successfully!`);
        await fetchPayments();
        setTimeout(() => {
          setModalOpen(false);
          setSuccessMsg(null);
        }, 1200);
      } else {
        setError(json.error || 'Failed to record payment');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const resetAllFilters = () => {
    setSearchTerm('');
    setDirectionFilter('ALL');
    setMethodFilter('ALL');
    setPartyCategoryFilter('ALL');
    setSelectedPartyFilter('ALL');
    setSettlementFilter('ALL');
    setDatePreset('ALL');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters =
    searchTerm !== '' ||
    directionFilter !== 'ALL' ||
    methodFilter !== 'ALL' ||
    partyCategoryFilter !== 'ALL' ||
    selectedPartyFilter !== 'ALL' ||
    settlementFilter !== 'ALL' ||
    datePreset !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const payments = data?.payments || [];
  const parties = data?.parties || [];
  const currencies = data?.currencies || [];
  const transactions = data?.transactions || [];
  const partyStats = data?.partyStats || {};

  // Filter parties by category if selected
  const filteredPartiesList =
    partyCategoryFilter === 'ALL'
      ? parties
      : parties.filter((p: any) => p.type === partyCategoryFilter);

  // Default USD/USDT Rate for INR conversion if needed
  const usdCurr = currencies.find((c: any) => c.code === 'USD' || c.code === 'USDT');
  const usdtRate = usdCurr?.defaultBuyRate || 88;

  // Helper: calculate total USDT trade volume for a transaction
  const getTxUsdtVolume = (tx: any) => {
    if (tx.toCurrency === 'USDT' || tx.toCurrency === 'USD') {
      return tx.amountReceived || 0;
    } else if (tx.fromCurrency === 'USDT' || tx.fromCurrency === 'USD') {
      return tx.amountGiven || 0;
    } else if (tx.appliedRate > 0) {
      return (tx.amountGiven || 0) / tx.appliedRate;
    }
    return 0;
  };

  // Helper: calculate total USDT amount for a payment record
  const getPayUsdtAmount = (p: any) => {
    let amt = p.amount || 0;
    if (p.currencyCode === 'INR') {
      amt = amt / usdtRate;
    }
    return amt;
  };

  // Map lifetime Expected USDT, Paid USDT, and Pending USDT for each party
  const partyLifetimeStats: Record<string, { expectedUSDT: number; paidUSDT: number; pendingUSDT: number }> = {};

  parties.forEach((p: any) => {
    partyLifetimeStats[p.id] = { expectedUSDT: 0, paidUSDT: 0, pendingUSDT: 0 };
  });

  transactions.forEach((tx: any) => {
    if (partyLifetimeStats[tx.partyId]) {
      partyLifetimeStats[tx.partyId].expectedUSDT += getTxUsdtVolume(tx);
    }
  });

  payments.forEach((p: any) => {
    if (partyLifetimeStats[p.partyId]) {
      partyLifetimeStats[p.partyId].paidUSDT += getPayUsdtAmount(p);
    }
  });

  parties.forEach((p: any) => {
    const s = partyLifetimeStats[p.id];
    if (s) {
      s.pendingUSDT = Number((s.expectedUSDT - s.paidUSDT).toFixed(2));
    }
  });

  // Filter trade transactions matching active filters for Expected Amount (USDT)
  const filteredTransactions = transactions.filter((tx: any) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      tx.receiptNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tx.party?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (tx.notes && tx.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      partyCategoryFilter === 'ALL' || tx.party?.type === partyCategoryFilter;

    const matchesParty =
      selectedPartyFilter === 'ALL' || tx.partyId === selectedPartyFilter;

    let matchesDate = true;
    if (datePreset !== 'ALL') {
      const tDate = new Date(tx.createdAt);
      const now = new Date();
      if (datePreset === 'TODAY') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        matchesDate = tDate >= start;
      } else if (datePreset === 'YESTERDAY') {
        const yStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const yEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        matchesDate = tDate >= yStart && tDate <= yEnd;
      } else if (datePreset === 'WEEK') {
        const wStart = new Date(now);
        wStart.setDate(wStart.getDate() - 7);
        matchesDate = tDate >= wStart;
      } else if (datePreset === 'MONTH') {
        const mStart = new Date(now);
        mStart.setDate(mStart.getDate() - 30);
        matchesDate = tDate >= mStart;
      } else if (datePreset === 'CUSTOM') {
        if (startDate) {
          const s = new Date(startDate);
          matchesDate = matchesDate && tDate >= s;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && tDate <= e;
        }
      }
    }

    return matchesSearch && matchesCategory && matchesParty && matchesDate;
  });

  // Calculate Filter-reactive Expected Amount (USDT)
  // Show 0 ($0.00 USDT) when no specific banker or customer is selected
  const totalExpectedUSDT =
    selectedPartyFilter === 'ALL' && searchTerm.trim() === ''
      ? 0
      : filteredTransactions.reduce((acc: number, tx: any) => {
          return acc + getTxUsdtVolume(tx);
        }, 0);

  // Filter payments list based on all filter parameters
  const filteredPayments = payments.filter((p: any) => {
    // 1. Text search (receipt, party name, ref #, notes)
    const matchesSearch =
      searchTerm.trim() === '' ||
      p.receiptNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.party?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.referenceNo && p.referenceNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    // 2. Party category
    const matchesCategory =
      partyCategoryFilter === 'ALL' || p.party?.type === partyCategoryFilter;

    // 3. Specific party
    const matchesParty =
      selectedPartyFilter === 'ALL' || p.partyId === selectedPartyFilter;

    // 4. Direction (RECEIVED / SENT)
    const matchesDirection =
      directionFilter === 'ALL' || p.type === directionFilter;

    // 5. Channel / Method
    const matchesMethod =
      methodFilter === 'ALL' || p.paymentMethod === methodFilter;

    // 6. Settlement status filter
    const stats = partyLifetimeStats[p.partyId];
    let matchesSettlement = true;
    if (settlementFilter === 'PENDING') {
      matchesSettlement = stats && stats.pendingUSDT > 0;
    } else if (settlementFilter === 'SETTLED') {
      matchesSettlement = stats && stats.pendingUSDT <= 0;
    }

    // 7. Date range filter
    let matchesDate = true;
    if (datePreset !== 'ALL') {
      const pDate = new Date(p.createdAt);
      const now = new Date();
      if (datePreset === 'TODAY') {
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        matchesDate = pDate >= start;
      } else if (datePreset === 'YESTERDAY') {
        const yStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const yEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        matchesDate = pDate >= yStart && pDate <= yEnd;
      } else if (datePreset === 'WEEK') {
        const wStart = new Date(now);
        wStart.setDate(wStart.getDate() - 7);
        matchesDate = pDate >= wStart;
      } else if (datePreset === 'MONTH') {
        const mStart = new Date(now);
        mStart.setDate(mStart.getDate() - 30);
        matchesDate = pDate >= mStart;
      } else if (datePreset === 'CUSTOM') {
        if (startDate) {
          const s = new Date(startDate);
          matchesDate = matchesDate && pDate >= s;
        }
        if (endDate) {
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && pDate <= e;
        }
      }
    }

    return (
      matchesSearch &&
      matchesCategory &&
      matchesParty &&
      matchesDirection &&
      matchesMethod &&
      matchesSettlement &&
      matchesDate
    );
  });

  // Calculate Filter-reactive Paid Amount (USDT)
  const totalPaidUSDT = filteredPayments.reduce((acc: number, p: any) => {
    return acc + getPayUsdtAmount(p);
  }, 0);

  // Calculate Overall Pending Amount (USDT) - Lifetime expected USDT minus paid USDT
  let totalOverallPendingUSDT = 0;
  if (selectedPartyFilter !== 'ALL') {
    const pStat = partyLifetimeStats[selectedPartyFilter];
    totalOverallPendingUSDT = pStat ? pStat.pendingUSDT : 0;
  } else {
    parties.forEach((p: any) => {
      const pStat = partyLifetimeStats[p.id];
      if (!pStat || pStat.pendingUSDT <= 0) return;
      if (partyCategoryFilter === 'ALL' || p.type === partyCategoryFilter) {
        totalOverallPendingUSDT += pStat.pendingUSDT;
      }
    });
  }

  return (
    <div className="w-full space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Banknote className="w-7 h-7 text-emerald-400" /> Buyer & Seller Payments Hub
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Track banker buy trades, customer sell trades, paid settlements, and outstanding balances.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => openNewPaymentModal('RECEIVED')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4" /> Receive Payment (from Buyer)
          </button>
          <button
            onClick={() => openNewPaymentModal('SENT')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/20 transition cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" /> Send Payment (to Seller / Banker)
          </button>
        </div>
      </div>

      {/* 3 Core Financial Metric Cards (in USDT) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1: Expected Amount (USDT) */}
        <div className="glass-card rounded-2xl p-5 border border-indigo-500/30 relative overflow-hidden bg-gradient-to-br from-indigo-950/40 via-slate-900 to-slate-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
              Expected Amount (USDT)
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-white">
            ${totalExpectedUSDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Expected trade volume within selected filters
          </div>
        </div>

        {/* Metric 2: Paid Amount (USDT) */}
        <div className="glass-card rounded-2xl p-5 border border-emerald-500/30 relative overflow-hidden bg-gradient-to-br from-emerald-950/30 via-slate-900 to-slate-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
              Paid Amount (USDT)
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">
            ${totalPaidUSDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Total settled payments within selected filters
          </div>
        </div>

        {/* Metric 3: Overall Pending (USDT) */}
        <div className="glass-card rounded-2xl p-5 border border-amber-500/40 relative overflow-hidden bg-gradient-to-br from-amber-950/30 via-slate-900 to-slate-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">
              Overall Pending (USDT)
            </span>
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-400">
            ${Math.abs(totalOverallPendingUSDT).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Overall total pending balance (Lifetime overall)
          </div>
        </div>
      </div>

      {/* COMPREHENSIVE MULTI-FILTER CONTROL PANEL */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
        {/* Row 1: Search Box & Date Presets */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search banker name, receipt #, or reference #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Date Range Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 font-semibold mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date:
            </span>
            {[
              { label: 'All Time', value: 'ALL' },
              { label: 'Today', value: 'TODAY' },
              { label: 'Yesterday', value: 'YESTERDAY' },
              { label: 'This Week', value: 'WEEK' },
              { label: 'This Month', value: 'MONTH' },
              { label: 'Custom', value: 'CUSTOM' },
            ].map((p) => (
              <button
                key={p.value}
                onClick={() => setDatePreset(p.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  datePreset === p.value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}

            {hasActiveFilters && (
              <button
                onClick={resetAllFilters}
                className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Custom Date Pickers */}
        {datePreset === 'CUSTOM' && (
          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-wrap items-center gap-4 animate-fadeIn text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Start Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white text-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">End Date:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white text-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 font-bold focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        <hr className="border-slate-800/80" />

        {/* Row 2: Category, Specific Party, Direction, Payment Channel & Settlement Filter Dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Filter 1: Party Category */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Party Category
            </label>
            <select
              value={partyCategoryFilter}
              onChange={(e) => {
                setPartyCategoryFilter(e.target.value);
                setSelectedPartyFilter('ALL');
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Categories</option>
              <option value="BANKER">🏛️ Bankers (Sellers)</option>
              <option value="CUSTOMER">👥 Customers (Buyers)</option>
            </select>
          </div>

          {/* Filter 2: Specific Banker / Person Dropdown */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Select Banker / Person
            </label>
            <select
              value={selectedPartyFilter}
              onChange={(e) => setSelectedPartyFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Persons / Bankers</option>
              {filteredPartiesList.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type})
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Payment Direction */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Payment Direction
            </label>
            <select
              value={directionFilter}
              onChange={(e) => setDirectionFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Directions</option>
              <option value="RECEIVED">📥 Received (from Buyers)</option>
              <option value="SENT">📤 Sent (to Sellers / Bankers)</option>
            </select>
          </div>

          {/* Filter 4: Payment Channel */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Payment Channel
            </label>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Channels</option>
              <option value="CASH">💵 Physical Cash</option>
              <option value="BANK">🏛️ Bank Transfer</option>
              <option value="ONLINE">⚡ Online Wallet</option>
              <option value="CHEQUE">📝 Bank Cheque</option>
            </select>
          </div>

          {/* Filter 5: Settlement Status */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
              Settlement Status
            </label>
            <select
              value={settlementFilter}
              onChange={(e) => setSettlementFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">⚠️ Pending Balance Only</option>
              <option value="SETTLED">✅ Fully Settled Parties</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Payments Table */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Receipt className="w-4 h-4 text-indigo-400" /> Payment Receipts Audit Log ({filteredPayments.length})
          </h2>
          <span className="text-xs text-slate-400">
            Showing matching entries
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/80 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Party Name</th>
                <th className="py-3 px-4">Direction</th>
                <th className="py-3 px-4">Channel / Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Ref # / Notes</th>
                <th className="py-3 px-4 text-center">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                    <div className="space-y-2">
                      <Banknote className="w-8 h-8 mx-auto text-slate-600" />
                      <p className="font-semibold text-slate-400">No payment records match your filters.</p>
                      {hasActiveFilters && (
                        <button
                          onClick={resetAllFilters}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline"
                        >
                          Reset all search filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p: any) => {
                  const isReceived = p.type === 'RECEIVED';
                  const isCustomer = p.party?.type === 'CUSTOMER';
                  const pStats = partyLifetimeStats[p.partyId];

                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition text-xs">
                      <td className="py-3.5 px-4 font-mono font-bold text-white flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        {p.receiptNo}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        {new Date(p.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <div
                          onClick={() => setSelectedPartyFilter(p.partyId)}
                          className="font-bold text-white flex items-center gap-1.5 cursor-pointer hover:text-indigo-400 transition"
                          title="Click to filter by this party"
                        >
                          {isCustomer ? (
                            <Users className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                          )}
                          <span>{p.party?.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-400 uppercase font-semibold">
                            {isCustomer ? 'Buyer / Customer' : 'Seller / Banker'}
                          </span>
                          {pStats && pStats.pendingUSDT > 0 && (
                            <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded">
                              Owed: ${pStats.pendingUSDT.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDT
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                            isReceived
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {isReceived ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          {isReceived ? 'RECEIVED (IN)' : 'SENT (OUT)'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-300">
                        {p.paymentMethod === 'BANK' && '🏛️ Bank Transfer'}
                        {p.paymentMethod === 'CASH' && '💵 Cash Safe'}
                        {p.paymentMethod === 'ONLINE' && '⚡ Online Payment'}
                        {p.paymentMethod === 'CHEQUE' && '📝 Bank Cheque'}
                      </td>
                      <td className="py-3.5 px-4 text-right font-extrabold text-white text-sm">
                        <span className={isReceived ? 'text-emerald-400' : 'text-amber-400'}>
                          {isReceived ? '+' : '-'}${p.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                          {p.currencyCode}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {p.referenceNo && (
                          <span className="block font-mono text-[10px] text-slate-300">Ref: {p.referenceNo}</span>
                        )}
                        <span className="italic text-[11px]">{p.notes || '—'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedReceipt(p)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white font-medium text-[11px] transition cursor-pointer flex items-center gap-1"
                          >
                            <Receipt className="w-3 h-3" /> Voucher
                          </button>
                          <button
                            onClick={() => setEditingPayment({ ...p, createdAt: toLocalISOString(p.createdAt) })}
                            title="Edit or Delete payment entry"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition cursor-pointer"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card rounded-2xl w-full max-w-lg p-6 border border-slate-800 shadow-2xl relative space-y-5 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Banknote className="w-5 h-5 text-emerald-400" /> Record Buyer / Seller Payment
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
              {/* Payment Date & Time */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  Payment Date & Time (Active Working Date)
                </label>
                <input
                  type="datetime-local"
                  value={customDateTime}
                  onChange={(e) => setCustomDateTime(e.target.value)}
                  className="w-full bg-white text-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 font-bold focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Direction Toggle */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  Payment Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDirectionChange('RECEIVED')}
                    className={`py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                      paymentType === 'RECEIVED'
                        ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500 shadow-lg shadow-emerald-600/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" /> Received (from Buyer)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDirectionChange('SENT')}
                    className={`py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                      paymentType === 'SENT'
                        ? 'bg-amber-600/20 text-amber-400 border-amber-500 shadow-lg shadow-amber-600/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" /> Sent (to Seller / Banker)
                  </button>
                </div>
              </div>

              {/* Party Selector */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  {paymentType === 'RECEIVED' ? 'Select Customer (Buyer)' : 'Select Banker (Seller)'}
                </label>
                <select
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500"
                  required
                >
                  {parties
                    .filter((p: any) => (paymentType === 'RECEIVED' ? p.type === 'CUSTOMER' : p.type === 'BANKER'))
                    .map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Currency & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    Currency
                  </label>
                  <select
                    value={currencyCode}
                    onChange={(e) => setCurrencyCode(e.target.value)}
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
                    Payment Amount
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

              {/* Payment Method */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  Payment Channel / Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="CASH">💵 Physical Cash</option>
                  <option value="BANK">🏛️ Bank Account Transfer</option>
                  <option value="ONLINE">⚡ Online / E-Wallet</option>
                  <option value="CHEQUE">📝 Bank Cheque</option>
                </select>
              </div>

              {/* Reference # */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  Reference # (Bank Ref, Tx Hash, Cheque #)
                </label>
                <input
                  type="text"
                  placeholder="e.g. TXN-9988231, CHQ-10492"
                  value={referenceNo}
                  onChange={(e) => setReferenceNo(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  Payment Description / Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Received partial payment for order #104..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/20 text-[11px] text-indigo-300">
                ℹ️ Saving will automatically adjust currency inventory balances and log a CREDIT/DEBIT entry on the party's account.
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
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/30 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? 'Recording...' : 'Record Payment & Sync Ledger'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Receipt Voucher Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="glass-card rounded-2xl w-full max-w-md p-6 border border-slate-800 shadow-2xl relative space-y-4 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-white text-base">Official Payment Voucher</h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-white font-bold px-2 py-0.5 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Voucher No:</span>
                <span className="font-bold text-white">{selectedReceipt.receiptNo}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Date & Time:</span>
                <span className="text-slate-300">{new Date(selectedReceipt.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Party Name:</span>
                <span className="font-bold text-white">{selectedReceipt.party?.name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Payment Direction:</span>
                <span className={`font-bold ${selectedReceipt.type === 'RECEIVED' ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {selectedReceipt.type === 'RECEIVED' ? 'RECEIVED FROM BUYER' : 'SENT TO SELLER'}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-800/80 pb-2">
                <span className="text-slate-400">Payment Channel:</span>
                <span className="text-slate-300">{selectedReceipt.paymentMethod}</span>
              </div>
              {selectedReceipt.referenceNo && (
                <div className="flex justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-slate-400">Reference #:</span>
                  <span className="text-slate-300">{selectedReceipt.referenceNo}</span>
                </div>
              )}
              <div className="flex justify-between pt-1 text-sm font-bold">
                <span className="text-slate-300">Total Amount:</span>
                <span className={selectedReceipt.type === 'RECEIVED' ? 'text-emerald-400' : 'text-amber-400'}>
                  {selectedReceipt.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                  {selectedReceipt.currencyCode}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Voucher
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card rounded-2xl w-full max-w-lg p-6 border border-slate-800 shadow-2xl relative space-y-5 bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-emerald-400" /> Edit Payment Entry ({editingPayment.receiptNo})
              </h3>
              <button
                onClick={() => setEditingPayment(null)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-0.5 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleEditPaymentSubmit} className="space-y-4 text-xs">
              {/* Payment Date & Time */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  Payment Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={editingPayment.createdAt || ''}
                  onChange={(e) => setEditingPayment({ ...editingPayment, createdAt: e.target.value })}
                  className="w-full bg-white text-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 font-bold focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              {/* Payment Direction */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  Payment Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPayment({ ...editingPayment, type: 'RECEIVED' })}
                    className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                      editingPayment.type === 'RECEIVED'
                        ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" /> Received
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingPayment({ ...editingPayment, type: 'SENT' })}
                    className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                      editingPayment.type === 'SENT'
                        ? 'bg-amber-600/20 text-amber-400 border-amber-500'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" /> Sent
                  </button>
                </div>
              </div>

              {/* Party */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  Party / Person
                </label>
                <select
                  value={editingPayment.partyId || ''}
                  onChange={(e) => setEditingPayment({ ...editingPayment, partyId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500"
                  required
                >
                  {parties.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type})
                    </option>
                  ))}
                </select>
              </div>

              {/* Currency & Amount */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                    Currency
                  </label>
                  <select
                    value={editingPayment.currencyCode || 'USD'}
                    onChange={(e) => setEditingPayment({ ...editingPayment, currencyCode: e.target.value })}
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
                    value={editingPayment.amount || ''}
                    onChange={(e) => setEditingPayment({ ...editingPayment, amount: e.target.value })}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Payment Channel */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  Payment Channel / Method
                </label>
                <select
                  value={editingPayment.paymentMethod || 'CASH'}
                  onChange={(e) => setEditingPayment({ ...editingPayment, paymentMethod: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500"
                >
                  <option value="CASH">💵 Physical Cash</option>
                  <option value="BANK">🏛️ Bank Account Transfer</option>
                  <option value="ONLINE">⚡ Online / E-Wallet</option>
                  <option value="CHEQUE">📝 Bank Cheque</option>
                </select>
              </div>

              {/* Reference # */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  Reference #
                </label>
                <input
                  type="text"
                  value={editingPayment.referenceNo || ''}
                  onChange={(e) => setEditingPayment({ ...editingPayment, referenceNo: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  Notes / Remarks
                </label>
                <textarea
                  rows={2}
                  value={editingPayment.notes || ''}
                  onChange={(e) => setEditingPayment({ ...editingPayment, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-800">
                <button
                  type="button"
                  onClick={async () => {
                    await handleDeletePayment(editingPayment.id, editingPayment.receiptNo);
                    setEditingPayment(null);
                  }}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-bold flex items-center gap-1.5 border border-rose-500/30 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Delete Payment
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPayment(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
