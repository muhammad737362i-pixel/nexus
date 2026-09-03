import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { processBuyTransaction, processSellTransaction } from '@/lib/exchange';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const partyId = searchParams.get('partyId');
    const partyType = searchParams.get('partyType');
    const paymentMethod = searchParams.get('paymentMethod');
    const currency = searchParams.get('currency');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const search = searchParams.get('search');

    const where: any = {};

    if (type && type !== 'ALL') where.type = type;
    if (partyId && partyId !== 'ALL') where.partyId = partyId;
    if (paymentMethod && paymentMethod !== 'ALL') where.paymentMethod = paymentMethod;

    if (partyType && partyType !== 'ALL') {
      where.party = { type: partyType };
    }

    if (currency && currency !== 'ALL') {
      where.OR = [
        { fromCurrency: currency },
        { toCurrency: currency },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    if (search) {
      const searchCondition = [
        { receiptNo: { contains: search } },
        { notes: { contains: search } },
        { party: { name: { contains: search } } },
      ];
      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: searchCondition },
        ];
        delete where.OR;
      } else {
        where.OR = searchCondition;
      }
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        party: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute summary metrics for the filtered result set
    const totalCount = transactions.length;
    let totalBuyVolume = 0;
    let totalSellVolume = 0;
    let totalProfit = 0;

    for (const tx of transactions) {
      totalProfit += tx.totalProfit || 0;
      if (tx.type === 'BUY') {
        totalBuyVolume += tx.amountGiven || 0;
      } else if (tx.type === 'SELL') {
        totalSellVolume += tx.amountGiven || 0;
      }
    }

    return NextResponse.json({
      success: true,
      transactions,
      metrics: {
        totalCount,
        totalBuyVolume: Number(totalBuyVolume.toFixed(2)),
        totalSellVolume: Number(totalSellVolume.toFixed(2)),
        totalProfit: Number(totalProfit.toFixed(2)),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, partyId, fromCurrency, toCurrency, amountGiven, appliedRate, fee, paymentMethod, notes } = body;

    if (!type || !partyId || !fromCurrency || !toCurrency || !amountGiven || !appliedRate) {
      return NextResponse.json(
        { success: false, error: 'Missing required transaction fields' },
        { status: 400 }
      );
    }

    let transaction;
    if (type === 'BUY') {
      transaction = await processBuyTransaction({
        partyId,
        fromCurrency,
        toCurrency,
        amountGiven: parseFloat(amountGiven),
        appliedRate: parseFloat(appliedRate),
        fee: fee ? parseFloat(fee) : 0,
        paymentMethod: paymentMethod || 'CASH',
        notes,
      });
    } else if (type === 'SELL') {
      transaction = await processSellTransaction({
        partyId,
        fromCurrency,
        toCurrency,
        amountGiven: parseFloat(amountGiven),
        appliedRate: parseFloat(appliedRate),
        fee: fee ? parseFloat(fee) : 0,
        paymentMethod: paymentMethod || 'CASH',
        notes,
      });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid transaction type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, transaction });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
