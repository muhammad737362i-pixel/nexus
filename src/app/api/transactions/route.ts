import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { processBuyTransaction, processSellTransaction } from '@/lib/exchange';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const partyId = searchParams.get('partyId');
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const where: any = {};
    if (type) where.type = type;
    if (partyId) where.partyId = partyId;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { receiptNo: { contains: search } },
        { notes: { contains: search } },
        { party: { name: { contains: search } } },
      ];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        party: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, transactions });
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
