import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/Sidebar';
import { Navbar } from '@/components/Navbar';

export const metadata: Metadata = {
  title: 'Nexus - Personal Exchange Management Software',
  description: 'Fast, secure personal currency exchange software with customer/banker custom rates',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 min-h-screen flex antialiased">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <main className="flex-1 px-8 py-6 overflow-y-auto w-full">{children}</main>
        </div>
      </body>
    </html>
  );
}
