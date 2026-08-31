import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getEffectiveRateForParty } from '@/lib/exchange';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const partyId = searchParams.get('partyId');
    const currencyCode = searchParams.get('currencyCode');

    if (partyId && currencyCode) {
      const rateInfo = await getEffectiveRateForParty(partyId, currencyCode);
      return NextResponse.json({ success: true, rateInfo });
    }

    // Get all party custom rates
    const customRates = await prisma.partyRate.findMany({
      include: {
        party: true,
      },
    });

    return NextResponse.json({ success: true, customRates });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { partyId, currencyCode, customBuyRate, customSellRate, marginPercent } = body;

    if (!partyId || !currencyCode) {
      return NextResponse.json({ success: false, error: 'Party and Currency are required' }, { status: 400 });
    }

    const partyRate = await prisma.partyRate.upsert({
      where: {
        partyId_currencyCode: {
          partyId,
          currencyCode,
        },
      },
      update: {
        customBuyRate: customBuyRate ? parseFloat(customBuyRate) : null,
        customSellRate: customSellRate ? parseFloat(customSellRate) : null,
        marginPercent: marginPercent ? parseFloat(marginPercent) : 0,
      },
      create: {
        partyId,
        currencyCode,
        customBuyRate: customBuyRate ? parseFloat(customBuyRate) : null,
        customSellRate: customSellRate ? parseFloat(customSellRate) : null,
        marginPercent: marginPercent ? parseFloat(marginPercent) : 0,
      },
    });

    return NextResponse.json({ success: true, partyRate });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
