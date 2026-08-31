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
} from 'lucide-react';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);

  const fetchTransactions = async () => {
    try {
      let url = '/api/transactions';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (filterType !== 'ALL') params.append('type', filterType);
      if (params.toString()) url += `?${params.toString()}`;

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setTransactions(data.transactions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [search, filterType]);

  const exportToCSV = () => {
    if (transactions.length === 0) return;
    const headers = ['ReceiptNo', 'Type', 'Party', 'FromCurrency', 'AmountGiven', 'AppliedRate', 'ToCurrency', 'AmountReceived', 'Profit', 'PaymentMethod', 'Status', 'Date'];
    const rows = transactions.map((t) => [
      t.receiptNo,
      t.type,
      `"${t.party.name}"`,
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

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Nexus_Transactions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            Complete history of all Buy and Sell exchange trades with printable receipts.
          </p>
        </div>

        <button
          onClick={exportToCSV}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs flex items-center gap-2 border border-slate-700 transition self-start"
        >
          <Download className="w-4 h-4" /> Export CSV Ledger
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 flex flex-col md:flex-row items-center gap-4 justify-between">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search receipt #, customer name, notes..."
            className="bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none w-full"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-500" />
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterType === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            All Types
          </button>
          <button
            onClick={() => setFilterType('BUY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterType === 'BUY' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            BUY Trades
          </button>
          <button
            onClick={() => setFilterType('SELL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              filterType === 'SELL' ? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-400'
            }`}
          >
            SELL Trades
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Receipt #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Party</th>
                <th className="py-3 px-4">Amount Given</th>
                <th className="py-3 px-4">Rate</th>
                <th className="py-3 px-4">Amount Received</th>
                <th className="py-3 px-4">Est Profit</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No transactions matching criteria.
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
                      <span className="block text-[10px] text-slate-500 font-normal">{tx.party?.type}</span>
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
                      <button
                        onClick={() => setActiveReceipt(tx)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" /> Receipt
                      </button>
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
