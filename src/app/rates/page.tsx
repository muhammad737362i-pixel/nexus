'use client';

import { useState, useEffect } from 'react';
import {
  SlidersHorizontal,
  Sparkles,
  Users,
  Building2,
  Save,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Edit2,
  Percent,
} from 'lucide-react';

export default function RatesPage() {
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [parties, setParties] = useState<any[]>([]);
  const [customRatesList, setCustomRatesList] = useState<any[]>([]);

  const [selectedPartyId, setSelectedPartyId] = useState('');
  const [activeTab, setActiveTab] = useState<'BASE' | 'CUSTOM'>('CUSTOM');

  const [editingCurrencyId, setEditingCurrencyId] = useState<string | null>(null);
  const [editBuyRate, setEditBuyRate] = useState('');
  const [editSellRate, setEditSellRate] = useState('');

  // Party custom rate matrix form inputs
  const [targetCurrency, setTargetCurrency] = useState('EUR');
  const [customBuy, setCustomBuy] = useState('');
  const [customSell, setCustomSell] = useState('');
  const [marginPct, setMarginPct] = useState('0');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    try {
      const [currRes, partyRes, ratesRes] = await Promise.all([
        fetch('/api/currencies'),
        fetch('/api/parties'),
        fetch('/api/rates'),
      ]);

      const currJson = await currRes.json();
      const partyJson = await partyRes.json();
      const ratesJson = await ratesRes.json();

      if (currJson.success) setCurrencies(currJson.currencies);
      if (partyJson.success) {
        setParties(partyJson.parties);
        if (partyJson.parties.length > 0 && !selectedPartyId) {
          setSelectedPartyId(partyJson.parties[0].id);
        }
      }
      if (ratesJson.success) setCustomRatesList(ratesJson.customRates || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdateBaseRate = async (id: string) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/currencies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          defaultBuyRate: editBuyRate,
          defaultSellRate: editSellRate,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: 'Base rate successfully updated!' });
        setEditingCurrencyId(null);
        loadData();
      } else {
        setMessage({ type: 'error', text: json.error || 'Failed to update base rate' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error updating rate' });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePartyCustomRate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartyId || !targetCurrency) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyId: selectedPartyId,
          currencyCode: targetCurrency,
          customBuyRate: customBuy || null,
          customSellRate: customSell || null,
          marginPercent: marginPct || 0,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ type: 'success', text: 'Custom party rate saved successfully!' });
        setCustomBuy('');
        setCustomSell('');
        setMarginPct('0');
        loadData();
      } else {
        setMessage({ type: 'error', text: json.error || 'Failed to save custom rate' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Error saving custom rate' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  const selectedParty = parties.find((p) => p.id === selectedPartyId);
  const partyCustomRates = customRatesList.filter((r) => r.partyId === selectedPartyId);

  return (
    <div className="w-full space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            Exchange Rate Control Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage global base rates and assign specific custom rates per Customer and Banker.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900 p-1.5 rounded-xl border border-slate-800 self-start">
          <button
            onClick={() => setActiveTab('CUSTOM')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'CUSTOM'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Customer & Banker Custom Rates
          </button>
          <button
            onClick={() => setActiveTab('BASE')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'BASE'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" /> Default Base Rates
          </button>
        </div>
      </div>

      {/* Notification Toast Banner */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fadeIn ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          {message.text}
        </div>
      )}

      {/* TAB 1: PARTY CUSTOM RATES MATRIX (Primary Requirement) */}
      {activeTab === 'CUSTOM' && (
        <div className="space-y-6">
          {/* Party Selector Header */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Select Customer or Banker to Customize Rates *
              </label>
              <select
                value={selectedPartyId}
                onChange={(e) => setSelectedPartyId(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white font-bold text-sm min-w-[320px] focus:outline-none focus:border-indigo-500"
              >
                {parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.type === 'CUSTOMER' ? 'Customer' : 'Banker'}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedParty && (
              <div className="flex items-center gap-3 bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-xs">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  {selectedParty.type === 'CUSTOMER' ? <Users className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                </div>
                <div>
                  <div className="font-bold text-white">{selectedParty.name}</div>
                  <div className="text-slate-400 text-[11px]">
                    {selectedParty.phone || selectedParty.email || 'No contact specified'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Add / Edit Custom Rate Form */}
          <form onSubmit={handleSavePartyCustomRate} className="glass-card rounded-2xl p-6 border border-indigo-500/30 space-y-4">
            <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" /> Set Custom Rate Override for {selectedParty?.name}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Target Currency */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold">Target Currency</label>
                <select
                  value={targetCurrency}
                  onChange={(e) => setTargetCurrency(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-bold text-xs focus:outline-none focus:border-indigo-500"
                >
                  {currencies
                    .filter((c) => !c.isBase)
                    .map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} ({c.name})
                      </option>
                    ))}
                </select>
              </div>

              {/* Custom Buy Rate */}
              <div className="space-y-1.5">
                <label className="text-xs text-emerald-400 font-semibold">Custom Buy Rate (Optional)</label>
                <input
                  type="number"
                  step="any"
                  value={customBuy}
                  onChange={(e) => setCustomBuy(e.target.value)}
                  placeholder="e.g. 1.088"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-emerald-300 font-bold text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Custom Sell Rate */}
              <div className="space-y-1.5">
                <label className="text-xs text-amber-400 font-semibold">Custom Sell Rate (Optional)</label>
                <input
                  type="number"
                  step="any"
                  value={customSell}
                  onChange={(e) => setCustomSell(e.target.value)}
                  placeholder="e.g. 1.090"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-amber-300 font-bold text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Margin Offset % */}
              <div className="space-y-1.5">
                <label className="text-xs text-purple-300 font-semibold">Margin Offset % (+/- %)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    value={marginPct}
                    onChange={(e) => setMarginPct(e.target.value)}
                    placeholder="e.g. -0.2"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-purple-200 font-bold text-xs focus:outline-none focus:border-purple-500"
                  />
                  <Percent className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-3" />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Party Custom Rate
              </button>
            </div>
          </form>

          {/* Active Assigned Custom Rates Matrix Table */}
          <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white">
              Active Rate Matrix for <span className="text-indigo-400">{selectedParty?.name}</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Currency</th>
                    <th className="py-3 px-4">Default Buy Rate</th>
                    <th className="py-3 px-4">Assigned Custom Buy</th>
                    <th className="py-3 px-4">Default Sell Rate</th>
                    <th className="py-3 px-4">Assigned Custom Sell</th>
                    <th className="py-3 px-4">Margin %</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {currencies
                    .filter((c) => !c.isBase)
                    .map((c) => {
                      const assigned = partyCustomRates.find((r) => r.currencyCode === c.code);

                      return (
                        <tr key={c.code} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                              {c.code}
                            </span>
                            {c.name}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-400">{c.defaultBuyRate}</td>
                          <td className="py-3.5 px-4 font-bold text-emerald-400">
                            {assigned?.customBuyRate ? (
                              <span className="bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/30">
                                {assigned.customBuyRate}
                              </span>
                            ) : (
                              <span className="text-slate-600 font-normal">Default ({c.defaultBuyRate})</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-400">{c.defaultSellRate}</td>
                          <td className="py-3.5 px-4 font-bold text-amber-400">
                            {assigned?.customSellRate ? (
                              <span className="bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30">
                                {assigned.customSellRate}
                              </span>
                            ) : (
                              <span className="text-slate-600 font-normal">Default ({c.defaultSellRate})</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-purple-300">
                            {assigned?.marginPercent ? `${assigned.marginPercent}%` : '0%'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {assigned ? (
                              <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                Custom Rate Active
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500">Global Standard</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GLOBAL BASE RATES TABLE */}
      {activeTab === 'BASE' && (
        <div className="glass-card rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Global Default Exchange Rates (USD Base)
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Currency Code</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Default Buy Rate</th>
                  <th className="py-3 px-4">Default Sell Rate</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {currencies.map((c) => {
                  const isEditing = editingCurrencyId === c.id;

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-bold text-white">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                          {c.code}
                        </span>
                        {c.isBase && (
                          <span className="ml-2 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400">
                            Base Currency
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-medium">{c.name}</td>
                      <td className="py-3.5 px-4 font-bold text-emerald-400">
                        {isEditing ? (
                          <input
                            type="number"
                            step="any"
                            value={editBuyRate}
                            onChange={(e) => setEditBuyRate(e.target.value)}
                            className="bg-slate-900 border border-emerald-500 px-2 py-1 rounded text-emerald-300 font-mono w-28"
                          />
                        ) : (
                          c.defaultBuyRate
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-amber-400">
                        {isEditing ? (
                          <input
                            type="number"
                            step="any"
                            value={editSellRate}
                            onChange={(e) => setEditSellRate(e.target.value)}
                            className="bg-slate-900 border border-amber-500 px-2 py-1 rounded text-amber-300 font-mono w-28"
                          />
                        ) : (
                          c.defaultSellRate
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {!c.isBase && (
                          isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleUpdateBaseRate(c.id)}
                                disabled={saving}
                                className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-[11px] font-bold"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingCurrencyId(null)}
                                className="px-3 py-1 bg-slate-800 text-slate-400 rounded-lg text-[11px]"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingCurrencyId(c.id);
                                setEditBuyRate(c.defaultBuyRate.toString());
                                setEditSellRate(c.defaultSellRate.toString());
                              }}
                              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-[11px] font-semibold flex items-center gap-1 ml-auto"
                            >
                              <Edit2 className="w-3 h-3" /> Edit Base Rate
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
