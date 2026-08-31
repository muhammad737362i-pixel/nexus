import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing dummy data and preparing clean production database...');

  // 1. Wipe all data tables
  await prisma.payment.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.ledgerEntry.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.partyRate.deleteMany();
  await prisma.party.deleteMany();
  await prisma.currencyInventory.deleteMany();
  await prisma.currency.deleteMany();

  // 2. Insert Default Production Base Currencies with 0 balances
  const currencies = [
    { code: 'USDT', name: 'Tether USD', symbol: '₮', isBase: true, defaultBuyRate: 1.0, defaultSellRate: 1.0 },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', isBase: false, defaultBuyRate: 88.50, defaultSellRate: 89.20 },
  ];

  for (const curr of currencies) {
    await prisma.currency.create({ data: curr });
  }

  // 3. Set Initial Zero Inventory Balances
  const inventoryData = [
    { currencyCode: 'USDT', cashBalance: 0, bankBalance: 0 },
    { currencyCode: 'INR', cashBalance: 0, bankBalance: 0 },
  ];

  for (const item of inventoryData) {
    await prisma.currencyInventory.create({ data: item });
  }

  console.log('Production database cleaned successfully! (0 parties, 0 transactions, 0 balance).');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
