import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { processBuyTransaction, processSellTransaction, calculateTradeProfit } from '@/lib/exchange';
import { parseISTDate, getISTDayStart, getISTDayEnd } from '@/lib/dateUtils';

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
      if (startDate) {
        if (startDate.length <= 10) {
          where.createdAt.gte = getISTDayStart(startDate);
        } else {
          where.createdAt.gte = parseISTDate(startDate);
        }
      }
      if (endDate) {
        if (endDate.length <= 10) {
          where.createdAt.lte = getISTDayEnd(endDate);
        } else {
          where.createdAt.lte = parseISTDate(endDate);
        }
      }
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
      orderBy: [{ createdAt: 'desc' }, { receiptNo: 'desc' }, { id: 'desc' }],
    });

    const inrCurrency = await prisma.currency.findUnique({ where: { code: 'INR' } });
    const marketBuyRate = inrCurrency?.defaultBuyRate || 100;
    const marketSellRate = inrCurrency?.defaultSellRate || 100;

    // Compute summary metrics for the filtered result set
    const totalCount = transactions.length;
    let totalBuyVolumeINR = 0;
    let totalBuyVolumeUSDT = 0;
    let totalSellVolumeINR = 0;
    let totalSellVolumeUSDT = 0;
    let totalFeesUSDT = 0;

    const sanitizedTransactions = transactions.map((tx: any) => {
      const usdtAmt = tx.amountReceived || (tx.appliedRate > 0 ? tx.amountGiven / tx.appliedRate : 0);
      const fee = tx.fee || 0;
      totalFeesUSDT += fee;

      if (tx.type === 'BUY') {
        totalBuyVolumeINR += tx.amountGiven || 0;
        totalBuyVolumeUSDT += usdtAmt;
      } else if (tx.type === 'SELL') {
        totalSellVolumeINR += tx.amountGiven || 0;
        totalSellVolumeUSDT += usdtAmt;
      }

      const cleanProfit = fee;

      return {
        ...tx,
        totalProfit: cleanProfit,
      };
    });

    const netProfitUSDT = (totalBuyVolumeUSDT > 0 && totalSellVolumeUSDT > 0)
      ? Number((totalBuyVolumeUSDT - totalSellVolumeUSDT + totalFeesUSDT).toFixed(2))
      : Number(totalFeesUSDT.toFixed(2));

    return NextResponse.json({
      success: true,
      transactions: sanitizedTransactions,
      metrics: {
        totalCount,
        totalBuyVolume: Number(totalBuyVolumeINR.toFixed(2)),
        totalBuyVolumeUSDT: Number(totalBuyVolumeUSDT.toFixed(2)),
        totalSellVolume: Number(totalSellVolumeINR.toFixed(2)),
        totalSellVolumeUSDT: Number(totalSellVolumeUSDT.toFixed(2)),
        totalProfit: netProfitUSDT,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, partyId, fromCurrency, toCurrency, amountGiven, appliedRate, fee, paymentMethod, notes, createdAt } = body;

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
        createdAt,
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
        createdAt,
      });
    } else {
      return NextResponse.json({ success: false, error: 'Invalid transaction type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, transaction });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 });
    }

    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    await prisma.$transaction(async (prismaTx: any) => {
      const isBank = tx.paymentMethod === 'BANK';
      const field = isBank ? 'bankBalance' : 'cashBalance';

      if (tx.type === 'BUY') {
        // Buy USDT: Originally decreased INR and increased USDT.
        // Revert: Add INR back and subtract USDT back.
        const invINR = await prismaTx.currencyInventory.findUnique({ where: { currencyCode: tx.fromCurrency } });
        if (invINR) {
          await prismaTx.currencyInventory.update({
            where: { currencyCode: tx.fromCurrency },
            data: { [field]: Number((invINR[field] + tx.amountGiven).toFixed(2)) },
          });
        }
        const invUSDT = await prismaTx.currencyInventory.findUnique({ where: { currencyCode: tx.toCurrency } });
        if (invUSDT) {
          await prismaTx.currencyInventory.update({
            where: { currencyCode: tx.toCurrency },
            data: { [field]: Number(Math.max(0, invUSDT[field] - tx.amountReceived).toFixed(2)) },
          });
        }
      } else if (tx.type === 'SELL') {
        // Sell USDT: Originally increased INR and decreased USDT.
        // Revert: Subtract INR back and add USDT back.
        const invINR = await prismaTx.currencyInventory.findUnique({ where: { currencyCode: tx.fromCurrency } });
        if (invINR) {
          await prismaTx.currencyInventory.update({
            where: { currencyCode: tx.fromCurrency },
            data: { [field]: Number(Math.max(0, invINR[field] - tx.amountGiven).toFixed(2)) },
          });
        }
        const invUSDT = await prismaTx.currencyInventory.findUnique({ where: { currencyCode: tx.toCurrency } });
        if (invUSDT) {
          await prismaTx.currencyInventory.update({
            where: { currencyCode: tx.toCurrency },
            data: { [field]: Number((invUSDT[field] + tx.amountReceived).toFixed(2)) },
          });
        }
      }

      // 2. Delete Ledger Entries
      await prismaTx.ledgerEntry.deleteMany({ where: { transactionId: id } });

      // 3. Delete Transaction
      await prismaTx.transaction.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: 'Transaction deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, partyId, type, amountGiven, appliedRate, fee, paymentMethod, notes, createdAt } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 });
    }

    const tx = await prisma.transaction.findUnique({ where: { id } });
    if (!tx) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    const numAmount = parseFloat(amountGiven);
    const numRate = parseFloat(appliedRate);
    const numFee = fee !== undefined && fee !== null ? parseFloat(fee) : tx.fee;

    if (isNaN(numAmount) || numAmount <= 0 || isNaN(numRate) || numRate <= 0) {
      return NextResponse.json({ success: false, error: 'Valid amount given and rate are required' }, { status: 400 });
    }

    const newAmountReceived = Number((numAmount / numRate).toFixed(2));
    const targetCurrency = await prisma.currency.findUnique({ where: { code: 'INR' } });
    const marketBuyRate = targetCurrency?.defaultBuyRate || 100;
    const marketSellRate = targetCurrency?.defaultSellRate || 100;
    const totalProfit = calculateTradeProfit(
      (type || tx.type) as 'BUY' | 'SELL',
      numAmount,
      numRate,
      numFee,
      marketBuyRate,
      marketSellRate
    );

    const validCreatedAt = parseISTDate(createdAt);

    const updatedTx = await prisma.transaction.update({
      where: { id },
      data: {
        partyId: partyId || tx.partyId,
        type: type || tx.type,
        amountGiven: numAmount,
        appliedRate: numRate,
        amountReceived: newAmountReceived,
        fee: numFee,
        totalProfit,
        paymentMethod: paymentMethod || tx.paymentMethod,
        notes: notes !== undefined ? notes : tx.notes,
        ...(validCreatedAt ? { createdAt: validCreatedAt } : {}),
      },
      include: {
        party: true,
      },
    });

    if (validCreatedAt) {
      await prisma.ledgerEntry.updateMany({
        where: { transactionId: id },
        data: { createdAt: validCreatedAt },
      });
    }

    return NextResponse.json({ success: true, transaction: updatedTx });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
