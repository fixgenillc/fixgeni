import { getDb, initSchema } from "./db";
import slugify from "slugify";

const DEFAULT_CATEGORIES: Array<{
  name: string;
  description?: string;
  icon?: string;
  isActive?: boolean;
}> = [
  {
    name: "Plumbing",
    description: "Leaks, clogs, fixtures, and pipework.",
    icon: "🛠️"
  },
  {
    name: "Electrical",
    description: "Outlets, lighting, breakers, and wiring.",
    icon: "💡"
  },
  {
    name: "Appliances",
    description: "Installations, diagnostics, and repairs.",
    icon: "🔧"
  },
  {
    name: "HVAC",
    description: "Heating, ventilation, and air conditioning.",
    icon: "🌡️"
  },
  {
    name: "General",
    description: "Miscellaneous and cross-category issues.",
    icon: "📦"
  }
];

export async function runSeed() {
  await initSchema();
  const db = await getDb();

  for (const c of DEFAULT_CATEGORIES) {
    const slug = slugify(c.name, { lower: true, strict: true });
    const existing = await db.get(`SELECT id FROM categories WHERE slug = ?;`, slug);
    if (!existing) {
      await db.run(
        `INSERT INTO categories (name, slug, description, icon, isActive)
         VALUES (?, ?, ?, ?, ?);`,
        c.name,
        slug,
        c.description ?? null,
        c.icon ?? null,
        c.isActive === false ? 0 : 1
      );
      console.log(`Seeded category: ${c.name}`);
    }
  }
}

// Allow direct execution (e.g., npm run seed)
if (require.main === module) {
  runSeed()
    .then(() => {
      console.log("✅ Seed complete");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seed failed", err);
      process.exit(1);
    });
}
