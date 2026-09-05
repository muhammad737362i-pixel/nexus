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

  if (currency.isBase) {
    return {
      appliedBuyRate: 1.0,
      appliedSellRate: 1.0,
      isCustom: false,
      marginPercent: 0,
    };
  }

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
 * Buyer sells USDT to exchange -> Exchange receives USDT (+USDT) and pays INR (-INR).
 * amountGiven = INR Amount
 * amountReceived = USDT Amount (amountGiven / appliedRate)
 */
export async function processBuyTransaction(params: {
  partyId: string;
  fromCurrency: string; // 'INR'
  toCurrency: string;   // 'USDT'
  amountGiven: number;  // INR Amount paid
  appliedRate: number;  // Rate INR per USDT
  fee?: number;
  paymentMethod?: string;
  notes?: string;
}) {
  const { partyId, fromCurrency, toCurrency, amountGiven, appliedRate, fee = 0, paymentMethod = 'CASH', notes } = params;

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party) throw new Error('Party not found');

  // Amount received in USDT = INR amountGiven / appliedRate
  const amountReceived = appliedRate > 0 ? Number((amountGiven / appliedRate).toFixed(2)) : 0;
  
  // Profit calculation in INR: spread per USDT * USDT_amount + fee
  const targetCurrency = await prisma.currency.findUnique({ where: { code: toCurrency === 'USDT' ? 'INR' : toCurrency } });
  const benchmarkRate = targetCurrency?.defaultBuyRate || appliedRate;
  const spread = Math.abs(benchmarkRate - appliedRate);
  const totalProfit = Number((amountReceived * spread + fee).toFixed(2));

  const receiptNo = await generateReceiptNo();

  return await prisma.$transaction(async (tx: any) => {
    // 1. Create Transaction record
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

    // 2. Add Party Ledger Entry (Credit party account with payout INR or USDT)
    await tx.ledgerEntry.create({
      data: {
        partyId,
        transactionId: transaction.id,
        currencyCode: fromCurrency,
        type: 'CREDIT',
        amount: amountGiven,
        balanceAfter: amountGiven,
        notes: `Payout for Buy order (${receiptNo})`,
      },
    });

    // 3. Update Inventory holdings
    // A. Decrease INR inventory (money paid out)
    let invFrom = await tx.currencyInventory.findUnique({ where: { currencyCode: fromCurrency } });
    if (!invFrom) {
      invFrom = await tx.currencyInventory.create({ data: { currencyCode: fromCurrency, cashBalance: 0, bankBalance: 0 } });
    }
    const fieldFrom = paymentMethod === 'BANK' ? 'bankBalance' : 'cashBalance';
    const newBalFrom = Math.max(0, invFrom[fieldFrom] - amountGiven);
    await tx.currencyInventory.update({
      where: { currencyCode: fromCurrency },
      data: { [fieldFrom]: Number(newBalFrom.toFixed(2)) },
    });

    // B. Increase USDT inventory (assets received)
    let invTo = await tx.currencyInventory.findUnique({ where: { currencyCode: toCurrency } });
    if (!invTo) {
      invTo = await tx.currencyInventory.create({ data: { currencyCode: toCurrency, cashBalance: 0, bankBalance: 0 } });
    }
    const fieldTo = paymentMethod === 'BANK' ? 'bankBalance' : 'cashBalance';
    const newBalTo = invTo[fieldTo] + amountReceived;
    await tx.currencyInventory.update({
      where: { currencyCode: toCurrency },
      data: { [fieldTo]: Number(newBalTo.toFixed(2)) },
    });

    return transaction;
  });
}

/**
 * Processes Sell Transaction
 * Exchange sells USDT to banker/buyer -> Exchange delivers USDT (-USDT) and receives INR (+INR).
 * amountGiven = INR Amount
 * amountReceived = USDT Amount (amountGiven / appliedRate)
 */
export async function processSellTransaction(params: {
  partyId: string;
  fromCurrency: string; // 'INR'
  toCurrency: string;   // 'USDT'
  amountGiven: number;  // INR Amount collected
  appliedRate: number;  // Rate INR per USDT
  fee?: number;
  paymentMethod?: string;
  notes?: string;
}) {
  const { partyId, fromCurrency, toCurrency, amountGiven, appliedRate, fee = 0, paymentMethod = 'CASH', notes } = params;

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party) throw new Error('Party not found');

  const amountReceived = appliedRate > 0 ? Number((amountGiven / appliedRate).toFixed(2)) : 0;

  const targetCurrency = await prisma.currency.findUnique({ where: { code: toCurrency === 'USDT' ? 'INR' : toCurrency } });
  const benchmarkRate = targetCurrency?.defaultSellRate || appliedRate;
  const spread = Math.abs(appliedRate - benchmarkRate);
  const totalProfit = Number((amountReceived * spread + fee).toFixed(2));

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
        currencyCode: fromCurrency,
        type: 'DEBIT',
        amount: amountGiven,
        balanceAfter: amountGiven,
        notes: `Sell trade payment received (${receiptNo})`,
      },
    });

    // 3. Update Inventory holdings
    // A. Increase INR inventory (money received)
    let invFrom = await tx.currencyInventory.findUnique({ where: { currencyCode: fromCurrency } });
    if (!invFrom) {
      invFrom = await tx.currencyInventory.create({ data: { currencyCode: fromCurrency, cashBalance: 0, bankBalance: 0 } });
    }
    const fieldFrom = paymentMethod === 'BANK' ? 'bankBalance' : 'cashBalance';
    const newBalFrom = invFrom[fieldFrom] + amountGiven;
    await tx.currencyInventory.update({
      where: { currencyCode: fromCurrency },
      data: { [fieldFrom]: Number(newBalFrom.toFixed(2)) },
    });

    // B. Decrease USDT inventory (assets delivered)
    let invTo = await tx.currencyInventory.findUnique({ where: { currencyCode: toCurrency } });
    if (!invTo) {
      invTo = await tx.currencyInventory.create({ data: { currencyCode: toCurrency, cashBalance: 0, bankBalance: 0 } });
    }
    const fieldTo = paymentMethod === 'BANK' ? 'bankBalance' : 'cashBalance';
    const newBalTo = Math.max(0, invTo[fieldTo] - amountReceived);
    await tx.currencyInventory.update({
      where: { currencyCode: toCurrency },
      data: { [fieldTo]: Number(newBalTo.toFixed(2)) },
    });

    return transaction;
  });
}
