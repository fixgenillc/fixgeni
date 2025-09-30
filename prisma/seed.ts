import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  // mirrors the seed() in server.ts
  // keep one source of truth if possible—either here OR in server.ts
  const categories = [{ name: 'Plumbing' }, { name: 'Electrical' }, { name: 'HVAC' }];

  const catRecords = [];
  for (const c of categories) {
    const rec = await prisma.category.upsert({
      where: { name: c.name },
      update: { name: c.name },
      create: { name: c.name },
    });
    catRecords.push(rec);
  }

  const subs: Array<{ name: string; categoryName: string }> = [
    { name: 'Leaks & Fixtures', categoryName: 'Plumbing' },
    { name: 'Water Heaters',    categoryName: 'Plumbing' },
    { name: 'Lighting',         categoryName: 'Electrical' },
    { name: 'Outlets',          categoryName: 'Electrical' },
    { name: 'Thermostats',      categoryName: 'HVAC' },
    { name: 'Air Quality',      categoryName: 'HVAC' },
  ];

  for (const s of subs) {
    const cat = catRecords.find(c => c.name === s.categoryName)!;
    await prisma.subCategory.create({
      data: { name: s.name, categoryId: cat.id },
    }).catch(async () => {
      const existing = await prisma.subCategory.findFirst({
        where: { name: s.name, categoryId: cat.id }
      });
      if (!existing) {
        await prisma.subCategory.create({ data: { name: s.name, categoryId: cat.id } });
      }
    });
  }

  const totalCats = await prisma.category.count();
  const totalSubs = await prisma.subCategory.count();
  const totalBiz  = await prisma.business.count();
  console.log({ totalCats, totalSubs, totalBiz });
}

run().finally(() => prisma.$disconnect());
