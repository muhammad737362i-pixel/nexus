import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const currencies = await prisma.currency.findMany({
      orderBy: { isBase: 'desc' },
    });
    return NextResponse.json({ success: true, currencies });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, defaultBuyRate, defaultSellRate } = body;

    const updated = await prisma.currency.update({
      where: { id },
      data: {
        defaultBuyRate: parseFloat(defaultBuyRate),
        defaultSellRate: parseFloat(defaultSellRate),
      },
    });

    return NextResponse.json({ success: true, currency: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
