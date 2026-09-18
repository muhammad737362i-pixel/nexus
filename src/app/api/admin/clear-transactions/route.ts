import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST() {
  try {
    const result = await prisma.$transaction(async (tx: any) => {
      const deletedLedger = await tx.ledgerEntry.deleteMany({});
      const deletedTx = await tx.transaction.deleteMany({});
      const deletedPayments = await tx.payment.deleteMany({});
      const deletedWalletTx = await tx.walletTransaction.deleteMany({});
      const resetInventory = await tx.currencyInventory.updateMany({
        data: {
          cashBalance: 0,
          bankBalance: 0,
        },
      });

      return {
        deletedLedgerCount: deletedLedger.count,
        deletedTxCount: deletedTx.count,
        deletedPaymentsCount: deletedPayments.count,
        deletedWalletTxCount: deletedWalletTx.count,
        resetInventoryCount: resetInventory.count,
      };
    });

    return NextResponse.json({
      success: true,
      message: 'All transaction history and ledger entries cleared successfully.',
      details: result,
    });
  } catch (error: any) {
    console.error('Clear Transactions Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
