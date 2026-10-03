'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { InactivityTracker } from '@/components/InactivityTracker';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  if (isLoginPage) {
    return <main className="w-full min-h-screen">{children}</main>;
  }

  return (
    <>
      <InactivityTracker />
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-[calc(100vh-53px)] lg:h-screen overflow-hidden">
        <main className="flex-1 px-3.5 py-4 sm:px-6 sm:py-6 lg:px-8 overflow-y-auto w-full max-w-full">{children}</main>
      </div>
    </>
  );
}
