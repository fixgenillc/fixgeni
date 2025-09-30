import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

/**
 * Idempotent category seed data.
 * You can add more later—just keep slugs stable.
 */
const CATEGORY_SEED: Array<{ name: string; slug: string }> = [
  { name: "Plumbing",   slug: "plumbing" },
  { name: "Electrical", slug: "electrical" },
  { name: "HVAC",       slug: "hvac" },
  { name: "Carpentry",  slug: "carpentry" },
  { name: "Painting",   slug: "painting" },
];

/**
 * Optional sample article so your API shows something right away.
 * Safe to run repeatedly because we upsert by slug.
 */
const KB_SEED: Array<Prisma.KbArticleUncheckedCreateInput> = [
  {
    slug: "fix-running-toilet",
    title: "Fix a Running Toilet (Fill Valve & Flapper)",
    categoryId: 0, // replaced at runtime
    content: "<h2>Overview</h2><p>Check flapper, chain, and fill valve height.</p>",
    difficulty: "easy",
    timeEstimateMin: 30,
    toolsJson: [
      { name: "Adjustable Wrench", purpose: "Loosen/tighten nuts", affiliate_url: "https://www.amazon.com/s?k=adjustable+wrench" },
      { name: "Replacement Flapper", purpose: "If the old one leaks", affiliate_url: "https://www.amazon.com/s?k=toilet+flapper" }
    ] as any,
    stepsJson: [
      "Turn off water at the shutoff valve.",
      "Flush to empty tank; remove lid.",
      "Inspect/replace flapper and adjust chain length.",
      "Adjust float height or replace fill valve if needed.",
      "Turn water on, test for 5 minutes."
    ] as any,
    status: "published",
  },
];

/**
 * Seed categories with upsert (idempotent).
 */
async function seedCategories() {
  for (const c of CATEGORY_SEED) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, isActive: true },
      create: { slug: c.slug, name: c.name, isActive: true },
    });
  }
}

/**
 * Seed KB articles after categories exist.
 */
async function seedKbArticles() {
  // look up category ids by slug so we can link articles
  const categories = await prisma.category.findMany({
    where: { slug: { in: CATEGORY_SEED.map(c => c.slug) } },
    select: { id: true, slug: true },
  });
  const bySlug = Object.fromEntries(categories.map(c => [c.slug, c.id]));

  // Example: put “fix-running-toilet” in Plumbing
  for (const a of KB_SEED) {
    const article = { ...a };
    // choose a category — change this mapping as you add more seed items
    article.categoryId = bySlug["plumbing"];
    await prisma.kbArticle.upsert({
      where: { slug: article.slug },
      update: {
        title: article.title,
        content: article.content,
        status: article.status,
        difficulty: article.difficulty,
        timeEstimateMin: article.timeEstimateMin,
        toolsJson: article.toolsJson as any,
        stepsJson: article.stepsJson as any,
        categoryId: article.categoryId,
      },
      create: article,
    });
  }
}

/**
 * Public function your server can import to seed on boot.
 * - Idempotent
 * - Fast (does nothing if already seeded)
 */
export async function seedIfNeeded(): Promise<{ seeded: boolean }> {
  const count = await prisma.category.count();
  if (count > 0) {
    return { seeded: false };
  }

  await seedCategories();
  await seedKbArticles();
  return { seeded: true };
}

/**
 * Allow running manually (e.g., “npm run seed” locally).
 */
if (require.main === module) {
  seedIfNeeded()
    .then((r) => console.log(r.seeded ? "✅ Seeded." : "ℹ️ Already seeded, skipped."))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
