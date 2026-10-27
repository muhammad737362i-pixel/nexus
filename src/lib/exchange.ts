import { prisma } from './db';
import { parseISTDate } from './dateUtils';

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
  const txDate = parseISTDate(createdAt);

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
  const txDate = parseISTDate(createdAt);

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

/**
 * Generates two sequential unique receipt numbers for a paired trade deal
 */
export async function generateTwoSequentialReceiptNos(): Promise<[string, string]> {
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

  let candidate1 = `${prefix}${nextNum}`;
  while (await prisma.transaction.findUnique({ where: { receiptNo: candidate1 } })) {
    nextNum++;
    candidate1 = `${prefix}${nextNum}`;
  }

  nextNum++;
  let candidate2 = `${prefix}${nextNum}`;
  while (await prisma.transaction.findUnique({ where: { receiptNo: candidate2 } })) {
    nextNum++;
    candidate2 = `${prefix}${nextNum}`;
  }

  return [candidate1, candidate2];
}

/**
 * Processes Paired 2-in-1 Deal Transaction
 * Atomically records:
 * 1. BUY transaction for Customer (Exchange buys USDT from customer, pays INR)
 * 2. SELL transaction for Banker (Exchange sells USDT to banker, receives INR)
 */
export async function processPairedDealTransaction(params: {
  customerId: string;
  bankerId: string;
  fromCurrency?: string; // Default 'INR'
  toCurrency?: string;   // Default 'USDT'
  usdtAmount: number;
  buyRate: number;
  sellRate: number;
  buyAmountINR?: number;
  sellAmountINR?: number;
  buyPaymentMethod?: string;
  sellPaymentMethod?: string;
  buyFee?: number;
  sellFee?: number;
  notes?: string;
  createdAt?: Date | string;
}) {
  const {
    customerId,
    bankerId,
    fromCurrency = 'INR',
    toCurrency = 'USDT',
    usdtAmount,
    buyRate,
    sellRate,
    buyPaymentMethod = 'CASH',
    sellPaymentMethod = 'CASH',
    buyFee = 0,
    sellFee = 0,
    notes,
    createdAt,
  } = params;

  if (!customerId || !bankerId) {
    throw new Error('Both Customer and Banker must be selected for a deal');
  }
  if (usdtAmount <= 0) {
    throw new Error('USDT amount must be greater than 0');
  }
  if (buyRate <= 0 || sellRate <= 0) {
    throw new Error('Buy and Sell rates must be greater than 0');
  }

  const [customer, banker] = await Promise.all([
    prisma.party.findUnique({ where: { id: customerId } }),
    prisma.party.findUnique({ where: { id: bankerId } }),
  ]);

  if (!customer) throw new Error('Customer party not found');
  if (!banker) throw new Error('Banker party not found');

  const buyAmountINR = params.buyAmountINR && params.buyAmountINR > 0
    ? Number(params.buyAmountINR.toFixed(2))
    : Number((usdtAmount * buyRate).toFixed(2));

  const sellAmountINR = params.sellAmountINR && params.sellAmountINR > 0
    ? Number(params.sellAmountINR.toFixed(2))
    : Number((usdtAmount * sellRate).toFixed(2));

  const grossProfitINR = Number((sellAmountINR - buyAmountINR + buyFee + sellFee).toFixed(2));
  const grossProfitUSDT = sellRate > 0 ? Number((grossProfitINR / sellRate).toFixed(2)) : 0;

  const [buyReceiptNo, sellReceiptNo] = await generateTwoSequentialReceiptNos();
  const txDate = parseISTDate(createdAt);

  return await prisma.$transaction(async (tx: any) => {
    // 1. Create BUY transaction (Customer)
    const buyTransaction = await tx.transaction.create({
      data: {
        receiptNo: buyReceiptNo,
        type: 'BUY',
        partyId: customerId,
        fromCurrency,
        toCurrency,
        amountGiven: buyAmountINR,
        amountReceived: usdtAmount,
        appliedRate: buyRate,
        fee: buyFee,
        totalProfit: 0,
        paymentMethod: buyPaymentMethod,
        status: 'COMPLETED',
        notes: notes ? `${notes} | Paired Sell: ${sellReceiptNo}` : `Paired Sell: ${sellReceiptNo}`,
        ...(txDate ? { createdAt: txDate } : {}),
      },
      include: {
        party: true,
      },
    });

    // 2. Create SELL transaction (Banker) - holds total profit of the deal
    const sellTransaction = await tx.transaction.create({
      data: {
        receiptNo: sellReceiptNo,
        type: 'SELL',
        partyId: bankerId,
        fromCurrency,
        toCurrency,
        amountGiven: sellAmountINR,
        amountReceived: usdtAmount,
        appliedRate: sellRate,
        fee: sellFee,
        totalProfit: grossProfitUSDT,
        paymentMethod: sellPaymentMethod,
        status: 'COMPLETED',
        notes: notes ? `${notes} | Paired Buy: ${buyReceiptNo}` : `Paired Buy: ${buyReceiptNo}`,
        ...(txDate ? { createdAt: txDate } : {}),
      },
      include: {
        party: true,
      },
    });

    // 3. Create Ledger Entries
    // Customer Payout (CREDIT)
    await tx.ledgerEntry.create({
      data: {
        partyId: customerId,
        transactionId: buyTransaction.id,
        currencyCode: fromCurrency,
        type: 'CREDIT',
        amount: buyAmountINR,
        balanceAfter: buyAmountINR,
        notes: `Payout for Buy order (${buyReceiptNo}) [Deal with ${banker.name}]`,
        ...(txDate ? { createdAt: txDate } : {}),
      },
    });

    // Banker Collection (DEBIT)
    await tx.ledgerEntry.create({
      data: {
        partyId: bankerId,
        transactionId: sellTransaction.id,
        currencyCode: fromCurrency,
        type: 'DEBIT',
        amount: sellAmountINR,
        balanceAfter: sellAmountINR,
        notes: `Sell trade payment received (${sellReceiptNo}) [Deal with ${customer.name}]`,
        ...(txDate ? { createdAt: txDate } : {}),
      },
    });

    // 4. Update Inventory
    // Buy leg: Decreases INR inventory (payout to customer)
    let invINRFrom = await tx.currencyInventory.findUnique({ where: { currencyCode: fromCurrency } });
    if (!invINRFrom) {
      invINRFrom = await tx.currencyInventory.create({ data: { currencyCode: fromCurrency, cashBalance: 0, bankBalance: 0 } });
    }
    const buyMethodField = buyPaymentMethod === 'BANK' ? 'bankBalance' : 'cashBalance';
    const postBuyINR = Math.max(0, invINRFrom[buyMethodField] - buyAmountINR);
    await tx.currencyInventory.update({
      where: { currencyCode: fromCurrency },
      data: { [buyMethodField]: Number(postBuyINR.toFixed(2)) },
    });

    // Sell leg: Increases INR inventory (collection from banker)
    let invINRSell = await tx.currencyInventory.findUnique({ where: { currencyCode: fromCurrency } });
    const sellMethodField = sellPaymentMethod === 'BANK' ? 'bankBalance' : 'cashBalance';
    const postSellINR = (invINRSell ? invINRSell[sellMethodField] : 0) + sellAmountINR;
    await tx.currencyInventory.update({
      where: { currencyCode: fromCurrency },
      data: { [sellMethodField]: Number(postSellINR.toFixed(2)) },
    });

    // USDT Inventory:
    // If payment methods differ between legs, adjust respective cash/bank accounts
    if (buyPaymentMethod !== sellPaymentMethod) {
      let invUSDT = await tx.currencyInventory.findUnique({ where: { currencyCode: toCurrency } });
      if (!invUSDT) {
        invUSDT = await tx.currencyInventory.create({ data: { currencyCode: toCurrency, cashBalance: 0, bankBalance: 0 } });
      }
      const newBuyBal = invUSDT[buyMethodField] + usdtAmount;
      const newSellBal = Math.max(0, invUSDT[sellMethodField] - usdtAmount);
      await tx.currencyInventory.update({
        where: { currencyCode: toCurrency },
        data: {
          [buyMethodField]: Number(newBuyBal.toFixed(2)),
          [sellMethodField]: Number(newSellBal.toFixed(2)),
        },
      });
    }

    return {
      buyTransaction,
      sellTransaction,
      grossProfitINR,
      grossProfitUSDT,
      spreadPerUSDT: Number((sellRate - buyRate).toFixed(4)),
    };
  });
}
