import { NextResponse } from 'next/server';
import { processPairedDealTransaction } from '@/lib/exchange';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      customerId,
      bankerId,
      fromCurrency,
      toCurrency,
      usdtAmount,
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
