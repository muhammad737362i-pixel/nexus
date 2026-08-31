import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Nexus Exchange Database with USDT & INR...');

  // 1. Clear existing data
  await prisma.ledgerEntry.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.partyRate.deleteMany();
  await prisma.party.deleteMany();
  await prisma.currencyInventory.deleteMany();
  await prisma.currency.deleteMany();

  // 2. Insert Currencies (USDT Base & INR Counter)
  const currencies = [
    { code: 'USDT', name: 'Tether USD', symbol: '₮', isBase: true, defaultBuyRate: 1.0, defaultSellRate: 1.0 },
    { code: 'INR', name: 'Indian Rupee', symbol: '₹', isBase: false, defaultBuyRate: 88.50, defaultSellRate: 89.20 },
  ];

  for (const curr of currencies) {
    await prisma.currency.create({ data: curr });
  }

  // 3. Set Initial Inventory Holdings
  const inventoryData = [
    { currencyCode: 'USDT', cashBalance: 50000, bankBalance: 150000 },
    { currencyCode: 'INR', cashBalance: 5000000, bankBalance: 15000000 },
  ];

  for (const item of inventoryData) {
    await prisma.currencyInventory.create({ data: item });
  }

  // 4. Create Sample Customers & Bankers
  const customer1 = await prisma.party.create({
    data: {
      name: 'Rajesh Sharma (VIP Trader)',
      type: 'CUSTOMER',
      phone: '+91 98765 43210',
      email: 'rajesh.sharma@example.com',
      notes: 'High-volume USDT/INR trader.',
    },
  });

  const customer2 = await prisma.party.create({
    data: {
      name: 'Priya Patel',
      type: 'CUSTOMER',
      phone: '+91 98123 45678',
      email: 'priya.p@example.com',
      notes: 'Regular retail USDT buyer.',
    },
  });

  const banker1 = await prisma.party.create({
    data: {
      name: 'Binance OTC Desk',
      type: 'BANKER',
      phone: '+1 800 555 USDT',
      email: 'otc@binance.io',
      bankDetails: 'TRC20 Wallet: T9zP...8xQk | ERC20: 0x71C...49A',
      notes: 'Wholesale USDT crypto supplier.',
    },
  });

  const banker2 = await prisma.party.create({
    data: {
      name: 'HDFC Global Desk',
      type: 'BANKER',
      phone: '+91 22 6600 8888',
      email: 'settlements@hdfcbank.com',
      bankDetails: 'IBAN: HDFC0001234 9876 5432 10',
      notes: 'Primary INR bank liquidity supplier.',
    },
  });

  // 5. Create Party Custom Rates
  await prisma.partyRate.create({
    data: {
      partyId: customer1.id,
      currencyCode: 'INR',
      customBuyRate: 88.70,
      customSellRate: 89.00,
      marginPercent: -0.2,
    },
  });

  await prisma.partyRate.create({
    data: {
      partyId: banker1.id,
      currencyCode: 'INR',
      customBuyRate: 88.35,
      customSellRate: 89.35,
      marginPercent: 0.3,
    },
  });

  // 6. Create Initial Transaction
  await prisma.transaction.create({
    data: {
      receiptNo: 'NX-2026-1001',
      type: 'BUY',
      partyId: customer1.id,
      fromCurrency: 'USDT',
      toCurrency: 'INR',
      amountGiven: 5000,
      amountReceived: 443500,
      appliedRate: 88.70,
      fee: 500,
      totalProfit: 1500,
      paymentMethod: 'BANK',
      status: 'COMPLETED',
      notes: 'VIP USDT Buy Order Execution',
    },
  });

  console.log('Database successfully seeded with USDT & INR!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
