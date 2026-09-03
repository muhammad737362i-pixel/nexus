'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowUpRight,
  ArrowDownLeft,
  SlidersHorizontal,
  Users,
  Building2,
  Receipt,
  Sparkles,
  Server,
  Wallet,
  Banknote,
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Wallet & Capital', href: '/wallet', icon: Wallet, badge: 'Main Bal' },
  { name: 'Payments Hub', href: '/payments', icon: Banknote },
  { name: 'Selling', href: '/selling', icon: ArrowUpRight, badge: 'Express' },
  { name: 'Buying', href: '/buying', icon: ArrowDownLeft, badge: 'Express' },
  { name: 'Rates Setup', href: '/rates', icon: SlidersHorizontal, highlight: true },
  { name: 'Customers', href: '/customers', icon: Users },
  { name: 'Bankers', href: '/bankers', icon: Building2 },
  { name: 'Transactions History', href: '/transactions', icon: Receipt },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  return (
    <aside className="w-64 shrink-0 bg-slate-900/90 border-r border-slate-800/80 flex flex-col justify-between h-screen sticky top-0 z-30 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-white tracking-wide flex items-center gap-1.5">
              NEXUS
            </h1>
            <p className="text-xs text-slate-400">Personal Exchange Suite</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1.5">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                    : item.highlight
                    ? 'text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 border border-amber-500/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-white' : item.highlight ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Theme Toggle & VPS Info Footer */}
      <div className="p-3 space-y-2">
        <button
          onClick={toggleTheme}
          type="button"
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/80 transition cursor-pointer shadow-sm"
        >
          <div className="flex items-center gap-2">
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
            <span>{theme === 'dark' ? 'Simple (Light) Mode' : 'Dark Mode'}</span>
          </div>
          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {theme === 'dark' ? 'White UI' : 'Dark UI'}
          </span>
        </button>

        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1.5 font-medium text-[11px]">
              <Server className="w-3.5 h-3.5 text-emerald-400" /> Hostinger VPS
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" /> Online
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
