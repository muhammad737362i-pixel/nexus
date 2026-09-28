'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes in milliseconds
const LAST_ACTIVITY_KEY = 'nexus_last_activity_timestamp';

export function InactivityTracker() {
  const pathname = usePathname();
  const router = useRouter();
  const isLoggingOutRef = useRef(false);

  useEffect(() => {
    // Do not run inactivity tracking on the login page
    if (pathname === '/login') {
      return;
    }

    const performLogout = async () => {
      if (isLoggingOutRef.current) return;
      isLoggingOutRef.current = true;

      try {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(LAST_ACTIVITY_KEY);
          localStorage.removeItem(LAST_ACTIVITY_KEY + '_updated');
        }
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch (err) {
        console.error('Auto-logout error:', err);
      } finally {
        window.location.href = '/login?reason=inactivity';
      }
    };

    const getLastActivity = (): number => {
      if (typeof window === 'undefined') return Date.now();
      const saved = localStorage.getItem(LAST_ACTIVITY_KEY);
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      const now = Date.now();
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
      return now;
    };

    const checkInactivity = () => {
      const now = Date.now();
      const last = getLastActivity();
      if (now - last >= INACTIVITY_TIMEOUT_MS) {
        performLogout();
        return true;
      }
      return false;
    };

    const updateLastActivity = () => {
      const now = Date.now();
      const last = getLastActivity();

      // If 15+ minutes have already elapsed since last recorded activity, DO NOT reset! Logout immediately!
      if (now - last >= INACTIVITY_TIMEOUT_MS) {
        performLogout();
        return;
      }

      // Throttle updates to localStorage to at most once every 2 seconds
      const lastUpdatedStr = localStorage.getItem(LAST_ACTIVITY_KEY + '_updated');
      const lastUpdated = lastUpdatedStr ? parseInt(lastUpdatedStr, 10) : 0;
      if (now - lastUpdated > 2000) {
        localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
        localStorage.setItem(LAST_ACTIVITY_KEY + '_updated', String(now));
      }
    };

    // Initial check on mount
    checkInactivity();

    // Periodic 5-second interval check to ensure timeout fires even if tab is idling in background
    const interval = setInterval(checkInactivity, 5000);

    // Activity event listeners
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    const handleUserActivity = () => {
      updateLastActivity();
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Check inactivity immediately on window focus or tab visibility change
    const handleVisibilityOrFocus = () => {
      checkInactivity();
    };

    window.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('pageshow', handleVisibilityOrFocus);

    // Sync across multiple browser tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY && e.newValue) {
        checkInactivity();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(interval);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      window.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('pageshow', handleVisibilityOrFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [pathname, router]);

  return null;
}
