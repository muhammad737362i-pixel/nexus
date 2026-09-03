import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const txWhere: any = {};
    if (startDate || endDate) {
      txWhere.createdAt = {};
      if (startDate) txWhere.createdAt.gte = new Date(startDate);
      if (endDate) txWhere.createdAt.lte = new Date(endDate);
    } else {
      // Default: Today's transactions
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      txWhere.createdAt = { gte: todayStart };
    }

    // 1. Transactions in Date & Time Range
    const periodTransactions = await prisma.transaction.findMany({
      where: txWhere,
      include: { party: true },
      orderBy: { createdAt: 'desc' },
    });

    let buyVolume = 0;
    let sellVolume = 0;
    let estProfit = 0;

    periodTransactions.forEach((tx: any) => {
      if (tx.type === 'BUY') {
        buyVolume += tx.amountGiven || 0;
      } else if (tx.type === 'SELL') {
        sellVolume += tx.amountGiven || 0;
      }
      estProfit += tx.totalProfit || 0;
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

    // 5. Recent 10 Transactions in range
    const recentTransactions = periodTransactions.slice(0, 10);

    return NextResponse.json({
      success: true,
      metrics: {
        todayBuyVolume: Number(buyVolume.toFixed(2)),
        todaySellVolume: Number(sellVolume.toFixed(2)),
        todayEstProfit: Number(estProfit.toFixed(2)),
        customerCount,
        bankerCount,
        totalTxCount: periodTransactions.length,
      },
      inventory,
      currencies,
      recentTransactions,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
