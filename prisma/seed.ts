import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'apex-ai' },
    update: {
      name: 'Apex AI',
      brandId: '360e85c5-b81b-474d-87a2-a33fae141eca',
      businessUnitId: 'ea8b30a5-57c4-4fe9-8fc1-b9260d9f93c1',
      defaultMtGroup: '20900\\STANDART.USD',
      defaultLeverage: 100,
      isActive: true,
    },
    create: {
      slug: 'apex-ai',
      name: 'Apex AI',
      brandId: '360e85c5-b81b-474d-87a2-a33fae141eca',
      businessUnitId: 'ea8b30a5-57c4-4fe9-8fc1-b9260d9f93c1',
      defaultMtGroup: '20900\\STANDART.USD',
      defaultLeverage: 100,
      isActive: true,
    },
  });

  console.log('Seeded tenant:', tenant.slug, tenant.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
