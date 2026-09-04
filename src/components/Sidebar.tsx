'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  UserCog,
  LogOut,
  Shield,
  UserCheck,
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
  { name: 'User Control', href: '/users', icon: UserCog, badge: 'Security' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  useEffect(() => {
    if (pathname === '/login') return;
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        if (data.success) {
          setCurrentUser(data.user);
        }
      } catch (e) {
        console.error(e);
      }
    }
    loadUser();
  }, [pathname]);

  if (pathname === '/login') {
    return null;
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

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
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-220px)]">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl font-medium text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                    : item.highlight
                    ? 'text-amber-300 hover:bg-amber-500/10 hover:text-amber-200 border border-amber-500/20'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-white' : item.highlight ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      item.badge === 'Security'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Controls: User Info, Theme Toggle & Logout */}
      <div className="p-3 space-y-2 border-t border-slate-800/80 bg-slate-950/40">
        {/* Logged in User Pill */}
        {currentUser && (
          <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser.username?.slice(0, 2).toUpperCase()}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                  <Shield className="w-2.5 h-2.5 text-amber-400" /> {currentUser.role}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}

        <button
          onClick={toggleTheme}
          type="button"
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-700/80 text-slate-300 text-xs font-medium border border-slate-700/60 transition cursor-pointer"
        >
          <div className="flex items-center gap-2">
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span>{theme === 'dark' ? 'Simple Mode' : 'Dark Mode'}</span>
          </div>
          <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            {theme === 'dark' ? 'White UI' : 'Dark UI'}
          </span>
        </button>

        <div className="px-2 py-1 text-[10px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1">
            <Server className="w-3 h-3 text-emerald-400" /> VPS Online
          </span>
          <span className="font-mono text-slate-600">v1.2.0</span>
        </div>
      </div>
    </aside>
  );
}
