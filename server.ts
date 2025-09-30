// Simple, production-ready JS server (no TS, no Prisma)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const slugify = require('slugify');

const app = express();
app.use(cors());
app.use(express.json());

// --- DB connection (Render Postgres) ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('render.com')
    ? { rejectUnauthorized: false }
    : false
});

// --- Ensure tables exist and seed on first boot ---
async function ensureSchemaAndSeed() {
  // create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // seed defaults only if empty
  const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM categories;`);
  if (rows[0].count === 0) {
    const defaults = [
      'Plumbing', 'Electrical', 'Carpentry', 'Painting',
      'HVAC', 'Roofing', 'Landscaping', 'Cleaning'
    ];
    for (const name of defaults) {
      const slug = slugify(name, { lower: true, strict: true });
      await pool.query(
        `INSERT INTO categories (name, slug, is_active) VALUES ($1, $2, $3)
         ON CONFLICT (name) DO NOTHING;`,
        [name, slug, true]
      );
    }
    // also ensure unique slugs for safety
    await pool.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_idx ON categories(slug);`
    );
    console.log('Seeded default categories');
  } else {
    console.log('Categories already seeded, skipping');
  }
}

// --- Health check (use this in Render) ---
app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

// --- Categories API ---
app.get('/api/categories', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, slug, is_active, created_at
       FROM categories
       ORDER BY name ASC;`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.post('/api/categories', async (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'name required' });
    const slug = slugify(name, { lower: true, strict: true });
    const { rows } = await pool.query(
      `INSERT INTO categories (name, slug, is_active)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO NOTHING
       RETURNING id, name, slug, is_active, created_at;`,
      [name, slug, true]
    );
    if (rows.length === 0) return res.status(409).json({ error: 'Category already exists' });
    res.status(201).json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Simple Geni route (placeholder)
app.get('/api/geni', (_req, res) => {
  res.json({ message: '🤖 Geni Assistant Ready' });
});

// --- Start server ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, async () => {
  console.log(`FixGeni API listening on :${PORT}`);
  try {
    await ensureSchemaAndSeed();
  } catch (e) {
    console.error('Startup DB error:', e);
  }
});
