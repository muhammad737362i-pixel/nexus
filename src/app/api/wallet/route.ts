import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const inventories = await prisma.currencyInventory.findMany({
      orderBy: { currencyCode: 'asc' },
    });

    const currencies = await prisma.currency.findMany({
      orderBy: { code: 'asc' },
    });

    const walletTransactions = await prisma.walletTransaction.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
    });

    // Compute Base Valuation (Main Balance in INR)
    const inrCurrency = currencies.find((c: any) => c.code === 'INR') || { defaultSellRate: 89.20 };
    const inrRate = inrCurrency.defaultSellRate || 89.20;
    
    let totalCashValuation = 0; // In INR
    let totalBankValuation = 0; // In INR

    inventories.forEach((inv: any) => {
      if (inv.currencyCode === 'INR') {
        totalCashValuation += inv.cashBalance;
        totalBankValuation += inv.bankBalance;
      } else if (inv.currencyCode === 'USDT' || inv.currencyCode === 'USD') {
        totalCashValuation += inv.cashBalance * inrRate;
        totalBankValuation += inv.bankBalance * inrRate;
      } else {
        totalCashValuation += inv.cashBalance;
        totalBankValuation += inv.bankBalance;
      }
    });

    const totalMainBalance = totalCashValuation + totalBankValuation;

    return NextResponse.json({
      success: true,
      summary: {
        totalMainBalance: Number(totalMainBalance.toFixed(2)),
        totalCashValuation: Number(totalCashValuation.toFixed(2)),
        totalBankValuation: Number(totalBankValuation.toFixed(2)),
        baseCurrencyCode: 'INR',
      },
      inventories,
      currencies,
      transactions: walletTransactions,
    });
  } catch (error: any) {
    console.error('Wallet GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, currencyCode, amount, paymentMethod = 'CASH', sourceOrDestination, notes } = body;

    if (!type || !currencyCode || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid transaction type, currency, and amount are required' },
        { status: 400 }
      );
    }

    const numericAmount = Number(amount);

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Fetch or initialize CurrencyInventory
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

      // 2. Adjust inventory balances based on action type
      if (type === 'CAPITAL_DEPOSIT') {
        if (paymentMethod === 'BANK') {
          newBank += numericAmount;
        } else {
          newCash += numericAmount;
        }
      } else if (type === 'CAPITAL_WITHDRAWAL') {
        if (paymentMethod === 'BANK') {
          newBank = Math.max(0, newBank - numericAmount);
        } else {
          newCash = Math.max(0, newCash - numericAmount);
        }
      } else if (type === 'TRANSFER_CASH_TO_BANK') {
        if (newCash < numericAmount) {
          throw new Error(`Insufficient cash balance in ${currencyCode} safe to transfer to bank.`);
        }
        newCash -= numericAmount;
        newBank += numericAmount;
      } else if (type === 'TRANSFER_BANK_TO_CASH') {
        if (newBank < numericAmount) {
          throw new Error(`Insufficient bank balance in ${currencyCode} account to transfer to cash.`);
        }
        newBank -= numericAmount;
        newCash += numericAmount;
      } else if (type === 'ADJUSTMENT') {
        if (paymentMethod === 'BANK') {
          newBank = numericAmount;
        } else {
          newCash = numericAmount;
        }
      } else {
        throw new Error('Invalid capital transaction type');
      }

      // 3. Update inventory
      const updatedInventory = await tx.currencyInventory.update({
        where: { currencyCode },
        data: {
          cashBalance: Number(newCash.toFixed(2)),
          bankBalance: Number(newBank.toFixed(2)),
        },
      });

      // 4. Create Wallet Transaction Record
      const walletTx = await tx.walletTransaction.create({
        data: {
          type,
          currencyCode,
          amount: numericAmount,
          paymentMethod,
          sourceOrDestination: sourceOrDestination || (type.includes('DEPOSIT') ? 'Owner Deposit' : 'Capital Adjustment'),
          notes,
        },
      });

      return { walletTx, updatedInventory };
    });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Wallet POST Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
