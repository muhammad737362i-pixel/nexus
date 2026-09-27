'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes in milliseconds

export function InactivityTracker() {
  const pathname = usePathname();
  const router = useRouter();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    // Do not run inactivity tracking on the login page
    if (pathname === '/login') {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const performLogout = async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login?reason=inactivity');
        router.refresh();
      } catch (err) {
        console.error('Auto-logout error:', err);
        window.location.href = '/login?reason=inactivity';
      }
    };

    const resetTimer = () => {
      const now = Date.now();
      // Throttle resets to avoid high CPU load on mouse movements
      if (now - lastActivityRef.current < 1000 && timerRef.current) {
        return;
      }
      lastActivityRef.current = now;

      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(performLogout, INACTIVITY_TIMEOUT_MS);
    };

    // Initialize timer
    resetTimer();

    // Event listeners for user activity
    const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    const handleUserActivity = () => {
      resetTimer();
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [pathname, router]);

  return null;
}
