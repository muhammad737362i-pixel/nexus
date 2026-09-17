import { prisma } from './db';

export interface RateResult {
  appliedBuyRate: number;
  appliedSellRate: number;
  isCustom: boolean;
  marginPercent: number;
}

/**
 * Calculates effective exchange rate for a given Party and Currency pair.
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
  const year = new Date().getFullYear();
  const prefix = `NX-${year}-`;

  const lastTx = await prisma.transaction.findFirst({
    where: { receiptNo: { startsWith: prefix } },
    orderBy: { createdAt: 'desc' },
    select: { receiptNo: true },
  });

  let nextNum = 1001;
  if (lastTx?.receiptNo) {
    const parts = lastTx.receiptNo.split('-');
    const lastNum = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastNum)) {
      nextNum = lastNum + 1;
    }
  }

  let candidate = `${prefix}${nextNum}`;
  let exists = await prisma.transaction.findUnique({ where: { receiptNo: candidate } });
  while (exists) {
    nextNum++;
    candidate = `${prefix}${nextNum}`;
    exists = await prisma.transaction.findUnique({ where: { receiptNo: candidate } });
  }

  return candidate;
}

/**
 * Calculates trade profit strictly in USDT ($).
 * Single un-paired trades or trades with 0 margin return fee (or 0).
 */
export function calculateTradeProfit(
  type: 'BUY' | 'SELL',
  amountGivenINR: number,
  appliedRate: number,
  feeUSDT: number = 0,
  marketBuyRate: number = 100,
  marketSellRate: number = 100
): number {
  return Number((feeUSDT || 0).toFixed(2));
}

/**
 * Processes Buy Transaction
 * Exchange buys USDT from customer -> Exchange receives USDT (+USDT) and pays INR (-INR).
 */
export async function processBuyTransaction(params: {
  partyId: string;
  fromCurrency: string; // 'INR'
  toCurrency: string;   // 'USDT'
  amountGiven: number;  // INR Amount paid out
  appliedRate: number;  // Rate INR per USDT
  fee?: number;
  paymentMethod?: string;
  notes?: string;
  createdAt?: Date | string;
}) {
  const { partyId, fromCurrency, toCurrency, amountGiven, appliedRate, fee = 0, paymentMethod = 'CASH', notes, createdAt } = params;

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party) throw new Error('Party not found');

  const amountReceived = appliedRate > 0 ? Number((amountGiven / appliedRate).toFixed(2)) : 0;
  
  const inrCurrency = await prisma.currency.findUnique({ where: { code: 'INR' } });
  const marketBuyRate = inrCurrency?.defaultBuyRate || appliedRate;
  const totalProfit = calculateTradeProfit('BUY', amountGiven, appliedRate, fee, marketBuyRate, inrCurrency?.defaultSellRate || appliedRate);

  const receiptNo = await generateReceiptNo();
  const rawDate = createdAt ? new Date(createdAt) : undefined;
  const txDate = (rawDate && !isNaN(rawDate.getTime())) ? rawDate : undefined;

  return await prisma.$transaction(async (tx: any) => {
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
        ...(txDate ? { createdAt: txDate } : {}),
      },
    });

    await tx.ledgerEntry.create({
      data: {
        partyId,
        transactionId: transaction.id,
        currencyCode: fromCurrency,
        type: 'CREDIT',
        amount: amountGiven,
        balanceAfter: amountGiven,
        notes: `Payout for Buy order (${receiptNo})`,
        ...(txDate ? { createdAt: txDate } : {}),
      },
    });

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
  createdAt?: Date | string;
}) {
  const { partyId, fromCurrency, toCurrency, amountGiven, appliedRate, fee = 0, paymentMethod = 'CASH', notes, createdAt } = params;

  const party = await prisma.party.findUnique({ where: { id: partyId } });
  if (!party) throw new Error('Party not found');

  const amountReceived = appliedRate > 0 ? Number((amountGiven / appliedRate).toFixed(2)) : 0;

  const inrCurrency = await prisma.currency.findUnique({ where: { code: 'INR' } });
  const marketSellRate = inrCurrency?.defaultSellRate || appliedRate;
  const totalProfit = calculateTradeProfit('SELL', amountGiven, appliedRate, fee, inrCurrency?.defaultBuyRate || appliedRate, marketSellRate);

  const receiptNo = await generateReceiptNo();
  const rawDate = createdAt ? new Date(createdAt) : undefined;
  const txDate = (rawDate && !isNaN(rawDate.getTime())) ? rawDate : undefined;

  return await prisma.$transaction(async (tx: any) => {
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
        ...(txDate ? { createdAt: txDate } : {}),
      },
    });

    await tx.ledgerEntry.create({
      data: {
        partyId,
        transactionId: transaction.id,
        currencyCode: fromCurrency,
        type: 'DEBIT',
        amount: amountGiven,
        balanceAfter: amountGiven,
        notes: `Sell trade payment received (${receiptNo})`,
        ...(txDate ? { createdAt: txDate } : {}),
      },
    });

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
