// src/seed.ts
import { PrismaClient } from "@prisma/client";

/**
 * Seeds base data the first time the app runs.
 * Returns true if we seeded, false if data already existed.
 */
export async function seedIfNeeded(prisma: PrismaClient): Promise<boolean> {
  // Only seed if there are no categories yet
  const count = await prisma.category.count();
  if (count > 0) return false;

  console.log("⏳ Seeding base categories...");

  const categories = [
    { slug: "plumbing", name: "Plumbing" },
    { slug: "electrical", name: "Electrical" },
    { slug: "hvac", name: "HVAC" },
  ];

  await prisma.category.createMany({
    data: categories.map((c) => ({ ...c, isActive: true })),
    skipDuplicates: true,
  });

  // Optional: add one sample KB article
  const plumbing = await prisma.category.findUnique({ where: { slug: "plumbing" } });
  if (plumbing) {
    await prisma.kbArticle.upsert({
      where: { slug: "fix-running-toilet" },
      update: {},
      create: {
        slug: "fix-running-toilet",
        title: "Fix a Running Toilet (Fill Valve & Flapper)",
        categoryId: plumbing.id,
        content: "<h2>Overview</h2><p>Check flapper, chain, fill valve.</p>",
        difficulty: "easy",
        timeEstimateMin: 30,
        toolsJson: [
          { name: "Adjustable Wrench", purpose: "Loosen/tighten nuts", affiliate_url: "https://www.amazon.com/s?k=adjustable+wrench" },
        ] as any,
        stepsJson: [
          "Turn off water supply at the shutoff valve.",
          "Inspect/replace flapper.",
          "Adjust float height or replace fill valve.",
        ] as any,
        status: "published",
      },
    });
  }

  console.log("✅ Seed done");
  return true;
}
