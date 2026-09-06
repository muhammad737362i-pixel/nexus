import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { calculateTradeProfit } from '@/lib/exchange';

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

    const inrCurrency = await prisma.currency.findUnique({ where: { code: 'INR' } });
    const marketBuyRate = inrCurrency?.defaultBuyRate || 100;
    const marketSellRate = inrCurrency?.defaultSellRate || 100;

    let buyVolumeINR = 0;
    let buyVolumeUSDT = 0;
    let sellVolumeINR = 0;
    let sellVolumeUSDT = 0;
    let estProfitUSDT = 0;

    const sanitizedTransactions = periodTransactions.map((tx: any) => {
      const usdtAmt = tx.amountReceived || (tx.appliedRate > 0 ? tx.amountGiven / tx.appliedRate : 0);

      if (tx.type === 'BUY') {
        buyVolumeINR += tx.amountGiven || 0;
        buyVolumeUSDT += usdtAmt;
      } else if (tx.type === 'SELL') {
        sellVolumeINR += tx.amountGiven || 0;
        sellVolumeUSDT += usdtAmt;
      }

      // Calculate clean profit in USDT ($)
      const cleanProfit = calculateTradeProfit(
        tx.type as 'BUY' | 'SELL',
        tx.amountGiven,
        tx.appliedRate,
        tx.fee || 0,
        marketBuyRate,
        marketSellRate
      );

      estProfitUSDT += cleanProfit;

      return {
        ...tx,
        totalProfit: cleanProfit,
      };
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

    // 5. Recent 10 Transactions in range (with sanitized totalProfit)
    const recentTransactions = sanitizedTransactions.slice(0, 10);

    return NextResponse.json({
      success: true,
      metrics: {
        todayBuyVolume: Number(buyVolumeINR.toFixed(2)),
        todayBuyVolumeINR: Number(buyVolumeINR.toFixed(2)),
        todayBuyVolumeUSDT: Number(buyVolumeUSDT.toFixed(2)),
        todaySellVolume: Number(sellVolumeINR.toFixed(2)),
        todaySellVolumeINR: Number(sellVolumeINR.toFixed(2)),
        todaySellVolumeUSDT: Number(sellVolumeUSDT.toFixed(2)),
        todayEstProfit: Number(estProfitUSDT.toFixed(2)),
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
