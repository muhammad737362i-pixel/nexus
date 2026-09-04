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

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, phone, email, bankDetails, notes } = body;

    if (!id || !name) {
      return NextResponse.json({ success: false, error: 'Party ID and name are required' }, { status: 400 });
    }

    const updatedParty = await prisma.party.update({
      where: { id },
      data: {
        name,
        phone,
        email,
        bankDetails,
        notes,
      },
    });

    return NextResponse.json({ success: true, party: updatedParty });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Party ID is required' }, { status: 400 });
    }

    await prisma.$transaction(async (tx: any) => {
      await tx.partyCustomRate.deleteMany({ where: { partyId: id } });
      await tx.ledgerEntry.deleteMany({ where: { partyId: id } });
      await tx.payment.deleteMany({ where: { partyId: id } });
      await tx.transaction.deleteMany({ where: { partyId: id } });
      await tx.party.delete({ where: { id } });
    });

    return NextResponse.json({ success: true, message: 'Party deleted successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
