import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';

const app = express();
const prisma = new PrismaClient();

// --- middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan('tiny'));

// --- health
app.get('/health', (_req, res) => {
  res.status(200).send('ok');
});

// --- list categories
app.get('/api/kb/categories', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        subcategories: {
          orderBy: { updatedAt: 'desc' },
          include: {
            _count: { select: { businesses: true } }
          }
        }
      }
    });

    const items = categories.map(c => ({
      id: c.id,
      name: c.name,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      subcategories: c.subcategories.map(s => ({
        id: s.id,
        name: s.name,
        businessCount: s._count.businesses,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }))
    }));

    res.json({ items });
  } catch (err) {
    console.error('GET /api/kb/categories error:', err);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// --- seed endpoint
app.get('/api/seed', async (req: Request, res: Response) => {
  try {
    const provided = (req.query.key as string) || '';
    const expected = process.env.SEED_KEY || '';
    if (!expected) {
      return res.status(400).json({ error: 'SEED_KEY not set in environment' });
    }
    if (provided !== expected) {
      return res.status(401).json({ error: 'Unauthorized: bad seed key' });
    }

    const seeded = await seed();
    res.json({ ok: true, ...seeded });
  } catch (err) {
    console.error('GET /api/seed error:', err);
    res.status(500).json({ error: 'Seed failed' });
  }
});

// --- start server
const port = process.env.PORT ? Number(process.env.PORT) : 10000;
app.listen(port, async () => {
  console.log(`FixGeni API listening on :${port}`);

  try {
    const count = await prisma.category.count();
    if (count === 0) {
      console.log('No categories found → running initial seed…');
      const result = await seed();
      console.log('Initial seed done:', result);
    } else {
      console.log(`Categories already present: ${count} (skip auto-seed)`);
    }
  } catch (e) {
    console.warn('Auto-seed check skipped due to error:', e);
  }
});

// --- seed logic
async function seed() {
  const categories = [
    { name: 'Plumbing' },
    { name: 'Electrical' },
    { name: 'HVAC' },
  ];

  const catRecords = [];
  for (const c of categories) {
    const rec = await prisma.category.upsert({
      where: { name: c.name },
      update: { name: c.name },
      create: { name: c.name },
    });
    catRecords.push(rec);
  }

  const subs = [
    { name: 'Leaks & Fixtures', categoryName: 'Plumbing' },
    { name: 'Water Heaters',    categoryName: 'Plumbing' },
    { name: 'Lighting',         categoryName: 'Electrical' },
    { name: 'Outlets',          categoryName: 'Electrical' },
    { name: 'Thermostats',      categoryName: 'HVAC' },
    { name: 'Air Quality',      categoryName: 'HVAC' },
  ];

  const subRecords = [];
  for (const s of subs) {
    const cat = catRecords.find(c => c.name === s.categoryName)!;
    const rec = await prisma.subCategory.findFirst({
      where: { name: s.name, categoryId: cat.id }
    }) || await prisma.subCategory.create({
      data: { name: s.name, categoryId: cat.id },
    });
    subRecords.push(rec);
  }

  const bizData = [
    { name: 'QuickFix Plumbing', description: 'Emergency leaks & fixture repair', subName: 'Leaks & Fixtures' },
    { name: 'BrightSpark Electric', description: 'Lighting installs & upgrades', subName: 'Lighting' },
  ];

  for (const b of bizData) {
    const sub = subRecords.find(s => s.name === b.subName);
    if (!sub) continue;
    await prisma.business.upsert({
      where: { name: b.name },
      update: { description: b.description ?? null, subcategoryId: sub.id },
      create: { name: b.name, description: b.description ?? null, subcategoryId: sub.id },
    });
  }

  const totalCats = await prisma.category.count();
  const totalSubs = await prisma.subCategory.count();
  const totalBiz  = await prisma.business.count();
  return { totalCats, totalSubs, totalBiz };
}
