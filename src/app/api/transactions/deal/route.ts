import { NextResponse } from 'next/server';
import { processPairedDealTransaction, processMultiBankerDealTransaction } from '@/lib/exchange';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 1. Multi-Banker Split Deal Execution
    if (body.bankers && Array.isArray(body.bankers) && body.bankers.length > 0) {
      const {
        customerId,
        fromCurrency,
        toCurrency,
        totalAmountINR,
        customerBuyRate,
        bankers,
        customerPaymentMethod,
        customerFee,
        notes,
        createdAt,
      } = body;

      if (!customerId) {
        return NextResponse.json(
          { success: false, error: 'Customer must be selected for the deal' },
          { status: 400 }
        );
      }

      const numTotalINR = parseFloat(totalAmountINR);
      const numBuyRate = parseFloat(customerBuyRate);

      if (isNaN(numTotalINR) || numTotalINR <= 0) {
        return NextResponse.json(
          { success: false, error: 'Valid total trade amount in INR is required' },
          { status: 400 }
        );
      }

      if (isNaN(numBuyRate) || numBuyRate <= 0) {
        return NextResponse.json(
          { success: false, error: 'Valid Customer Buy Rate is required' },
          { status: 400 }
        );
      }

      for (let i = 0; i < bankers.length; i++) {
        const b = bankers[i];
        if (!b.bankerId) {
          return NextResponse.json(
            { success: false, error: `Banker #${i + 1} must be selected` },
            { status: 400 }
          );
        }
        const bAmt = parseFloat(b.amountINR);
        const bRate = parseFloat(b.sellRate);
        if (isNaN(bAmt) || bAmt <= 0) {
          return NextResponse.json(
            { success: false, error: `Valid allocation amount is required for Banker #${i + 1}` },
            { status: 400 }
          );
        }
        if (isNaN(bRate) || bRate <= 0) {
          return NextResponse.json(
            { success: false, error: `Valid Sell Rate is required for Banker #${i + 1}` },
            { status: 400 }
          );
        }
      }

      const result = await processMultiBankerDealTransaction({
        customerId,
        fromCurrency: fromCurrency || 'INR',
        toCurrency: toCurrency || 'USDT',
        totalAmountINR: numTotalINR,
        customerBuyRate: numBuyRate,
        customerPaymentMethod: customerPaymentMethod || 'CASH',
        customerFee: customerFee ? parseFloat(customerFee) : 0,
        bankers: bankers.map((b: any) => ({
          bankerId: b.bankerId,
          amountINR: parseFloat(b.amountINR),
          sellRate: parseFloat(b.sellRate),
          sellPaymentMethod: b.sellPaymentMethod || 'CASH',
          fee: b.fee ? parseFloat(b.fee) : 0,
        })),
        notes,
        createdAt,
      });

      return NextResponse.json({
        success: true,
        ...result,
      });
    }

    // 2. Legacy / Standard Single Banker Deal Execution
    const {
      customerId,
      bankerId,
      fromCurrency,
      toCurrency,
      usdtAmount,
      buyUsdtAmount,
      sellUsdtAmount,
      buyRate,
      sellRate,
      buyAmountINR,
      sellAmountINR,
      buyPaymentMethod,
      sellPaymentMethod,
      buyFee,
      sellFee,
      notes,
      createdAt,
    } = body;

    if (!customerId || !bankerId) {
      return NextResponse.json(
        { success: false, error: 'Both Customer and Banker must be selected for a deal' },
        { status: 400 }
      );
    }

    const numUsdt = parseFloat(usdtAmount);
    const numBuyRate = parseFloat(buyRate);
    const numSellRate = parseFloat(sellRate);

    if (isNaN(numUsdt) || numUsdt <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid USDT amount is required' },
        { status: 400 }
      );
    }

    if (isNaN(numBuyRate) || numBuyRate <= 0 || isNaN(numSellRate) || numSellRate <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid Buy and Sell rates are required' },
        { status: 400 }
      );
    }

    const result = await processPairedDealTransaction({
      customerId,
      bankerId,
      fromCurrency: fromCurrency || 'INR',
      toCurrency: toCurrency || 'USDT',
      usdtAmount: numUsdt,
      buyUsdtAmount: buyUsdtAmount ? parseFloat(buyUsdtAmount) : undefined,
      sellUsdtAmount: sellUsdtAmount ? parseFloat(sellUsdtAmount) : undefined,
      buyRate: numBuyRate,
      sellRate: numSellRate,
      buyAmountINR: buyAmountINR ? parseFloat(buyAmountINR) : undefined,
      sellAmountINR: sellAmountINR ? parseFloat(sellAmountINR) : undefined,
      buyPaymentMethod: buyPaymentMethod || 'CASH',
      sellPaymentMethod: sellPaymentMethod || 'CASH',
      buyFee: buyFee ? parseFloat(buyFee) : 0,
      sellFee: sellFee ? parseFloat(sellFee) : 0,
      notes,
      createdAt,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Error executing paired deal:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
