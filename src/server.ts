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

// --- list categories (with subcategories and business counts)
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

    // shape a simpler payload
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

/**
 * Seed endpoint (GET for simplicity).
 * Protection: requires a query key that must match SEED_KEY env var.
 * Example to run in your browser:
 *   https://YOUR-SERVICE.onrender.com/api/seed?key=YOUR_SEED_KEY
 *
 * If data already exists, it won't duplicate—upserts are used.
 */
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

  // optional: auto-seed on boot ONLY if DB has zero categories
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

// --- seed logic (kept in the same file for simplicity)
async function seed() {
  // base categories
  const categories = [
    { name: 'Plumbing' },
    { name: 'Electrical' },
    { name: 'HVAC' },
  ];

  // upsert categories
  const catRecords = [];
  for (const c of categories) {
    const rec = await prisma.category.upsert({
      where: { name: c.name },
      update: { name: c.name }, // touching name keeps unique constraint happy
      create: { name: c.name },
    });
    catRecords.push(rec);
  }

  // subcategories for each
  const subs: Array<{ name: string; categoryName: string }> = [
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
    const rec = await prisma.subCategory.upsert({
      where: {
        // composite uniqueness via name+categoryId is not declared,
        // so just use name alone and “attach” by update/create.
        // If you need strict uniqueness within a category, add @@unique([name, categoryId]) in schema.
        id: 0, // dummy so we can use create/update paths—upsert needs a unique where
      } as any,
      update: {},
      create: { name: s.name, categoryId: cat.id },
    }).catch(async () => {
      // fallback: if unique constraint only on name, connect or create-like behavior
      const existing = await prisma.subCategory.findFirst({
        where: { name: s.name, categoryId: cat.id }
      });
      return existing ?? prisma.subCategory.create({ data: { name: s.name, categoryId: cat.id } });
    });

    subRecords.push
