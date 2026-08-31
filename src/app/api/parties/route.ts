import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // "CUSTOMER" or "BANKER"

    const whereCondition = type ? { type } : {};

    const parties = await prisma.party.findMany({
      where: whereCondition,
      include: {
        partyRates: true,
        transactions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
        ledgerEntries: true,
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, parties });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, type, phone, email, bankDetails, notes } = body;

    if (!name || !type) {
      return NextResponse.json({ success: false, error: 'Name and type are required' }, { status: 400 });
    }

    const newParty = await prisma.party.create({
      data: {
        name,
        type,
        phone,
        email,
        bankDetails,
        notes,
      },
    });

    return NextResponse.json({ success: true, party: newParty });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
