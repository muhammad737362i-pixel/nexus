'use client';

import { useState, useEffect } from 'react';
import {
  Receipt,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
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
} from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<{
    totalCount: number;
    totalBuyVolume: number;
    totalSellVolume: number;
    totalProfit: number;
  }>({ totalCount: 0, totalBuyVolume: 0, totalSellVolume: 0, totalProfit: 0 });

  // Parties & Currencies lists for filter dropdowns
  const [parties, setParties] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);

  // Combined Search & Filter State
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL'); // ALL, BUY, SELL
  const [partyType, setPartyType] = useState<string>('ALL'); // ALL, CUSTOMER, BANKER
  const [selectedPartyId, setSelectedPartyId] = useState<string>('ALL');
  const [paymentMethod, setPaymentMethod] = useState<string>('ALL'); // ALL, CASH, BANK
  const [currencyFilter, setCurrencyFilter] = useState<string>('ALL');

  // Date Range Presets
  const [datePreset, setDatePreset] = useState<string>('ALL'); // ALL, TODAY, YESTERDAY, WEEK, MONTH, CUSTOM
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(true);
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);

  // Load parties and currencies for dropdown options
  useEffect(() => {
    async function loadMetadata() {
      try {
        const [partyRes, currRes] = await Promise.all([
          fetch('/api/parties'),
          fetch('/api/currencies'),
        ]);
        const partyJson = await partyRes.json();
        const currJson = await currRes.json();
        if (partyJson.success) setParties(partyJson.parties || []);
        if (currJson.success) setCurrencies(currJson.currencies || []);
      } catch (e) {
        console.error(e);
      }
    }
    loadMetadata();
  }, []);

  // Compute effective date range based on datePreset
  const getComputedDates = () => {
    if (datePreset === 'CUSTOM') {
      return { start: startDate, end: endDate };
    }
    const now = new Date();
    if (datePreset === 'TODAY') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
      return { start, end };
    }
    if (datePreset === 'YESTERDAY') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const start = new Date(y.getFullYear(), y.getMonth(), y.getDate()).toISOString();
      const end = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999).toISOString();
      return { start, end };
    }
    if (datePreset === 'WEEK') {
      const w = new Date(now);
      w.setDate(w.getDate() - 7);
      return { start: w.toISOString(), end: now.toISOString() };
    }
    if (datePreset === 'MONTH') {
      const m = new Date(now);
      m.setDate(m.getDate() - 30);
      return { start: m.toISOString(), end: now.toISOString() };
    }
    return { start: '', end: '' };
  };

  const fetchTransactions = async () => {
    try {
      let url = '/api/transactions';
      const params = new URLSearchParams();

      if (search.trim()) params.append('search', search.trim());
      if (filterType !== 'ALL') params.append('type', filterType);
      if (partyType !== 'ALL') params.append('partyType', partyType);
      if (selectedPartyId !== 'ALL') params.append('partyId', selectedPartyId);
      if (paymentMethod !== 'ALL') params.append('paymentMethod', paymentMethod);
      if (currencyFilter !== 'ALL') params.append('currency', currencyFilter);

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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [
    search,
    filterType,
    partyType,
    selectedPartyId,
    paymentMethod,
    currencyFilter,
    datePreset,
    startDate,
    endDate,
  ]);

  const resetAllFilters = () => {
    setSearch('');
    setFilterType('ALL');
    setPartyType('ALL');
    setSelectedPartyId('ALL');
    setPaymentMethod('ALL');
    setCurrencyFilter('ALL');
    setDatePreset('ALL');
    setStartDate('');
    setEndDate('');
  };

  const hasActiveFilters =
    search !== '' ||
    filterType !== 'ALL' ||
    partyType !== 'ALL' ||
    selectedPartyId !== 'ALL' ||
    paymentMethod !== 'ALL' ||
    currencyFilter !== 'ALL' ||
    datePreset !== 'ALL' ||
    startDate !== '' ||
    endDate !== '';

  const exportToCSV = () => {
    if (transactions.length === 0) return;
    const headers = [
      'ReceiptNo',
      'Type',
      'Party',
      'PartyType',
      'FromCurrency',
      'AmountGiven',
      'AppliedRate',
      'ToCurrency',
      'AmountReceived',
      'Profit',
      'PaymentMethod',
      'Status',
      'Date',
    ];
    const rows = transactions.map((t) => [
      t.receiptNo,
      t.type,
      `"${t.party?.name || ''}"`,
      t.party?.type || '',
      t.fromCurrency,
      t.amountGiven,
      t.appliedRate,
      t.toCurrency,
      t.amountReceived,
      t.totalProfit,
      t.paymentMethod,
      t.status,
      new Date(t.createdAt).toLocaleString(),
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Nexus_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  // Filter parties by selected partyType if applicable
  const filteredPartiesList =
    partyType === 'ALL' ? parties : parties.filter((p) => p.type === partyType);

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

        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* Live Summary Metrics for Filtered Search Results */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
              Filtered Trades
            </span>
            <div className="text-xl font-extrabold text-white mt-1">
              {metrics.totalCount} <span className="text-xs font-normal text-slate-400">Transactions</span>
            </div>
          </div>
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
              Filtered Buy Volume
            </span>
            <div className="text-xl font-extrabold text-emerald-400 mt-1">
              {metrics.totalBuyVolume.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ArrowDownLeft className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
              Filtered Sell Volume
            </span>
            <div className="text-xl font-extrabold text-amber-400 mt-1">
              {metrics.totalSellVolume.toLocaleString()}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider block">
              Filtered Est. Profit
            </span>
            <div className="text-xl font-extrabold text-emerald-400 mt-1">
              +${metrics.totalProfit.toFixed(2)}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* COMBINED MULTI-FILTER CONTROL PANEL */}
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

        {/* Row 2: Select Filter Dropdowns (Party Type, Specific Person, Trade Type, Payment Method, Currency) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Party Type Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Party Category
            </label>
            <select
              value={partyType}
              onChange={(e) => {
                setPartyType(e.target.value);
                setSelectedPartyId('ALL');
              }}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Categories</option>
              <option value="CUSTOMER">Customers Only</option>
              <option value="BANKER">Bankers Only</option>
            </select>
          </div>

          {/* Specific Party Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Select Person / Party
            </label>
            <select
              value={selectedPartyId}
              onChange={(e) => setSelectedPartyId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Persons / Counterparties</option>
              {filteredPartiesList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Trade Type Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Trade Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Trades (Buy & Sell)</option>
              <option value="BUY">BUY Trades Only</option>
              <option value="SELL">SELL Trades Only</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Payment Source
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Payment Sources</option>
              <option value="CASH">Cash Holding (Safe)</option>
              <option value="BANK">Bank Account</option>
            </select>
          </div>

          {/* Currency Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
              Currency Pair
            </label>
            <select
              value={currencyFilter}
              onChange={(e) => setCurrencyFilter(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-medium text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Currencies</option>
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.name})
                </option>
              ))}
            </select>
          </div>
        </div>
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
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Person / Party</th>
                <th className="py-3 px-4">Amount Given</th>
                <th className="py-3 px-4">Applied Rate</th>
                <th className="py-3 px-4">Amount Received</th>
                <th className="py-3 px-4">Est. Profit</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="space-y-2">
                      <Receipt className="w-8 h-8 mx-auto text-slate-600" />
                      <p className="font-semibold text-slate-400">No transactions match your search filters.</p>
                      {hasActiveFilters && (
                        <button
                          onClick={resetAllFilters}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">{tx.receiptNo}</td>
                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 font-bold">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] uppercase ${
                          tx.type === 'BUY'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        {tx.type === 'BUY' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                        {tx.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {tx.party?.name}
                      <span className="block text-[10px] text-slate-500 font-normal">
                        {tx.party?.type === 'CUSTOMER' ? 'Customer' : 'Banker'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {tx.amountGiven.toLocaleString('en-US')} <span className="text-slate-400 font-normal">{tx.fromCurrency}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-amber-300 font-bold">{tx.appliedRate}</td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {tx.amountReceived.toLocaleString('en-US')} <span className="text-slate-400 font-normal">{tx.toCurrency}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-400">
                      +${tx.totalProfit.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setActiveReceipt(tx)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" /> Receipt
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(tx.id, tx.receiptNo)}
                          title="Delete transaction"
                          className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-lg border border-rose-500/30 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-6 border border-slate-700 w-full max-w-md space-y-6 animate-fadeIn bg-slate-900 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-lg">Exchange Receipt</h3>
              </div>
              <button onClick={() => setActiveReceipt(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="text-center pb-3 border-b border-slate-800 space-y-1">
                <div className="font-bold text-sm tracking-wider text-indigo-400">NEXUS EXCHANGE</div>
                <div className="text-[10px] text-slate-500">Official Transaction Voucher</div>
                <div className="text-xs text-white font-bold">{activeReceipt.receiptNo}</div>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Date:</span>
                  <span className="text-slate-300">{new Date(activeReceipt.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Party Name:</span>
                  <span className="font-bold text-white">{activeReceipt.party?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Transaction Type:</span>
                  <span className="font-bold text-emerald-400">{activeReceipt.type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Paid:</span>
                  <span className="font-bold text-white">{activeReceipt.amountGiven} {activeReceipt.fromCurrency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Applied Rate:</span>
                  <span className="font-bold text-amber-300">{activeReceipt.appliedRate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount Received:</span>
                  <span className="font-bold text-white">{activeReceipt.amountReceived} {activeReceipt.toCurrency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Settlement Method:</span>
                  <span className="text-slate-300">{activeReceipt.paymentMethod}</span>
                </div>
              </div>

              {activeReceipt.notes && (
                <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                  Notes: {activeReceipt.notes}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-md"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
