import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { parseISTDate, getISTDayStart } from '@/lib/dateUtils';

async function generatePaymentReceiptNo(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PAY-${year}-`;

  const lastPay = await prisma.payment.findFirst({
    where: { receiptNo: { startsWith: prefix } },
    orderBy: { createdAt: 'desc' },
    select: { receiptNo: true },
  });

  let nextNum = 1001;
  if (lastPay?.receiptNo) {
    const parts = lastPay.receiptNo.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  let candidate = `${prefix}${nextNum}`;
  let exists = await prisma.payment.findUnique({ where: { receiptNo: candidate } });
  while (exists) {
    nextNum++;
    candidate = `${prefix}${nextNum}`;
    exists = await prisma.payment.findUnique({ where: { receiptNo: candidate } });
  }

  return candidate;
}

export async function GET() {
  try {
    const todayStart = getISTDayStart();

    const [payments, parties, currencies, transactions] = await Promise.all([
      prisma.payment.findMany({
        take: 500,
        orderBy: { createdAt: 'desc' },
        include: {
          party: true,
        },
      }),
      prisma.party.findMany({
        orderBy: { name: 'asc' },
      }),
      prisma.currency.findMany({
        orderBy: { code: 'asc' },
      }),
      prisma.transaction.findMany({
        take: 1000,
        orderBy: { createdAt: 'desc' },
        include: {
          party: true,
        },
      }),
    ]);

    let todayReceived = 0;
    let todaySent = 0;
    let totalReceived = 0;
    let totalSent = 0;

    payments.forEach((p: any) => {
      const isToday = new Date(p.createdAt) >= todayStart;
      if (p.type === 'RECEIVED') {
        totalReceived += p.amount;
        if (isToday) todayReceived += p.amount;
      } else if (p.type === 'SENT') {
        totalSent += p.amount;
        if (isToday) todaySent += p.amount;
      }
    });

    // Compute Party Financial Summaries (Buying Data, Payments Paid, Pending Balances)
    const partyStats: Record<string, any> = {};
    parties.forEach((p: any) => {
      partyStats[p.id] = {
        totalBuyVolumeUSDT: 0,
        totalSellVolumeUSDT: 0,
        totalBuyBilledINR: 0,
        totalSellBilledINR: 0,
        totalPaidSent: 0,
        totalPaidReceived: 0,
        pendingBalance: 0,
        tradeCount: 0,
        paymentCount: 0,
      };
    });

    transactions.forEach((tx: any) => {
      if (!partyStats[tx.partyId]) return;
      partyStats[tx.partyId].tradeCount += 1;
      if (tx.type === 'BUY') {
        if (tx.toCurrency === 'USDT' || tx.toCurrency === 'USD') {
          partyStats[tx.partyId].totalBuyVolumeUSDT += tx.amountReceived;
        }
        partyStats[tx.partyId].totalBuyBilledINR += tx.amountGiven;
      } else if (tx.type === 'SELL') {
        if (tx.fromCurrency === 'USDT' || tx.fromCurrency === 'USD') {
          partyStats[tx.partyId].totalSellVolumeUSDT += tx.amountGiven;
        }
        partyStats[tx.partyId].totalSellBilledINR += tx.amountReceived;
      }
    });

    payments.forEach((p: any) => {
      if (!partyStats[p.partyId]) return;
      partyStats[p.partyId].paymentCount += 1;
      if (p.type === 'SENT') {
        partyStats[p.partyId].totalPaidSent += p.amount;
      } else if (p.type === 'RECEIVED') {
        partyStats[p.partyId].totalPaidReceived += p.amount;
      }
    });

    let totalPendingBankerOwed = 0;
    let totalPendingCustomerReceivable = 0;

    parties.forEach((p: any) => {
      const stats = partyStats[p.id];
      if (!stats) return;
      if (p.type === 'BANKER') {
        stats.pendingBalance = Number((stats.totalBuyBilledINR - stats.totalPaidSent).toFixed(2));
        if (stats.pendingBalance > 0) totalPendingBankerOwed += stats.pendingBalance;
      } else {
        stats.pendingBalance = Number((stats.totalSellBilledINR - stats.totalPaidReceived).toFixed(2));
        if (stats.pendingBalance > 0) totalPendingCustomerReceivable += stats.pendingBalance;
      }
    });

    return NextResponse.json({
      success: true,
      summary: {
        todayReceived,
        todaySent,
        netToday: todayReceived - todaySent,
        totalReceived,
        totalSent,
        totalPendingBankerOwed,
        totalPendingCustomerReceivable,
      },
      payments,
      parties,
      currencies,
      transactions,
      partyStats,
    });
  } catch (error: any) {
    console.error('Payments GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      type, // "RECEIVED" or "SENT"
      partyId,
      amount,
      currencyCode,
      paymentMethod = 'CASH',
      referenceNo,
      notes,
      createdAt,
    } = body;

    if (!type || !partyId || !amount || !currencyCode || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Payment type, party, currency, and positive amount are required' },
        { status: 400 }
      );
    }

    const party = await prisma.party.findUnique({ where: { id: partyId } });
    if (!party) {
      return NextResponse.json({ success: false, error: 'Selected party not found' }, { status: 404 });
    }

    const receiptNo = await generatePaymentReceiptNo();
    const numericAmount = Number(amount);
    const payDate = parseISTDate(createdAt);

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Create Payment Record
      const payment = await tx.payment.create({
        data: {
          receiptNo,
          type,
          partyId,
          amount: numericAmount,
          currencyCode,
          paymentMethod,
          referenceNo: referenceNo || null,
          status: 'COMPLETED',
          notes: notes || null,
          ...(payDate ? { createdAt: payDate } : {}),
        },
      });

      // 2. Sync Currency Inventory
      let inventory = await tx.currencyInventory.findUnique({
        where: { currencyCode },
      });

      if (!inventory) {
        inventory = await tx.currencyInventory.create({
          data: {
            currencyCode,
            cashBalance: 0,
            bankBalance: 0,
          },
        });
      }

      let newCash = inventory.cashBalance;
      let newBank = inventory.bankBalance;

      const isBankChannel = ['BANK', 'ONLINE', 'CHEQUE'].includes(paymentMethod.toUpperCase());

      if (type === 'RECEIVED') {
        if (isBankChannel) {
          newBank += numericAmount;
        } else {
          newCash += numericAmount;
        }
      } else if (type === 'SENT') {
        if (isBankChannel) {
          newBank = Math.max(0, newBank - numericAmount);
        } else {
          newCash = Math.max(0, newCash - numericAmount);
        }
      }

      await tx.currencyInventory.update({
        where: { currencyCode },
        data: {
          cashBalance: Number(newCash.toFixed(2)),
          bankBalance: Number(newBank.toFixed(2)),
        },
      });

      // 3. Create Party Ledger Entry
      const ledgerType = type === 'RECEIVED' ? 'CREDIT' : 'DEBIT';
      const ledgerNotes =
        notes ||
        (type === 'RECEIVED'
          ? `Payment received from ${party.name} (${receiptNo})`
          : `Payment sent to ${party.name} (${receiptNo})`);

      await tx.ledgerEntry.create({
        data: {
          partyId,
          currencyCode,
          type: ledgerType,
          amount: numericAmount,
          balanceAfter: numericAmount,
          notes: ledgerNotes,
          ...(payDate ? { createdAt: payDate } : {}),
        },
      });

      return payment;
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Payments POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Payment ID is required' }, { status: 400 });
    }

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) {
      return NextResponse.json({ success: false, error: 'Payment record not found' }, { status: 404 });
    }

    await prisma.$transaction(async (tx: any) => {
      // Revert Inventory
      const isBankChannel = ['BANK', 'ONLINE', 'CHEQUE'].includes((payment.paymentMethod || '').toUpperCase());
      const inventory = await tx.currencyInventory.findUnique({ where: { currencyCode: payment.currencyCode } });

      if (inventory) {
        let newCash = inventory.cashBalance;
        let newBank = inventory.bankBalance;

        if (payment.type === 'RECEIVED') {
          if (isBankChannel) newBank = Math.max(0, newBank - payment.amount);
          else newCash = Math.max(0, newCash - payment.amount);
        } else if (payment.type === 'SENT') {
          if (isBankChannel) newBank += payment.amount;
          else newCash += payment.amount;
        }

        await tx.currencyInventory.update({
          where: { currencyCode: payment.currencyCode },
          data: {
            cashBalance: Number(newCash.toFixed(2)),
            bankBalance: Number(newBank.toFixed(2)),
          },
        });
      }

      await tx.payment.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: 'Payment record deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, type, partyId, amount, currencyCode, paymentMethod, referenceNo, notes, createdAt } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Payment ID is required' }, { status: 400 });
    }

    const oldPayment = await prisma.payment.findUnique({ where: { id } });
    if (!oldPayment) {
      return NextResponse.json({ success: false, error: 'Payment record not found' }, { status: 404 });
    }

    const newType = type || oldPayment.type;
    const newPartyId = partyId || oldPayment.partyId;
    const newAmount = amount !== undefined && amount !== null ? parseFloat(amount) : oldPayment.amount;
    const newCurrency = currencyCode || oldPayment.currencyCode;
    const newMethod = paymentMethod || oldPayment.paymentMethod;

    if (isNaN(newAmount) || newAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Valid positive payment amount required' }, { status: 400 });
    }

    const updatedPayment = await prisma.$transaction(async (tx: any) => {
      // 1. Revert Old Inventory Impact
      const oldIsBank = ['BANK', 'ONLINE', 'CHEQUE'].includes((oldPayment.paymentMethod || '').toUpperCase());
      const oldInv = await tx.currencyInventory.findUnique({ where: { currencyCode: oldPayment.currencyCode } });

      if (oldInv) {
        let revCash = oldInv.cashBalance;
        let revBank = oldInv.bankBalance;

        if (oldPayment.type === 'RECEIVED') {
          if (oldIsBank) revBank = Math.max(0, revBank - oldPayment.amount);
          else revCash = Math.max(0, revCash - oldPayment.amount);
        } else if (oldPayment.type === 'SENT') {
          if (oldIsBank) revBank += oldPayment.amount;
          else revCash += oldPayment.amount;
        }

        await tx.currencyInventory.update({
          where: { currencyCode: oldPayment.currencyCode },
          data: {
            cashBalance: Number(revCash.toFixed(2)),
            bankBalance: Number(revBank.toFixed(2)),
          },
        });
      }

      // 2. Apply New Inventory Impact
      let newInv = await tx.currencyInventory.findUnique({ where: { currencyCode: newCurrency } });
      if (!newInv) {
        newInv = await tx.currencyInventory.create({
          data: { currencyCode: newCurrency, cashBalance: 0, bankBalance: 0 },
        });
      }

      let applyCash = newInv.cashBalance;
      let applyBank = newInv.bankBalance;
      const newIsBank = ['BANK', 'ONLINE', 'CHEQUE'].includes((newMethod || '').toUpperCase());

      if (newType === 'RECEIVED') {
        if (newIsBank) applyBank += newAmount;
        else applyCash += newAmount;
      } else if (newType === 'SENT') {
        if (newIsBank) applyBank = Math.max(0, applyBank - newAmount);
        else applyCash = Math.max(0, applyCash - newAmount);
      }

      await tx.currencyInventory.update({
        where: { currencyCode: newCurrency },
        data: {
          cashBalance: Number(applyCash.toFixed(2)),
          bankBalance: Number(applyBank.toFixed(2)),
        },
      });

      const validCreatedAt = parseISTDate(createdAt);

      // 3. Update Record
      return await tx.payment.update({
        where: { id },
        data: {
          type: newType,
          partyId: newPartyId,
          amount: newAmount,
          currencyCode: newCurrency,
          paymentMethod: newMethod,
          referenceNo: referenceNo !== undefined ? referenceNo : oldPayment.referenceNo,
          notes: notes !== undefined ? notes : oldPayment.notes,
          ...(validCreatedAt ? { createdAt: validCreatedAt } : {}),
        },
        include: { party: true },
      });
    });

    return NextResponse.json({ success: true, payment: updatedPayment });
  } catch (error: any) {
    console.error('Payments PUT Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
