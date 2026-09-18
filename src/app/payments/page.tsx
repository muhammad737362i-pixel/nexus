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

import {
  getWorkingDateTimeISO,
  formatISTDateTime,
  toISTDateTimeLocalString,
  getISTDayStart,
  getISTDayEnd,
  parseISTDate,
  getTodayISTDateString,
} from '@/lib/dateUtils';

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

  // Table View Tab State: 'PAYMENTS' or 'TRADES'
  const [activeTab, setActiveTab] = useState<'PAYMENTS' | 'TRADES'>('PAYMENTS');

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

  const handleDownloadPDF = () => {
    const activeParty = selectedPartyFilter !== 'ALL' ? parties.find((p: any) => p.id === selectedPartyFilter) : null;
    const rawName = activeParty ? activeParty.name : 'All_Parties';
    const cleanName = rawName.replace(/[^a-zA-Z0-9_\-]/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];
    const originalTitle = document.title;

    document.title = `${cleanName}_Financial_Statement_${dateStr}`;
    window.print();

    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
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

  // Helper: calculate total INR trade volume for a transaction
  const getTxInrVolume = (tx: any) => {
    if (tx.amountGiven && (tx.fromCurrency === 'INR' || tx.toCurrency === 'INR')) {
      return tx.amountGiven;
    } else if (tx.amountReceived && (tx.toCurrency === 'INR' || tx.fromCurrency === 'INR')) {
      return tx.amountReceived;
    } else if (tx.appliedRate > 0) {
      return getTxUsdtVolume(tx) * tx.appliedRate;
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

  // Check if user has explicitly selected a party, category, or typed a search term
  const hasSpecificSelection =
    selectedPartyFilter !== 'ALL' ||
    searchTerm.trim() !== '' ||
    partyCategoryFilter !== 'ALL';

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
      const todayStr = getTodayISTDateString();
      if (datePreset === 'TODAY') {
        matchesDate = tDate >= getISTDayStart(todayStr) && tDate <= getISTDayEnd(todayStr);
      } else if (datePreset === 'YESTERDAY') {
        const [y, m, d] = todayStr.split('-').map(Number);
        const yObj = new Date(Date.UTC(y, m - 1, d - 1));
        const yStr = `${yObj.getUTCFullYear()}-${String(yObj.getUTCMonth() + 1).padStart(2, '0')}-${String(yObj.getUTCDate()).padStart(2, '0')}`;
        matchesDate = tDate >= getISTDayStart(yStr) && tDate <= getISTDayEnd(yStr);
      } else if (datePreset === 'WEEK') {
        const [y, m, d] = todayStr.split('-').map(Number);
        const wObj = new Date(Date.UTC(y, m - 1, d - 7));
        const wStr = `${wObj.getUTCFullYear()}-${String(wObj.getUTCMonth() + 1).padStart(2, '0')}-${String(wObj.getUTCDate()).padStart(2, '0')}`;
        matchesDate = tDate >= getISTDayStart(wStr);
      } else if (datePreset === 'MONTH') {
        const [y, m, d] = todayStr.split('-').map(Number);
        const mObj = new Date(Date.UTC(y, m - 1, d - 30));
        const mStr = `${mObj.getUTCFullYear()}-${String(mObj.getUTCMonth() + 1).padStart(2, '0')}-${String(mObj.getUTCDate()).padStart(2, '0')}`;
        matchesDate = tDate >= getISTDayStart(mStr);
      } else if (datePreset === 'CUSTOM') {
        if (startDate) {
          const s = startDate.length <= 10 ? getISTDayStart(startDate) : parseISTDate(startDate);
          if (s) matchesDate = matchesDate && tDate >= s;
        }
        if (endDate) {
          const e = endDate.length <= 10 ? getISTDayEnd(endDate) : parseISTDate(endDate);
          if (e) matchesDate = matchesDate && tDate <= e;
        }
      }
    }

    return matchesSearch && matchesCategory && matchesParty && matchesDate;
  });

  // Calculate Filter-reactive Expected Amount (USDT)
  const totalExpectedUSDT = filteredTransactions.reduce((acc: number, tx: any) => {
    return acc + getTxUsdtVolume(tx);
  }, 0);

  // Calculate Filter-reactive Expected Amount (INR)
  const totalExpectedINR = filteredTransactions.reduce((acc: number, tx: any) => {
    return acc + getTxInrVolume(tx);
  }, 0);

  // Filter payments list based on all filter parameters
  const filteredPayments = payments.filter((p: any) => {
    const matchesSearch =
      searchTerm.trim() === '' ||
      p.receiptNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.party?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.referenceNo && p.referenceNo.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      partyCategoryFilter === 'ALL' || p.party?.type === partyCategoryFilter;

    const matchesParty =
      selectedPartyFilter === 'ALL' || p.partyId === selectedPartyFilter;

    const matchesDirection =
      directionFilter === 'ALL' || p.type === directionFilter;

    const matchesMethod =
      methodFilter === 'ALL' || p.paymentMethod === methodFilter;

    const stats = partyLifetimeStats[p.partyId];
    let matchesSettlement = true;
    if (settlementFilter === 'PENDING') {
      matchesSettlement = stats && stats.pendingUSDT > 0;
    } else if (settlementFilter === 'SETTLED') {
      matchesSettlement = stats && stats.pendingUSDT <= 0;
    }

    let matchesDate = true;
    if (datePreset !== 'ALL') {
      const pDate = new Date(p.createdAt);
      const todayStr = getTodayISTDateString();
      if (datePreset === 'TODAY') {
        matchesDate = pDate >= getISTDayStart(todayStr) && pDate <= getISTDayEnd(todayStr);
      } else if (datePreset === 'YESTERDAY') {
        const [y, m, d] = todayStr.split('-').map(Number);
        const yObj = new Date(Date.UTC(y, m - 1, d - 1));
        const yStr = `${yObj.getUTCFullYear()}-${String(yObj.getUTCMonth() + 1).padStart(2, '0')}-${String(yObj.getUTCDate()).padStart(2, '0')}`;
        matchesDate = pDate >= getISTDayStart(yStr) && pDate <= getISTDayEnd(yStr);
      } else if (datePreset === 'WEEK') {
        const [y, m, d] = todayStr.split('-').map(Number);
        const wObj = new Date(Date.UTC(y, m - 1, d - 7));
        const wStr = `${wObj.getUTCFullYear()}-${String(wObj.getUTCMonth() + 1).padStart(2, '0')}-${String(wObj.getUTCDate()).padStart(2, '0')}`;
        matchesDate = pDate >= getISTDayStart(wStr);
      } else if (datePreset === 'MONTH') {
        const [y, m, d] = todayStr.split('-').map(Number);
        const mObj = new Date(Date.UTC(y, m - 1, d - 30));
        const mStr = `${mObj.getUTCFullYear()}-${String(mObj.getUTCMonth() + 1).padStart(2, '0')}-${String(mObj.getUTCDate()).padStart(2, '0')}`;
        matchesDate = pDate >= getISTDayStart(mStr);
      } else if (datePreset === 'CUSTOM') {
        if (startDate) {
          const s = startDate.length <= 10 ? getISTDayStart(startDate) : parseISTDate(startDate);
          if (s) matchesDate = matchesDate && pDate >= s;
        }
        if (endDate) {
          const e = endDate.length <= 10 ? getISTDayEnd(endDate) : parseISTDate(endDate);
          if (e) matchesDate = matchesDate && pDate <= e;
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

  // Calculate Overall Pending Amount (USDT)
  let totalOverallPendingUSDT = 0;
  if (selectedPartyFilter !== 'ALL') {
    const pStat = partyLifetimeStats[selectedPartyFilter];
    totalOverallPendingUSDT = pStat ? pStat.pendingUSDT : 0;
  } else {
    parties.forEach((p: any) => {
      const pStat = partyLifetimeStats[p.id];
      if (!pStat) return;
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

      {/* 4 Core Financial Metric Cards (Expected USDT, Expected INR, Paid USDT, Overall Pending) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Metric 2: Expected Amount (INR) */}
        <div className="glass-card rounded-2xl p-5 border border-sky-500/30 relative overflow-hidden bg-gradient-to-br from-sky-950/40 via-slate-900 to-slate-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-sky-300 uppercase tracking-wider">
              Expected Amount (INR)
            </span>
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-sky-300">
            ₹{totalExpectedINR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Total expected billed INR at applied rate
          </div>
        </div>

        {/* Metric 3: Paid Amount (USDT) */}
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

        {/* Metric 4: Overall Pending (USDT) */}
        <div className={`glass-card rounded-2xl p-5 border relative overflow-hidden bg-gradient-to-br ${
          totalOverallPendingUSDT < 0
            ? 'border-rose-500/40 from-rose-950/30 via-slate-900 to-slate-900'
            : 'border-amber-500/40 from-amber-950/30 via-slate-900 to-slate-900'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${
              totalOverallPendingUSDT < 0 ? 'text-rose-300' : 'text-amber-300'
            }`}>
              Overall Pending (USDT)
            </span>
            <div className={`p-2 rounded-xl border ${
              totalOverallPendingUSDT < 0
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-extrabold ${
            totalOverallPendingUSDT < 0 ? 'text-rose-400' : 'text-amber-400'
          }`}>
            {totalOverallPendingUSDT < 0 ? '-' : ''}${Math.abs(totalOverallPendingUSDT).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
          </div>
          <div className="mt-2 text-xs text-slate-400">
            {totalOverallPendingUSDT < 0 ? '⚠️ Overpaid / Credit balance' : 'Overall total pending balance (Lifetime overall)'}
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

      {/* Print PDF Global Styles */}
      <style>{`
        @media print {
          @page {
            margin: 0;
            size: auto;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          body * {
            visibility: hidden !important;
          }
          #pdf-print-statement, #pdf-print-statement * {
            visibility: visible !important;
          }
          #pdf-print-statement {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            background: #ffffff !important;
            color: #000000 !important;
            display: block !important;
            margin: 0 !important;
            padding: 15mm !important;
            box-sizing: border-box !important;
          }
        }
      `}</style>

      {/* DEDICATED CLEAN PRINTABLE CONTAINER (Only visible when saving/printing PDF) */}
      <div id="pdf-print-statement" className="hidden font-sans space-y-6">
        {/* Printable Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              NEXUS Exchange — Account Statement
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              Official Ledger & Financial Activity Summary
            </p>
          </div>
          <div className="text-right text-xs font-mono text-slate-700 space-y-1">
            <div><strong className="text-slate-900">Date:</strong> {new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric', month: 'long', day: 'numeric' })}</div>
            <div>
              <strong className="text-slate-900">Account / Party:</strong>{' '}
              {selectedPartyFilter !== 'ALL'
                ? parties.find((p: any) => p.id === selectedPartyFilter)?.name || 'Selected Person'
                : 'All Parties & Bankers'}
            </div>
          </div>
        </div>

        {/* 4 Main Metric Boxes (Expected USDT, Expected INR, Paid USDT, Overall Pending) */}
        <div className="grid grid-cols-4 gap-3 text-center my-4">
          <div className="p-3 border border-indigo-300 rounded-xl bg-indigo-50">
            <div className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider">Expected Amount (USDT)</div>
            <div className="text-base font-extrabold text-indigo-950 mt-1">
              ${totalExpectedUSDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </div>
          </div>

          <div className="p-3 border border-sky-300 rounded-xl bg-sky-50">
            <div className="text-[10px] font-bold text-sky-900 uppercase tracking-wider">Expected Amount (INR)</div>
            <div className="text-base font-extrabold text-sky-950 mt-1">
              ₹{totalExpectedINR.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} INR
            </div>
          </div>

          <div className="p-3 border border-emerald-300 rounded-xl bg-emerald-50">
            <div className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider">Paid Amount (USDT)</div>
            <div className="text-base font-extrabold text-emerald-950 mt-1">
              ${totalPaidUSDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </div>
          </div>

          <div className={`p-3 border rounded-xl ${
            totalOverallPendingUSDT < 0 ? 'border-rose-300 bg-rose-50' : 'border-amber-300 bg-amber-50'
          }`}>
            <div className={`text-[10px] font-bold uppercase tracking-wider ${
              totalOverallPendingUSDT < 0 ? 'text-rose-900' : 'text-amber-900'
            }`}>Overall Pending (USDT)</div>
            <div className={`text-base font-extrabold mt-1 ${
              totalOverallPendingUSDT < 0 ? 'text-rose-950' : 'text-amber-950'
            }`}>
              {totalOverallPendingUSDT < 0 ? '-' : ''}${Math.abs(totalOverallPendingUSDT).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </div>
          </div>
        </div>

        {/* FIRST TABLE: Settled Payments Receipts Log (Paid Amounts) */}
        <div className="space-y-2 pt-2">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1">
            1. Settled Payments Log ({filteredPayments.length})
          </h3>
          {filteredPayments.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500 italic border border-slate-200 rounded-lg">
              No settled payment records found for this selection.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-900 uppercase text-[10px] border-b border-slate-400">
                  <th className="py-2 px-2">Receipt #</th>
                  <th className="py-2 px-2">Date & Time</th>
                  <th className="py-2 px-2">Party Name</th>
                  <th className="py-2 px-2">Direction</th>
                  <th className="py-2 px-2">Channel</th>
                  <th className="py-2 px-2 text-right">Amount Paid</th>
                  <th className="py-2 px-2">Reference / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredPayments.map((p: any) => (
                  <tr key={p.id} className="text-[11px]">
                    <td className="py-2 px-2 font-mono font-bold text-slate-900">{p.receiptNo}</td>
                    <td className="py-2 px-2 text-slate-700">{formatISTDateTime(p.createdAt)}</td>
                    <td className="py-2 px-2 font-bold text-slate-900">{p.party?.name}</td>
                    <td className="py-2 px-2 font-bold">{p.type}</td>
                    <td className="py-2 px-2">{p.paymentMethod}</td>
                    <td className="py-2 px-2 text-right font-bold text-slate-900">${p.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })} {p.currencyCode}</td>
                    <td className="py-2 px-2 text-slate-700">{p.referenceNo || p.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* SECOND TABLE: Executed Trade Orders History */}
        <div className="space-y-2 pt-4">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-300 pb-1">
            2. Executed Trade Orders History ({filteredTransactions.length})
          </h3>
          {filteredTransactions.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-500 italic border border-slate-200 rounded-lg">
              No trade order records found for this selection.
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-900 uppercase text-[10px] border-b border-slate-400">
                  <th className="py-2 px-2">Receipt #</th>
                  <th className="py-2 px-2">Date & Time</th>
                  <th className="py-2 px-2">Party Name</th>
                  <th className="py-2 px-2">Type</th>
                  <th className="py-2 px-2 text-right">Amount Given</th>
                  <th className="py-2 px-2 text-right">Applied Rate</th>
                  <th className="py-2 px-2 text-right">Amount Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredTransactions.map((tx: any) => (
                  <tr key={tx.id} className="text-[11px]">
                    <td className="py-2 px-2 font-mono font-bold text-slate-900">{tx.receiptNo}</td>
                    <td className="py-2 px-2 text-slate-700">{formatISTDateTime(tx.createdAt)}</td>
                    <td className="py-2 px-2 font-bold text-slate-900">{tx.party?.name}</td>
                    <td className="py-2 px-2 font-bold">{tx.type}</td>
                    <td className="py-2 px-2 text-right font-bold">{tx.amountGiven?.toLocaleString()} {tx.fromCurrency}</td>
                    <td className="py-2 px-2 text-right font-mono font-bold">{tx.appliedRate}</td>
                    <td className="py-2 px-2 text-right font-bold text-slate-900">{tx.amountReceived?.toLocaleString()} {tx.toCurrency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-slate-300 flex justify-between text-[10px] text-slate-500 font-mono">
          <div>Report generated automatically by NEXUS Suite</div>
          <div>Official Financial Record</div>
        </div>
      </div>

      {/* Main Container: Payments & Trade History Tables */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        {/* Table View Tab Header & PDF Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          {/* Tab Switcher */}
          <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('PAYMENTS')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'PAYMENTS'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4" /> Paid Payments Log ({filteredPayments.length})
            </button>
            <button
              onClick={() => setActiveTab('TRADES')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'TRADES'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <TrendingUp className="w-4 h-4" /> Trade History / Orders ({filteredTransactions.length})
            </button>
          </div>

          {/* PDF Download Button */}
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition shadow-md cursor-pointer border border-indigo-500/30"
          >
            <Printer className="w-4 h-4" /> Download PDF Report
          </button>
        </div>

        {/* TAB 1: PAYMENT RECEIPTS LOG */}
        {activeTab === 'PAYMENTS' && (
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
                  <th className="py-3 px-4 text-center no-print">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(() => {
                  const sortedPayments = [...filteredPayments].sort((a, b) => {
                    const timeA = new Date(a.createdAt).getTime();
                    const timeB = new Date(b.createdAt).getTime();
                    if (timeB !== timeA) return timeB - timeA;
                    return (b.receiptNo || '').localeCompare(a.receiptNo || '', undefined, { numeric: true });
                  });
                  return sortedPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                        <div className="space-y-2">
                          <Banknote className="w-8 h-8 mx-auto text-slate-600" />
                          <p className="font-semibold text-slate-400">No payment records match your filters.</p>
                          {hasActiveFilters && (
                            <button
                              onClick={resetAllFilters}
                              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline no-print"
                            >
                              Reset all search filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedPayments.map((p: any) => {
                    const isReceived = p.type === 'RECEIVED';
                    const isCustomer = p.party?.type === 'CUSTOMER';
                    const pStats = partyLifetimeStats[p.partyId];

                    return (
                      <tr key={p.id} className="hover:bg-slate-800/40 transition text-xs">
                        <td className="py-3.5 px-4 font-mono font-bold text-white flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse no-print" />
                          {p.receiptNo}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono">
                          {formatISTDateTime(p.createdAt)}
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
                        <td className="py-3.5 px-4 text-center no-print">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setSelectedReceipt(p)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white font-medium text-[11px] transition cursor-pointer flex items-center gap-1"
                            >
                              <Receipt className="w-3 h-3" /> Voucher
                            </button>
                            <button
                              onClick={() => setEditingPayment({ ...p, createdAt: toISTDateTimeLocalString(p.createdAt) })}
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
                );
              })()}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 2: EXECUTED TRADE HISTORY */}
        {activeTab === 'TRADES' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Receipt #</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Party Name</th>
                  <th className="py-3 px-4">Trade Type</th>
                  <th className="py-3 px-4 text-right">Amount Given</th>
                  <th className="py-3 px-4 text-right">Applied Rate</th>
                  <th className="py-3 px-4 text-right">Amount Received</th>
                  <th className="py-3 px-4">Notes / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {(() => {
                  const sortedTradeTransactions = [...filteredTransactions].sort((a, b) => {
                    const timeA = new Date(a.createdAt).getTime();
                    const timeB = new Date(b.createdAt).getTime();
                    if (timeB !== timeA) return timeB - timeA;
                    return (b.receiptNo || '').localeCompare(a.receiptNo || '', undefined, { numeric: true });
                  });
                  return sortedTradeTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-xs text-slate-500">
                        <div className="space-y-2">
                          <TrendingUp className="w-8 h-8 mx-auto text-slate-600" />
                          <p className="font-semibold text-slate-400">No trade records match your filters.</p>
                          {hasActiveFilters && (
                            <button
                              onClick={resetAllFilters}
                              className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline no-print"
                            >
                              Reset all search filters
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sortedTradeTransactions.map((tx: any) => {
                    const isBuy = tx.type === 'BUY';
                    const isCustomer = tx.party?.type === 'CUSTOMER';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/40 transition text-xs">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                          {tx.receiptNo}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 font-mono">
                          {formatISTDateTime(tx.createdAt)}
                        </td>
                        <td className="py-3.5 px-4">
                          <div
                            onClick={() => setSelectedPartyFilter(tx.partyId)}
                            className="font-bold text-white flex items-center gap-1.5 cursor-pointer hover:text-indigo-400 transition"
                            title="Click to filter by this party"
                          >
                            {isCustomer ? (
                              <Users className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                            )}
                            <span>{tx.party?.name}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block mt-0.5">
                            {isCustomer ? 'Buyer / Customer' : 'Seller / Banker'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold ${
                              isBuy
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {isBuy ? 'BUY (FROM BANKER)' : 'SELL (TO CUSTOMER)'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-white">
                          {tx.amountGiven?.toLocaleString('en-US', { minimumFractionDigits: 2 })} {tx.fromCurrency}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-300">
                          {tx.appliedRate}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold text-emerald-400 text-sm">
                          {tx.amountReceived?.toLocaleString('en-US', { minimumFractionDigits: 2 })} {tx.toCurrency}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 italic">
                          {tx.notes || '—'}
                        </td>
                      </tr>
                    );
                  })
                );
              })()}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="glass-card rounded-2xl w-full max-w-lg p-6 border border-slate-800 shadow-2xl relative space-y-5 bg-slate-900 max-h-[90vh] overflow-y-auto my-auto">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn overflow-y-auto">
          <div className="glass-card rounded-2xl w-full max-w-md p-6 border border-slate-800 shadow-2xl relative space-y-4 bg-slate-900 max-h-[90vh] overflow-y-auto my-auto">
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
                <span className="text-slate-300">{formatISTDateTime(selectedReceipt.createdAt)}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn overflow-y-auto">
          <div className="glass-card rounded-2xl w-full max-w-lg p-6 border border-slate-800 shadow-2xl relative space-y-5 bg-slate-900 max-h-[90vh] overflow-y-auto my-auto">
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
