'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Building2,
  Plus,
  Search,
  Phone,
  Mail,
  Landmark,
  Sparkles,
  SlidersHorizontal,
  RefreshCw,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  Pencil,
  Trash2,
} from 'lucide-react';

export default function BankersPage() {
  const [bankers, setBankers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newBanker, setNewBanker] = useState({ name: '', bankDetails: '', phone: '', email: '', notes: '' });

  // Edit Modal State
  const [editingBanker, setEditingBanker] = useState<any | null>(null);

  const [saving, setSaving] = useState(false);

  // Drawer State
  const [selectedBanker, setSelectedBanker] = useState<any | null>(null);

  const fetchBankers = async () => {
    try {
      const res = await fetch('/api/parties?type=BANKER');
      const data = await res.json();
      if (data.success) {
        setBankers(data.parties);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBankers();
  }, []);

  const handleCreateBanker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBanker.name) return;

    setSaving(true);
    try {
      const res = await fetch('/api/parties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newBanker, type: 'BANKER' }),
      });
      const data = await res.json();
      if (data.success) {
        setIsAddModalOpen(false);
        setNewBanker({ name: '', bankDetails: '', phone: '', email: '', notes: '' });
        fetchBankers();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateBanker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanker || !editingBanker.name) return;

    setSaving(true);
    try {
      const res = await fetch('/api/parties', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingBanker),
      });
      const data = await res.json();
      if (data.success) {
        setEditingBanker(null);
        fetchBankers();
      } else {
        alert(data.error || 'Failed to update banker');
      }
    } catch (e: any) {
      alert(e.message || 'Error updating banker');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBanker = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete banker "${name}"? This will remove all associated custom rates and transaction logs.`)) return;

    try {
      const res = await fetch(`/api/parties?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchBankers();
      } else {
        alert(data.error || 'Failed to delete banker');
      }
    } catch (e: any) {
      alert(e.message || 'Error deleting banker');
    }
  };

  const filtered = bankers.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      (b.bankDetails && b.bankDetails.toLowerCase().includes(search.toLowerCase())) ||
      (b.phone && b.phone.includes(search))
  );

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
              <Building2 className="w-5 h-5" />
            </div>
            Bankers & Wholesale Vendors
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage liquidity providers, bank wire instructions, and banker-specific custom rate spreads.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition self-start cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Add New Banker
        </button>
      </div>

      {/* Search Bar */}
      <div className="glass-card rounded-2xl p-4 border border-slate-800 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search banker name, IBAN, bank account details..."
          className="bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none w-full font-medium"
        />
      </div>

      {/* Banker Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((banker) => {
          const hasCustomRates = banker.partyRates && banker.partyRates.length > 0;
          const totalTx = banker.transactions?.length || 0;

          return (
            <div
              key={banker.id}
              className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-indigo-500/40 transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-base text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-400" />
                      {banker.name}
                    </h3>
                    <span className="text-[11px] text-slate-400">Banker ID: {banker.id.substring(0, 8)}</span>
                  </div>
                  {hasCustomRates && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Custom Spread
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-slate-300">
                  {banker.bankDetails && (
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                        Bank Details / IBAN
                      </span>
                      <p className="text-[11px] font-mono text-cyan-300 break-all">{banker.bankDetails}</p>
                    </div>
                  )}

                  {banker.phone && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Phone className="w-3.5 h-3.5 text-indigo-400" /> {banker.phone}
                    </div>
                  )}
                  {banker.email && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Mail className="w-3.5 h-3.5 text-indigo-400" /> {banker.email}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div className="text-xs text-slate-400">
                  Trades: <span className="font-bold text-white">{totalTx}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setEditingBanker(banker)}
                    title="Edit Banker"
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteBanker(banker.id, banker.name)}
                    title="Delete Banker"
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <Link
                    href={`/rates?partyId=${banker.id}`}
                    className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 text-xs font-semibold flex items-center gap-1"
                    title="Set Fixed Rates"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" /> Rate
                  </Link>
                  <button
                    onClick={() => setSelectedBanker(banker)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
                  >
                    Ledger
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Banker Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-6 border border-slate-800 w-full max-w-md space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">Add New Banker / Vendor</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBanker} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Banker / Firm Name *</label>
                <input
                  type="text"
                  required
                  value={newBanker.name}
                  onChange={(e) => setNewBanker({ ...newBanker, name: e.target.value })}
                  placeholder="e.g. Apex Global Liquidity Ltd"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Bank Details / IBAN / Crypto Wallet</label>
                <textarea
                  value={newBanker.bankDetails}
                  onChange={(e) => setNewBanker({ ...newBanker, bankDetails: e.target.value })}
                  placeholder="e.g. IBAN: GB89 APEX..., BIC: APEXGB2L or TRC20 Wallet Address"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500 h-20 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Phone / Settlement Desk Contact</label>
                <input
                  type="text"
                  value={newBanker.phone}
                  onChange={(e) => setNewBanker({ ...newBanker, phone: e.target.value })}
                  placeholder="e.g. +44 20 7946 0912"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={newBanker.email}
                  onChange={(e) => setNewBanker({ ...newBanker, email: e.target.value })}
                  placeholder="e.g. settlements@banker.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />} Save Banker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Banker Modal */}
      {editingBanker && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-6 border border-slate-800 w-full max-w-md space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-lg text-white">Edit Banker Details</h3>
              <button onClick={() => setEditingBanker(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBanker} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Banker Name *</label>
                <input
                  type="text"
                  required
                  value={editingBanker.name}
                  onChange={(e) => setEditingBanker({ ...editingBanker, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Bank Details / IBAN / Wallet</label>
                <textarea
                  value={editingBanker.bankDetails || ''}
                  onChange={(e) => setEditingBanker({ ...editingBanker, bankDetails: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500 h-20 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Phone Number</label>
                <input
                  type="text"
                  value={editingBanker.phone || ''}
                  onChange={(e) => setEditingBanker({ ...editingBanker, phone: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Email Address</label>
                <input
                  type="email"
                  value={editingBanker.email || ''}
                  onChange={(e) => setEditingBanker({ ...editingBanker, email: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingBanker(null)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />} Update Banker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Banker Detail Drawer */}
      {selectedBanker && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex justify-end">
          <div className="bg-slate-900 border-l border-slate-800 w-full max-w-xl h-full p-6 space-y-6 overflow-y-auto animate-slideLeft">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="font-bold text-xl text-white">{selectedBanker.name}</h2>
                <span className="text-xs text-indigo-400">Wholesale Banker Account & Settlement Ledger</span>
              </div>
              <button onClick={() => setSelectedBanker(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Wholesale Settlements Log</h4>
              {selectedBanker.transactions?.length === 0 ? (
                <div className="text-xs text-slate-500 py-6 text-center">No recorded trades with this banker yet.</div>
              ) : (
                <div className="space-y-2">
                  {selectedBanker.transactions.map((tx: any) => (
                    <div key={tx.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2.5">
                        {tx.type === 'BUY' ? (
                          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <ArrowDownLeft className="w-4 h-4" />
                          </div>
                        ) : (
                          <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                            <ArrowUpRight className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-white">
                            {tx.type} {tx.amountGiven} {tx.fromCurrency}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Rate: {tx.appliedRate} → Received {tx.amountReceived} {tx.toCurrency}
                          </div>
                        </div>
                      </div>
                      <span className="font-mono text-slate-400 text-[11px]">{tx.receiptNo}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
