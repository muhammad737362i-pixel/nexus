import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

async function generatePaymentReceiptNo(): Promise<string> {
  const count = await prisma.payment.count();
  const nextNum = 1001 + count;
  const year = new Date().getFullYear();
  return `PAY-${year}-${nextNum}`;
}

export async function GET() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const payments = await prisma.payment.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        party: true,
      },
    });

    const parties = await prisma.party.findMany({
      orderBy: { name: 'asc' },
    });

    const currencies = await prisma.currency.findMany({
      orderBy: { code: 'asc' },
    });

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

    return NextResponse.json({
      success: true,
      summary: {
        todayReceived,
        todaySent,
        netToday: todayReceived - todaySent,
        totalReceived,
        totalSent,
      },
      payments,
      parties,
      currencies,
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
