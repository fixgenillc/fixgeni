import { pool } from "./db.js";

async function seed() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL
    );
  `);

  const categories = [
    { slug: "plumbing", name: "Plumbing" },
    { slug: "electrical", name: "Electrical" },
    { slug: "hvac", name: "HVAC" }
  ];

  for (const c of categories) {
    await pool.query(
      `INSERT INTO categories (slug, name)
       VALUES ($1, $2)
       ON CONFLICT (slug) DO NOTHING;`,
      [c.slug, c.name]
    );
  }

  console.log("✅ Seed complete");
  await pool.end();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
