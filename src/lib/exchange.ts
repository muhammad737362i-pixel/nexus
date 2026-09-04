import { prisma } from './db';

export interface RateResult {
  appliedBuyRate: number;
  appliedSellRate: number;
  isCustom: boolean;
  marginPercent: number;
}

/**
 * Calculates effective exchange rate for a given Party and Currency pair.
 * Priority: 1) Specific Party Custom Rate -> 2) Party Custom Margin % -> 3) Base Currency Default Rate.
 */
export async function getEffectiveRateForParty(
  partyId: string,
  targetCurrencyCode: string
): Promise<RateResult> {
  const currency = await prisma.currency.findUnique({
    where: { code: targetCurrencyCode },
  });

  if (!currency) {
    throw new Error(`Currency ${targetCurrencyCode} not found`);
  }

  // Check if target is base currency (USD)
  if (currency.isBase) {
    return {
      appliedBuyRate: 1.0,
      appliedSellRate: 1.0,
      isCustom: false,
      marginPercent: 0,
    };
  }

  // Find party rate override
  const customRate = await prisma.partyRate.findUnique({
    where: {
      partyId_currencyCode: {
        partyId,
        currencyCode: targetCurrencyCode,
      },
    },
  });

  if (customRate) {
    let buyRate = customRate.customBuyRate ?? currency.defaultBuyRate;
    let sellRate = customRate.customSellRate ?? currency.defaultSellRate;

    // Apply margin percentage if explicit rates are not specified
    if (customRate.marginPercent !== 0 && !customRate.customBuyRate) {
      buyRate = buyRate * (1 + customRate.marginPercent / 100);
    }
    if (customRate.marginPercent !== 0 && !customRate.customSellRate) {
      sellRate = sellRate * (1 + customRate.marginPercent / 100);
    }

    return {
      appliedBuyRate: Number(buyRate.toFixed(6)),
      appliedSellRate: Number(sellRate.toFixed(6)),
      isCustom: true,
      marginPercent: customRate.marginPercent,
    };
  }

  // Fallback to default base rate
  return {
    appliedBuyRate: currency.defaultBuyRate,
    appliedSellRate: currency.defaultSellRate,
    isCustom: false,
    marginPercent: 0,
  };
}

/**
 * Generates sequential unique receipt number
 */
export async function generateReceiptNo(): Promise<string> {
  const count = await prisma.transaction.count();
  const nextNum = 1001 + count;
  const year = new Date().getFullYear();
  return `NX-${year}-${nextNum}`;
}

/**
 * Processes Buy Transaction
 */
export async function processBuyTransaction(params: {
  partyId: string;
  fromCurrency: string;
  toCurrency: string;
  amountGiven: number;
  appliedRate: number;
  fee?: number;
  paymentMethod?: string;
  notes?: string;
}) {
  const { partyId, fromCurrency, toCurrency, amountGiven, appliedRate, fee = 0, paymentMethod = 'CASH', notes } = params;

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party) throw new Error('Party not found');

  // Amount received in target currency (base USD) = amountGiven / appliedRate
  const amountReceived = appliedRate > 0 ? Number((amountGiven / appliedRate).toFixed(2)) : 0;
  
  // Profit estimation calculation (Difference between buy rate and base rate)
  const baseCurrency = await prisma.currency.findUnique({ where: { code: fromCurrency } });
  const benchmarkRate = baseCurrency?.defaultBuyRate || appliedRate;
  const spread = Math.abs(benchmarkRate - appliedRate);
  const totalProfit = Number((amountGiven * spread + fee).toFixed(2));

  const receiptNo = await generateReceiptNo();

  return await prisma.$transaction(async (tx: any) => {
    // 1. Create Transaction
    const transaction = await tx.transaction.create({
      data: {
        receiptNo,
        type: 'BUY',
        partyId,
        fromCurrency,
        toCurrency,
        amountGiven,
        amountReceived,
        appliedRate,
        fee,
        totalProfit,
        paymentMethod,
        status: 'COMPLETED',
        notes,
      },
    });

    // 2. Add Party Ledger Entry
    await tx.ledgerEntry.create({
      data: {
        partyId,
        transactionId: transaction.id,
        currencyCode: toCurrency,
        type: 'CREDIT',
        amount: amountReceived,
        balanceAfter: amountReceived, // Simplified balance calculation
        notes: `Payout for Buy order (${receiptNo})`,
      },
    });

    // 3. Update Inventory holdings
    const inventoryFrom = await tx.currencyInventory.findUnique({ where: { currencyCode: fromCurrency } });
    if (inventoryFrom) {
      if (paymentMethod === 'BANK') {
        await tx.currencyInventory.update({
          where: { currencyCode: fromCurrency },
          data: { bankBalance: inventoryFrom.bankBalance + amountGiven },
        });
      } else {
        await tx.currencyInventory.update({
          where: { currencyCode: fromCurrency },
          data: { cashBalance: inventoryFrom.cashBalance + amountGiven },
        });
      }
    }

    return transaction;
  });
}

/**
 * Processes Sell Transaction
 */
export async function processSellTransaction(params: {
  partyId: string;
  fromCurrency: string;
  toCurrency: string;
  amountGiven: number;
  appliedRate: number;
  fee?: number;
  paymentMethod?: string;
  notes?: string;
}) {
  const { partyId, fromCurrency, toCurrency, amountGiven, appliedRate, fee = 0, paymentMethod = 'CASH', notes } = params;

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party) throw new Error('Party not found');

  const amountReceived = appliedRate > 0 ? Number((amountGiven / appliedRate).toFixed(2)) : 0;

  const baseCurrency = await prisma.currency.findUnique({ where: { code: toCurrency } });
  const benchmarkRate = baseCurrency?.defaultSellRate || appliedRate;
  const spread = Math.abs(appliedRate - benchmarkRate);
  const totalProfit = Number((amountGiven * spread + fee).toFixed(2));

  const receiptNo = await generateReceiptNo();

  return await prisma.$transaction(async (tx: any) => {
    // 1. Create Transaction
    const transaction = await tx.transaction.create({
      data: {
        receiptNo,
        type: 'SELL',
        partyId,
        fromCurrency,
        toCurrency,
        amountGiven,
        amountReceived,
        appliedRate,
        fee,
        totalProfit,
        paymentMethod,
        status: 'COMPLETED',
        notes,
      },
    });

    // 2. Add Party Ledger Entry
    await tx.ledgerEntry.create({
      data: {
        partyId,
        transactionId: transaction.id,
        currencyCode: toCurrency,
        type: 'DEBIT',
        amount: amountReceived,
        balanceAfter: amountReceived,
        notes: `Sold currency (${receiptNo})`,
      },
    });

    // 3. Update Inventory holdings
    const inventoryTo = await tx.currencyInventory.findUnique({ where: { currencyCode: toCurrency } });
    if (inventoryTo) {
      if (paymentMethod === 'BANK') {
        await tx.currencyInventory.update({
          where: { currencyCode: toCurrency },
          data: { bankBalance: Math.max(0, inventoryTo.bankBalance - amountReceived) },
        });
      } else {
        await tx.currencyInventory.update({
          where: { currencyCode: toCurrency },
          data: { cashBalance: Math.max(0, inventoryTo.cashBalance - amountReceived) },
        });
      }
    }

    return transaction;
  });
}
