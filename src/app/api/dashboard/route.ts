import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // 1. Transactions Today
    const todayTransactions = await prisma.transaction.findMany({
      where: {
        createdAt: { gte: todayStart },
      },
      include: { party: true },
    });

    let todayBuyVolume = 0;
    let todaySellVolume = 0;
    let todayEstProfit = 0;

    todayTransactions.forEach((tx: any) => {
      if (tx.type === 'BUY') {
        todayBuyVolume += tx.amountGiven;
      } else if (tx.type === 'SELL') {
        todaySellVolume += tx.amountGiven;
      }
      todayEstProfit += tx.totalProfit;
    });

    // 2. Total Parties Count
    const customerCount = await prisma.party.count({ where: { type: 'CUSTOMER' } });
    const bankerCount = await prisma.party.count({ where: { type: 'BANKER' } });

    // 3. Currency Inventory Balances
    const inventory = await prisma.currencyInventory.findMany({
      orderBy: { currencyCode: 'asc' },
    });

    // 4. Base Currencies Rates Ticker
    const currencies = await prisma.currency.findMany({
      orderBy: { code: 'asc' },
    });

    // 5. Recent 10 Transactions
    const recentTransactions = await prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: { party: true },
    });

    return NextResponse.json({
      success: true,
      metrics: {
        todayBuyVolume,
        todaySellVolume,
        todayEstProfit,
        customerCount,
        bankerCount,
        totalTxCount: todayTransactions.length,
      },
      inventory,
      currencies,
      recentTransactions,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
