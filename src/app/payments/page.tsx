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
} from 'lucide-react';

export default function PaymentsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [directionFilter, setDirectionFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');

  // Form State
  const [paymentType, setPaymentType] = useState<'RECEIVED' | 'SENT'>('RECEIVED');
  const [partyId, setPartyId] = useState('');
  const [currencyCode, setCurrencyCode] = useState('USD');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');

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
          setPartyId(json.parties[0].id);
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

  const openNewPaymentModal = (direction: 'RECEIVED' | 'SENT' = 'RECEIVED') => {
    setPaymentType(direction);
    setAmount('');
    setReferenceNo('');
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

  // Filter payments
  const filteredPayments = payments.filter((p: any) => {
    const matchesSearch =
      p.receiptNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.referenceNo && p.referenceNo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDirection = directionFilter === 'ALL' || p.type === directionFilter;
    const matchesMethod = methodFilter === 'ALL' || p.paymentMethod === methodFilter;

    return matchesSearch && matchesDirection && matchesMethod;
  });

  return (
    <div className="w-full space-y-6">
      {/* Header & New Payment Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Banknote className="w-7 h-7 text-emerald-400" /> Buyer & Seller Payments Hub
          </h1>
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
            <ArrowUpRight className="w-4 h-4" /> Send Payment (to Seller)
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Received Today */}
        <div className="glass-card rounded-2xl p-5 border border-emerald-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payments Received Today</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            ${summary.todayReceived?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-400">Total collected from buyers</div>
        </div>

        {/* Metric 2: Sent Today */}
        <div className="glass-card rounded-2xl p-5 border border-amber-500/30 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Payments Sent Today</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-400">
            ${summary.todaySent?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-400">Total paid to sellers/bankers</div>
        </div>

        {/* Metric 3: Net Payment Flow */}
        <div className="glass-card rounded-2xl p-5 border border-indigo-500/30 relative overflow-hidden bg-gradient-to-br from-indigo-950/40 to-slate-900/60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Today's Net Cashflow</span>
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-bold ${summary.netToday >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {summary.netToday >= 0 ? '+' : ''}${summary.netToday?.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-indigo-300">Received minus Sent</div>
        </div>

        {/* Metric 4: Total All Time */}
        <div className="glass-card rounded-2xl p-5 border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">All-Time Receipts</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white">
            {payments.length} <span className="text-xs text-slate-400 font-normal">Entries</span>
          </div>
          <div className="mt-2 text-xs text-slate-400">Synchronized with Party Ledgers</div>
        </div>
      </div>

      {/* Main Content Card: Search, Filters & Payments Table */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        {/* Filter Controls Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search party name, receipt #, or ref #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                className="bg-transparent text-slate-300 font-semibold focus:outline-none"
              >
                <option value="ALL">All Payment Types</option>
                <option value="RECEIVED">📥 Received (from Buyers)</option>
                <option value="SENT">📤 Sent (to Sellers)</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl text-xs">
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="bg-transparent text-slate-300 font-semibold focus:outline-none"
              >
                <option value="ALL">All Payment Channels</option>
                <option value="CASH">💵 Cash</option>
                <option value="BANK">🏛️ Bank Transfer</option>
                <option value="ONLINE">⚡ Online / Wallet</option>
                <option value="CHEQUE">📝 Cheque</option>
              </select>
            </div>
          </div>
        </div>

        {/* Payments Table */}
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
                  <td colSpan={8} className="py-8 text-center text-xs text-slate-500">
                    No payment records match your filters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p: any) => {
                  const isReceived = p.type === 'RECEIVED';
                  const isCustomer = p.party?.type === 'CUSTOMER';

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
                        <div className="font-bold text-white flex items-center gap-1.5">
                          {isCustomer ? (
                            <Users className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                          )}
                          <span>{p.party?.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">
                          {isCustomer ? 'Buyer / Customer' : 'Seller / Banker'}
                        </span>
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
                        {p.paymentMethod === 'CHEQUE' && '📝 Cheque'}
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
                        <button
                          onClick={() => setSelectedReceipt(p)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-[11px] transition cursor-pointer"
                        >
                          View Voucher
                        </button>
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
              {/* Direction Toggle */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  Payment Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType('RECEIVED')}
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
                    onClick={() => setPaymentType('SENT')}
                    className={`py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 border transition cursor-pointer ${
                      paymentType === 'SENT'
                        ? 'bg-amber-600/20 text-amber-400 border-amber-500 shadow-lg shadow-amber-600/20'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" /> Sent (to Seller)
                  </button>
                </div>
              </div>

              {/* Party Selector */}
              <div>
                <label className="block text-slate-400 font-semibold mb-1.5 uppercase tracking-wider text-[10px]">
                  Select Buyer / Seller Party
                </label>
                <select
                  value={partyId}
                  onChange={(e) => setPartyId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-medium focus:outline-none focus:border-indigo-500"
                  required
                >
                  {parties.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.type === 'CUSTOMER' ? 'Buyer / Customer' : 'Seller / Banker'})
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
              >
                <Printer className="w-3.5 h-3.5" /> Print Voucher
              </button>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
