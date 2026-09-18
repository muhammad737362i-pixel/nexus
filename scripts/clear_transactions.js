const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Clearing all transactions, ledger entries, payments, and wallet records...');
  
  const deletedLedger = await prisma.ledgerEntry.deleteMany({});
  console.log(`Deleted ${deletedLedger.count} ledger entries.`);

  const deletedTx = await prisma.transaction.deleteMany({});
  console.log(`Deleted ${deletedTx.count} transactions.`);

  const deletedPayments = await prisma.payment.deleteMany({});
  console.log(`Deleted ${deletedPayments.count} payments.`);

  const deletedWalletTx = await prisma.walletTransaction.deleteMany({});
  console.log(`Deleted ${deletedWalletTx.count} wallet transactions.`);

  const resetInventory = await prisma.currencyInventory.updateMany({
    data: {
      cashBalance: 0,
      bankBalance: 0,
    },
  });
  console.log(`Reset ${resetInventory.count} inventory balances to zero.`);

  console.log('All transaction history cleared successfully. Parties, Users, and Currencies remain intact.');
}

main()
  .catch((e) => {
    console.error('Error clearing transactions:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
