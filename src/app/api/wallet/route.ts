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

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, type, currencyCode, amount, paymentMethod, sourceOrDestination, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Wallet Transaction ID is required' }, { status: 400 });
    }

    const oldTx = await prisma.walletTransaction.findUnique({ where: { id } });
    if (!oldTx) {
      return NextResponse.json({ success: false, error: 'Wallet Transaction not found' }, { status: 404 });
    }

    const newType = type || oldTx.type;
    const newCurrency = currencyCode || oldTx.currencyCode;
    const newAmount = amount !== undefined && amount !== null ? parseFloat(amount) : oldTx.amount;
    const newMethod = paymentMethod || oldTx.paymentMethod;

    if (isNaN(newAmount) || newAmount <= 0) {
      return NextResponse.json({ success: false, error: 'Valid positive amount required' }, { status: 400 });
    }

    const updatedTx = await prisma.$transaction(async (prismaTx: any) => {
      // 1. Revert Old Transaction Impact
      const oldInv = await prismaTx.currencyInventory.findUnique({
        where: { currencyCode: oldTx.currencyCode },
      });

      if (oldInv) {
        let revCash = oldInv.cashBalance;
        let revBank = oldInv.bankBalance;
        const oldAmt = oldTx.amount;

        if (oldTx.type === 'CAPITAL_DEPOSIT') {
          if (oldTx.paymentMethod === 'BANK') revBank = Math.max(0, revBank - oldAmt);
          else revCash = Math.max(0, revCash - oldAmt);
        } else if (oldTx.type === 'CAPITAL_WITHDRAWAL') {
          if (oldTx.paymentMethod === 'BANK') revBank += oldAmt;
          else revCash += oldAmt;
        } else if (oldTx.type === 'TRANSFER_CASH_TO_BANK') {
          revCash += oldAmt;
          revBank = Math.max(0, revBank - oldAmt);
        } else if (oldTx.type === 'TRANSFER_BANK_TO_CASH') {
          revBank += oldAmt;
          revCash = Math.max(0, revCash - oldAmt);
        }

        await prismaTx.currencyInventory.update({
          where: { currencyCode: oldTx.currencyCode },
          data: {
            cashBalance: Number(revCash.toFixed(2)),
            bankBalance: Number(revBank.toFixed(2)),
          },
        });
      }

      // 2. Apply New Transaction Impact
      let newInv = await prismaTx.currencyInventory.findUnique({
        where: { currencyCode: newCurrency },
      });
      if (!newInv) {
        newInv = await prismaTx.currencyInventory.create({
          data: { currencyCode: newCurrency, cashBalance: 0, bankBalance: 0 },
        });
      }

      let applyCash = newInv.cashBalance;
      let applyBank = newInv.bankBalance;

      if (newType === 'CAPITAL_DEPOSIT') {
        if (newMethod === 'BANK') applyBank += newAmount;
        else applyCash += newAmount;
      } else if (newType === 'CAPITAL_WITHDRAWAL') {
        if (newMethod === 'BANK') applyBank = Math.max(0, applyBank - newAmount);
        else applyCash = Math.max(0, applyCash - newAmount);
      } else if (newType === 'TRANSFER_CASH_TO_BANK') {
        applyCash = Math.max(0, applyCash - newAmount);
        applyBank += newAmount;
      } else if (newType === 'TRANSFER_BANK_TO_CASH') {
        applyBank = Math.max(0, applyBank - newAmount);
        applyCash += newAmount;
      } else if (newType === 'ADJUSTMENT') {
        if (newMethod === 'BANK') applyBank = newAmount;
        else applyCash = newAmount;
      }

      await prismaTx.currencyInventory.update({
        where: { currencyCode: newCurrency },
        data: {
          cashBalance: Number(applyCash.toFixed(2)),
          bankBalance: Number(applyBank.toFixed(2)),
        },
      });

      // 3. Update Record
      return await prismaTx.walletTransaction.update({
        where: { id },
        data: {
          type: newType,
          currencyCode: newCurrency,
          amount: newAmount,
          paymentMethod: newMethod,
          sourceOrDestination: sourceOrDestination !== undefined ? sourceOrDestination : oldTx.sourceOrDestination,
          notes: notes !== undefined ? notes : oldTx.notes,
        },
      });
    });

    return NextResponse.json({ success: true, transaction: updatedTx });
  } catch (error: any) {
    console.error('Wallet PUT Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Wallet Transaction ID is required' }, { status: 400 });
    }

    const tx = await prisma.walletTransaction.findUnique({ where: { id } });
    if (!tx) {
      return NextResponse.json({ success: false, error: 'Wallet Transaction not found' }, { status: 404 });
    }

    await prisma.$transaction(async (prismaTx: any) => {
      const inventory = await prismaTx.currencyInventory.findUnique({
        where: { currencyCode: tx.currencyCode },
      });

      if (inventory) {
        let newCash = inventory.cashBalance;
        let newBank = inventory.bankBalance;
        const amt = tx.amount;

        if (tx.type === 'CAPITAL_DEPOSIT') {
          if (tx.paymentMethod === 'BANK') newBank = Math.max(0, newBank - amt);
          else newCash = Math.max(0, newCash - amt);
        } else if (tx.type === 'CAPITAL_WITHDRAWAL') {
          if (tx.paymentMethod === 'BANK') newBank += amt;
          else newCash += amt;
        } else if (tx.type === 'TRANSFER_CASH_TO_BANK') {
          newCash += amt;
          newBank = Math.max(0, newBank - amt);
        } else if (tx.type === 'TRANSFER_BANK_TO_CASH') {
          newBank += amt;
          newCash = Math.max(0, newCash - amt);
        }

        await prismaTx.currencyInventory.update({
          where: { currencyCode: tx.currencyCode },
          data: {
            cashBalance: Number(newCash.toFixed(2)),
            bankBalance: Number(newBank.toFixed(2)),
          },
        });
      }

      await prismaTx.walletTransaction.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: 'Wallet transaction deleted successfully' });
  } catch (error: any) {
    console.error('Wallet DELETE Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
