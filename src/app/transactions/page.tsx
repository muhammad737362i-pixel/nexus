'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Receipt,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Printer,
  Download,
  X,
  FileText,
  DollarSign,
  Calendar,
  RotateCcw,
  Users,
  Building2,
  TrendingUp,
  Banknote,
  SlidersHorizontal,
  Trash2,
  MoreVertical,
  AlertTriangle,
} from 'lucide-react';
import { formatISTDateTime, toISTDateTimeLocalString, getTodayISTDateString } from '@/lib/dateUtils';

export interface TradeDealItem {
  key: string;
  isDeal: boolean;
  receiptDisplay: string;
  customerReceiptNo?: string;
  bankerReceiptNo?: string;
  createdAt: string;
  customerName: string;
  customerPhone?: string;
  bankerName: string;
  bankerPhone?: string;
  tradeAmountINR: number;
  customerRate?: number;
  bankerRate?: number;
  customerUSDT?: number;
  bankerUSDT?: number;
  profitUSDT: number;
  primaryTx: any;
  pairedTx?: any;
}

function parseAmountInput(input: string) {
  const raw = input.trim().toLowerCase();
  if (!raw) return {};

  const expanded = raw.replace(/(\d+(?:\.\d+)?)k\b/g, (_, num) => `${parseFloat(num) * 1000}`);

  if (expanded.includes(' to ')) {
    const [minStr, maxStr] = expanded.split(' to ');
    const min = minStr?.replace(/[^\d.]/g, '');
    const max = maxStr?.replace(/[^\d.]/g, '');
    return { minAmount: min || undefined, maxAmount: max || undefined };
  }

  if (expanded.includes('-')) {
    const parts = expanded.split('-');
    if (parts.length === 2) {
      const min = parts[0]?.replace(/[^\d.]/g, '');
      const max = parts[1]?.replace(/[^\d.]/g, '');
      return { minAmount: min || undefined, maxAmount: max || undefined };
    }
  }

  if (expanded.startsWith('>') || expanded.startsWith('>=')) {
    const min = expanded.replace(/[^\d.]/g, '');
    return { minAmount: min || undefined };
  }

  if (expanded.startsWith('<') || expanded.startsWith('<=')) {
    const max = expanded.replace(/[^\d.]/g, '');
    return { maxAmount: max || undefined };
  }

  const cleaned = expanded.replace(/[^\d.]/g, '');
  if (cleaned) {
    return { amount: cleaned };
  }

  return {};
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<{
    totalCount: number;
    totalBuyVolume: number;
    totalBuyVolumeUSDT?: number;
    totalSellVolume: number;
    totalSellVolumeUSDT?: number;
    totalProfit: number;
  }>({ totalCount: 0, totalBuyVolume: 0, totalBuyVolumeUSDT: 0, totalSellVolume: 0, totalSellVolumeUSDT: 0, totalProfit: 0 });

  // Parties metadata
  const [parties, setParties] = useState<any[]>([]);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [amountFilter, setAmountFilter] = useState('');
  const [selectedPartyId, setSelectedPartyId] = useState<string>('ALL');

  // Date Range Presets
  const [datePreset, setDatePreset] = useState<string>('ALL'); // ALL, TODAY, YESTERDAY, WEEK, MONTH, CUSTOM
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);
  const [showClearConfirmModal, setShowClearConfirmModal] = useState(false);
  const [clearing, setClearing] = useState(false);

  const handleClearAllTransactions = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/admin/clear-transactions', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setShowClearConfirmModal(false);
        setTransactions([]);
        setMetrics({ totalCount: 0, totalBuyVolume: 0, totalBuyVolumeUSDT: 0, totalSellVolume: 0, totalSellVolumeUSDT: 0, totalProfit: 0 });
      } else {
        alert(json.error || 'Failed to clear transactions');
      }
    } catch (e: any) {
      alert(e.message || 'Error clearing transactions');
    } finally {
      setClearing(false);
    }
  };

  // Load parties metadata only on mount
  useEffect(() => {
    async function loadMetadata() {
      try {
        const partyRes = await fetch('/api/parties');
        const partyJson = await partyRes.json();
        if (partyJson.success) setParties(partyJson.parties || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadMetadata();
  }, []);

  // Compute effective date range based on datePreset
  const getComputedDates = () => {
    if (datePreset === 'CUSTOM') {
      return { start: startDate, end: endDate };
    }
    const todayStr = getTodayISTDateString();
    const [y, m, d] = todayStr.split('-').map(Number);
    const todayObj = new Date(Date.UTC(y, m - 1, d));

    if (datePreset === 'TODAY') {
      return { start: todayStr, end: todayStr };
    }
    if (datePreset === 'YESTERDAY') {
      const yObj = new Date(todayObj.getTime() - 86400000);
      const yStr = `${yObj.getUTCFullYear()}-${String(yObj.getUTCMonth() + 1).padStart(2, '0')}-${String(yObj.getUTCDate()).padStart(2, '0')}`;
      return { start: yStr, end: yStr };
    }
    if (datePreset === 'WEEK') {
      const wObj = new Date(todayObj.getTime() - 7 * 86400000);
      const wStr = `${wObj.getUTCFullYear()}-${String(wObj.getUTCMonth() + 1).padStart(2, '0')}-${String(wObj.getUTCDate()).padStart(2, '0')}`;
      return { start: wStr, end: todayStr };
    }
    if (datePreset === 'MONTH') {
      const mObj = new Date(todayObj.getTime() - 30 * 86400000);
      const mStr = `${mObj.getUTCFullYear()}-${String(mObj.getUTCMonth() + 1).padStart(2, '0')}-${String(mObj.getUTCDate()).padStart(2, '0')}`;
      return { start: mStr, end: todayStr };
    }
    return { start: '', end: '' };
  };

  const executeSearch = async () => {
    setSearching(true);
    setHasSearched(true);
    try {
      let url = '/api/transactions';
      const params = new URLSearchParams();

      if (search.trim()) params.append('search', search.trim());
      if (selectedPartyId !== 'ALL') params.append('partyId', selectedPartyId);

      if (amountFilter.trim()) {
        const { amount: parsedAmt, minAmount: parsedMin, maxAmount: parsedMax } = parseAmountInput(amountFilter);
        if (parsedAmt) params.append('amount', parsedAmt);
        if (parsedMin) params.append('minAmount', parsedMin);
        if (parsedMax) params.append('maxAmount', parsedMax);
      }

      const { start, end } = getComputedDates();
      if (start) params.append('startDate', start);
      if (end) params.append('endDate', end);

      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions || []);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  const fetchTransactions = async () => {
    executeSearch();
  };

  const resetAllFilters = () => {
    setSearch('');
    setAmountFilter('');
    setSelectedPartyId('ALL');
    setDatePreset('ALL');
    setStartDate('');
    setEndDate('');
    setHasSearched(false);
    setTransactions([]);
    setMetrics({ totalCount: 0, totalBuyVolume: 0, totalBuyVolumeUSDT: 0, totalSellVolume: 0, totalSellVolumeUSDT: 0, totalProfit: 0 });
  };

  const hasActiveFilters =
    search !== '' ||
    amountFilter.trim() !== '' ||
    selectedPartyId !== 'ALL' ||
    datePreset !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  // Unified Trade Deals Grouping
  const deals = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return (b.receiptNo || '').localeCompare(a.receiptNo || '', undefined, { numeric: true });
    });
    const seenReceipts = new Set<string>();
    const result: TradeDealItem[] = [];

    for (const tx of sorted) {
      if (seenReceipts.has(tx.receiptNo)) continue;
      const pairedReceipt = tx.pairedTx?.receiptNo;

      if (pairedReceipt) {
        seenReceipts.add(tx.receiptNo);
        seenReceipts.add(pairedReceipt);

        const isCustomer = tx.type === 'BUY';
        const buyLeg = isCustomer ? tx : tx.pairedTx;
        const sellLeg = isCustomer ? tx.pairedTx : tx;

        const customerUSDT = buyLeg?.amountReceived || (buyLeg?.appliedRate > 0 ? buyLeg.amountGiven / buyLeg.appliedRate : 0);
        const bankerUSDT = sellLeg?.amountReceived || (sellLeg?.appliedRate > 0 ? sellLeg.amountGiven / sellLeg.appliedRate : 0);
        const profit = sellLeg?.totalProfit !== undefined && sellLeg?.totalProfit !== null && sellLeg?.totalProfit > 0
          ? sellLeg.totalProfit
          : (customerUSDT > 0 && bankerUSDT > 0 ? Number((customerUSDT - bankerUSDT).toFixed(4)) : 0);

        result.push({
          key: `${buyLeg.receiptNo}-${sellLeg.receiptNo}`,
          isDeal: true,
          receiptDisplay: `${buyLeg.receiptNo} / ${sellLeg.receiptNo}`,
          customerReceiptNo: buyLeg.receiptNo,
          bankerReceiptNo: sellLeg.receiptNo,
          createdAt: tx.createdAt,
          customerName: buyLeg.party?.name || buyLeg.partyName || 'Customer',
          customerPhone: buyLeg.party?.phone,
          bankerName: sellLeg.party?.name || sellLeg.partyName || 'Banker',
          bankerPhone: sellLeg.party?.phone,
          tradeAmountINR: tx.amountGiven,
          customerRate: buyLeg.appliedRate,
          bankerRate: sellLeg.appliedRate,
          customerUSDT: Number(customerUSDT.toFixed(4)),
          bankerUSDT: Number(bankerUSDT.toFixed(4)),
          profitUSDT: Number(profit.toFixed(2)),
          primaryTx: tx,
          pairedTx: tx.pairedTx,
        });
      } else {
        seenReceipts.add(tx.receiptNo);
        const isBuy = tx.type === 'BUY';
        const usdtAmt = tx.amountReceived || (tx.appliedRate > 0 ? tx.amountGiven / tx.appliedRate : 0);
        result.push({
          key: tx.id || tx.receiptNo,
          isDeal: false,
          receiptDisplay: tx.receiptNo,
          customerReceiptNo: isBuy ? tx.receiptNo : undefined,
          bankerReceiptNo: !isBuy ? tx.receiptNo : undefined,
          createdAt: tx.createdAt,
          customerName: isBuy ? (tx.party?.name || 'Customer') : '—',
          customerPhone: isBuy ? tx.party?.phone : undefined,
          bankerName: !isBuy ? (tx.party?.name || 'Banker') : '—',
          bankerPhone: !isBuy ? tx.party?.phone : undefined,
          tradeAmountINR: tx.amountGiven,
          customerRate: isBuy ? tx.appliedRate : undefined,
          bankerRate: !isBuy ? tx.appliedRate : undefined,
          customerUSDT: isBuy ? Number(usdtAmt.toFixed(4)) : undefined,
          bankerUSDT: !isBuy ? Number(usdtAmt.toFixed(4)) : undefined,
          profitUSDT: Number((tx.totalProfit || 0).toFixed(2)),
          primaryTx: tx,
        });
      }
    }
    return result;
  }, [transactions]);

  const totalTradeVolumeINR = useMemo(() => {
    return deals.reduce((sum, d) => sum + (d.tradeAmountINR || 0), 0);
  }, [deals]);

  const totalCustomerUSDT = useMemo(() => {
    return deals.reduce((sum, d) => sum + (d.customerUSDT || 0), 0);
  }, [deals]);

  const totalProfitUSDT = useMemo(() => {
    return deals.reduce((sum, d) => sum + (d.profitUSDT || 0), 0);
  }, [deals]);

  const exportToCSV = () => {
    if (deals.length === 0) return;
    const headers = [
      'CustomerReceiptNo',
      'BankerReceiptNo',
      'Date',
      'Customer',
      'Banker',
      'TradeAmountINR',
      'CustomerRate',
      'CustomerUSDT',
      'BankerRate',
      'BankerUSDT',
      'EstProfitUSDT',
    ];
    const rows = deals.map((d) => [
      d.customerReceiptNo || '',
      d.bankerReceiptNo || '',
      formatISTDateTime(d.createdAt),
      `"${d.customerName}"`,
      `"${d.bankerName}"`,
      d.tradeAmountINR,
      d.customerRate || '',
      d.customerUSDT || '',
      d.bankerRate || '',
      d.bankerUSDT || '',
      d.profitUSDT,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Nexus_Trade_Deals_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Edit Transaction Popup State
  const [editingTx, setEditingTx] = useState<any | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const handleDeleteTransaction = async (id: string, receiptNo: string) => {
    if (!confirm(`Are you sure you want to delete transaction ${receiptNo}? This will revert inventory balances.`)) return;
    try {
      const res = await fetch(`/api/transactions?id=${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        fetchTransactions();
      } else {
        alert(json.error || 'Failed to delete transaction');
      }
    } catch (e: any) {
      alert(e.message || 'Error deleting transaction');
    }
  };

  const handleSaveTransactionEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;

    setEditSaving(true);
    try {
      const res = await fetch('/api/transactions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTx.id,
          partyId: editingTx.partyId,
          type: editingTx.type,
          amountGiven: editingTx.amountGiven,
          appliedRate: editingTx.appliedRate,
          fee: editingTx.fee,
          paymentMethod: editingTx.paymentMethod,
          notes: editingTx.notes,
          createdAt: editingTx.createdAt,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setEditingTx(null);
        fetchTransactions();
      } else {
        alert(json.error || 'Failed to update transaction');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating transaction');
    } finally {
      setEditSaving(false);
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
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            Master Transactions Audit Log
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Complete history of all Buy and Sell exchange trades with printable receipts and combined filters.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/trade"
            className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-md shadow-indigo-600/30 transition"
          >
            <ArrowLeftRight className="w-4 h-4" /> Record Trade Deal
          </Link>
          {hasActiveFilters && (
            <button
              onClick={resetAllFilters}
              className="px-3.5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl font-semibold text-xs flex items-center gap-1.5 border border-rose-500/30 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear Filters
            </button>
          )}
          <button
            onClick={exportToCSV}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs flex items-center gap-2 border border-slate-700 transition"
          >
            <Download className="w-4 h-4" /> Export Filtered CSV
          </button>
          <button
            onClick={() => setShowClearConfirmModal(true)}
            className="px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-xl font-semibold text-xs flex items-center gap-2 border border-rose-500/30 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" /> Clear All History
          </button>
        </div>
      </div>

      {/* Live Summary Metrics for Filtered Search Results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
              Filtered Deals
            </span>
            <div className="text-xl font-extrabold text-white mt-1">
              {deals.length} <span className="text-xs font-normal text-slate-400">Deals</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
              Total Trade Volume
            </span>
            <div className="text-xl font-extrabold text-white mt-1">
              ₹{totalTradeVolumeINR.toLocaleString('en-IN')}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Banknote className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
              Customer USDT Given
            </span>
            <div className="text-xl font-extrabold text-indigo-400 mt-1">
              {totalCustomerUSDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
              Total Est. Profit
            </span>
            <div className="text-xl font-extrabold text-emerald-400 mt-1">
              +${totalProfitUSDT.toFixed(2)} USDT
            </div>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* STREAMLINED SEARCH & FILTER CONTROL PANEL */}
      <div className="glass-card rounded-2xl p-5 border border-slate-800 space-y-4">
        {/* Row 1: Search Input & Date Preset Chips */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Text Search Box */}
          <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 flex-1 focus-within:border-indigo-500">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') executeSearch();
              }}
              placeholder="Search by receipt #, customer/banker name, or notes..."
              className="bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none w-full font-medium"
            />
            {search && (
              <button onClick={() => setSearch('')} className="text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Date Presets */}
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
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  datePreset === p.value
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white border border-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Pickers (Visible if datePreset === 'CUSTOM') */}
        {datePreset === 'CUSTOM' && (
          <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 flex flex-wrap items-center gap-4 animate-fadeIn text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">Start Date:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold">End Date:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-medium focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        <hr className="border-slate-800/80" />

        {/* Row 2: Select Person / Party, INR Amount Filter & Execute Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
          {/* Specific Party Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Select Person / Party
            </label>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Persons / Counterparties</option>
              {parties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type === 'CUSTOMER' ? 'Customer' : 'Banker'})
                </option>
              ))}
            </select>
          </div>

          {/* INR Amount Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              INR Amount (₹)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-slate-400 font-bold text-xs pointer-events-none">₹</span>
              <input
                type="text"
                value={amountFilter}
                onChange={(e) => setAmountFilter(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') executeSearch();
                }}
                placeholder="e.g. 50000 or 10k-50k"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-7 py-2.5 text-white font-medium text-xs placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              {amountFilter && (
                <button
                  type="button"
                  onClick={() => setAmountFilter('')}
                  className="absolute right-2.5 text-slate-500 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Search Transactions Button */}
          <div>
            <button
              onClick={executeSearch}
              disabled={searching}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center justify-center gap-2"
            >
              {searching ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Searching Transactions...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Search Transactions Now</span>
                </>
              )}
            </button>
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
            <span>Filters applied: showing matching trade records.</span>
            <button
              onClick={resetAllFilters}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold underline cursor-pointer"
            >
              Reset all filters
            </button>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            Audit Ledger Results ({transactions.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Banker</th>
                <th className="py-3 px-4">Trade Amount (₹)</th>
                <th className="py-3 px-4">Customer USDT</th>
                <th className="py-3 px-4">Banker USDT</th>
                <th className="py-3 px-4">Est. Profit</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {deals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center text-slate-500">
                    {!hasSearched ? (
                      <div className="space-y-3 max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto">
                          <Search className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">Search Transactions Audit Log</h4>
                          <p className="text-slate-400 text-xs mt-1">
                            Select search filters above and click <strong>"Search Transactions Now"</strong> to load trade history.
                          </p>
                        </div>
                        <button
                          onClick={executeSearch}
                          disabled={searching}
                          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/20 transition cursor-pointer flex items-center justify-center gap-2 mx-auto"
                        >
                          <Search className="w-3.5 h-3.5" /> Search Transactions Now
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Receipt className="w-8 h-8 mx-auto text-slate-600" />
                        <p className="font-semibold text-slate-400">No transactions match your search filters.</p>
                        {hasActiveFilters && (
                          <button
                            onClick={resetAllFilters}
                            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer"
                          >
                            Clear all search filters
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                deals.map((deal) => (
                  <tr key={deal.key} className="hover:bg-slate-800/40 transition">
                    {/* Receipt # */}
                    <td className="py-3.5 px-4 font-mono text-xs">
                      {deal.isDeal ? (
                        <div className="space-y-0.5">
                          <div className="font-bold text-indigo-400 flex items-center gap-1 text-[11px]">
                            <span className="text-[10px] text-slate-500 font-sans font-normal">C:</span>
                            {deal.customerReceiptNo}
                          </div>
                          <div className="text-purple-400 font-semibold flex items-center gap-1 text-[11px]">
                            <span className="text-[10px] text-slate-500 font-sans font-normal">B:</span>
                            {deal.bankerReceiptNo}
                          </div>
                        </div>
                      ) : (
                        <span className="font-bold text-indigo-400">{deal.receiptDisplay}</span>
                      )}
                    </td>

                    {/* Date & Time */}
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {formatISTDateTime(deal.createdAt)}
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                        <span>{deal.customerName}</span>
                      </div>
                      {deal.customerPhone && (
                        <span className="text-[10px] text-slate-500 font-mono pl-5 block">
                          {deal.customerPhone}
                        </span>
                      )}
                    </td>

                    {/* Banker */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span>{deal.bankerName}</span>
                      </div>
                      {deal.bankerPhone && (
                        <span className="text-[10px] text-slate-500 font-mono pl-5 block">
                          {deal.bankerPhone}
                        </span>
                      )}
                    </td>

                    {/* Trade Amount (₹) */}
                    <td className="py-3.5 px-4 font-bold text-white whitespace-nowrap">
                      ₹{deal.tradeAmountINR?.toLocaleString('en-IN')}
                    </td>

                    {/* Customer USDT */}
                    <td className="py-3.5 px-4">
                      {deal.customerUSDT !== undefined ? (
                        <div>
                          <span className="font-bold text-emerald-400 font-mono">
                            {deal.customerUSDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </span>
                          <span className="text-slate-400 text-[10px] ml-1">USDT</span>
                          {deal.customerRate && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              @ ₹{deal.customerRate}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Banker USDT */}
                    <td className="py-3.5 px-4">
                      {deal.bankerUSDT !== undefined ? (
                        <div>
                          <span className="font-bold text-amber-400 font-mono">
                            {deal.bankerUSDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                          </span>
                          <span className="text-slate-400 text-[10px] ml-1">USDT</span>
                          {deal.bankerRate && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              @ ₹{deal.bankerRate}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Est. Profit */}
                    <td className="py-3.5 px-4 font-bold whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-mono ${
                          deal.profitUSDT >= 0
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        <TrendingUp className="w-3 h-3" />
                        {deal.profitUSDT >= 0 ? '+' : ''}${deal.profitUSDT.toFixed(2)} USDT
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setActiveReceipt(deal)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer transition"
                        >
                          <FileText className="w-3 h-3" /> Receipt
                        </button>
                        <button
                          onClick={() => setEditingTx({ ...deal.primaryTx, createdAt: toISTDateTimeLocalString(deal.primaryTx.createdAt) })}
                          title="Edit or Delete transaction"
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card rounded-2xl p-6 border border-slate-700 w-full max-w-lg space-y-6 animate-fadeIn bg-slate-900 text-white max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-lg">
                  {activeReceipt.isDeal ? 'Trade Deal Receipt Voucher' : 'Exchange Receipt'}
                </h3>
              </div>
              <button onClick={() => setActiveReceipt(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-4 font-mono text-xs">
              <div className="text-center pb-3 border-b border-slate-800 space-y-1">
                <div className="font-bold text-base tracking-wider text-indigo-400">NEXUS EXCHANGE</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest">Official Trade Deal Voucher</div>
                <div className="text-xs text-white font-bold mt-1">
                  {activeReceipt.receiptDisplay || activeReceipt.receiptNo}
                </div>
              </div>

              {activeReceipt.isDeal ? (
                <div className="space-y-3 font-sans">
                  <div className="flex justify-between font-mono text-xs">
                    <span className="text-slate-500">Date & Time:</span>
                    <span className="text-slate-200">{formatISTDateTime(activeReceipt.createdAt)}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-center">
                    <span className="text-slate-400 text-xs font-semibold uppercase">Total Trade Amount:</span>
                    <span className="text-base font-extrabold text-white">
                      ₹{activeReceipt.tradeAmountINR?.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Customer Leg */}
                  <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-1.5">
                    <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide flex items-center justify-between">
                      <span>Customer Order (Buy Leg)</span>
                      <span className="font-mono text-slate-400">{activeReceipt.customerReceiptNo}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Customer:</span>
                      <span className="font-bold text-white">{activeReceipt.customerName}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Customer Rate:</span>
                      <span className="font-mono font-bold text-amber-300">₹{activeReceipt.customerRate}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">USDT Delivered:</span>
                      <span className="font-mono font-bold text-emerald-400">{activeReceipt.customerUSDT} USDT</span>
                    </div>
                  </div>

                  {/* Banker Leg */}
                  <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-1.5">
                    <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wide flex items-center justify-between">
                      <span>Banker Order (Sell Leg)</span>
                      <span className="font-mono text-slate-400">{activeReceipt.bankerReceiptNo}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Banker:</span>
                      <span className="font-bold text-white">{activeReceipt.bankerName}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Banker Rate:</span>
                      <span className="font-mono font-bold text-amber-300">₹{activeReceipt.bankerRate}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">USDT Sourced:</span>
                      <span className="font-mono font-bold text-amber-400">{activeReceipt.bankerUSDT} USDT</span>
                    </div>
                  </div>

                  {/* Profit */}
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between items-center text-xs">
                    <span className="font-semibold text-emerald-300">Deal Net Profit:</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">
                      +${activeReceipt.profitUSDT?.toFixed(2)} USDT
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Date:</span>
                    <span className="text-slate-300">{formatISTDateTime(activeReceipt.createdAt)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Party Name:</span>
                    <span className="font-bold text-white">{activeReceipt.party?.name || activeReceipt.customerName || activeReceipt.bankerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Transaction Type:</span>
                    <span className="font-bold text-emerald-400">{activeReceipt.type || (activeReceipt.customerReceiptNo ? 'BUY' : 'SELL')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Amount Paid:</span>
                    <span className="font-bold text-white">₹{activeReceipt.tradeAmountINR || activeReceipt.amountGiven}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Applied Rate:</span>
                    <span className="font-bold text-amber-300">{activeReceipt.customerRate || activeReceipt.bankerRate || activeReceipt.appliedRate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">USDT Amount:</span>
                    <span className="font-bold text-white">{activeReceipt.customerUSDT || activeReceipt.bankerUSDT || activeReceipt.amountReceived} USDT</span>
                  </div>
                </div>
              )}

              {(activeReceipt.primaryTx?.notes || activeReceipt.notes) && (
                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 font-sans">
                  Notes: {activeReceipt.primaryTx?.notes || activeReceipt.notes}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Print Voucher
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit & Delete Transaction Modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass-card rounded-2xl p-6 border border-slate-700 w-full max-w-lg space-y-5 animate-fadeIn bg-slate-900 text-white max-h-[90vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-lg">Edit Transaction</h3>
                  <p className="text-xs text-slate-400 font-mono">Receipt: {editingTx.receiptNo}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingTx(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTransactionEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Transaction Date & Time */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-slate-400 font-semibold">Transaction Date & Time</label>
                  <input
                    type="datetime-local"
                    value={editingTx.createdAt || ''}
                    onChange={(e) => setEditingTx({ ...editingTx, createdAt: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>

                {/* Person / Party */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-slate-400 font-semibold">Party / Person</label>
                  <select
                    value={editingTx.partyId || ''}
                    onChange={(e) => setEditingTx({ ...editingTx, partyId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                    required
                  >
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Transaction Type */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Transaction Type</label>
                  <select
                    value={editingTx.type || 'BUY'}
                    onChange={(e) => setEditingTx({ ...editingTx, type: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="BUY">BUY</option>
                    <option value="SELL">SELL</option>
                  </select>
                </div>

                {/* Payment Method */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Payment Method</label>
                  <select
                    value={editingTx.paymentMethod || 'CASH'}
                    onChange={(e) => setEditingTx({ ...editingTx, paymentMethod: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="CASH">CASH</option>
                    <option value="BANK">BANK</option>
                  </select>
                </div>

                {/* Amount Given */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">
                    Amount Given ({editingTx.fromCurrency})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={editingTx.amountGiven || ''}
                    onChange={(e) =>
                      setEditingTx({ ...editingTx, amountGiven: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-bold"
                    required
                  />
                </div>

                {/* Applied Rate */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold">Applied Rate</label>
                  <input
                    type="number"
                    step="any"
                    value={editingTx.appliedRate || ''}
                    onChange={(e) =>
                      setEditingTx({ ...editingTx, appliedRate: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500 font-bold text-amber-300"
                    required
                  />
                </div>

                {/* Fee */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-slate-400 font-semibold">Fee</label>
                  <input
                    type="number"
                    step="any"
                    value={editingTx.fee !== undefined ? editingTx.fee : 0}
                    onChange={(e) =>
                      setEditingTx({ ...editingTx, fee: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-slate-400 font-semibold">Notes / Remarks</label>
                  <textarea
                    rows={2}
                    value={editingTx.notes || ''}
                    onChange={(e) => setEditingTx({ ...editingTx, notes: e.target.value })}
                    placeholder="Transaction details or comments..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    await handleDeleteTransaction(editingTx.id, editingTx.receiptNo);
                    setEditingTx(null);
                  }}
                  className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl font-bold flex items-center gap-1.5 border border-rose-500/30 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Delete Transaction
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingTx(null)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition disabled:opacity-50 cursor-pointer"
                  >
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear All Transactions Confirmation Modal */}
      {showClearConfirmModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Clear All Transaction History?</h3>
                <p className="text-slate-400 text-xs mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-slate-300 text-xs leading-relaxed">
              Are you sure you want to permanently delete all buy/sell transactions, payments, and ledger entries? 
              <br /><br />
              <strong className="text-emerald-400 font-semibold">• Preserved:</strong> Parties, Users, and Rates will stay intact.
              <br />
              <strong className="text-rose-400 font-semibold">• Reset:</strong> Cash and bank inventory balances will be reset to zero.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirmModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={clearing}
                onClick={handleClearAllTransactions}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                {clearing ? 'Clearing...' : 'Yes, Delete All Data'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
