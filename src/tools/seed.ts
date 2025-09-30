import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const cats = [
    { slug: "plumbing", name: "Plumbing" },
    { slug: "electrical", name: "Electrical" },
    { slug: "hvac", name: "HVAC" }
  ];

  for (const c of cats) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, isActive: true },
      create: { slug: c.slug, name: c.name, isActive: true }
    });
  }

  const plumbing = await prisma.category.findUniqueOrThrow({
    where: { slug: "plumbing" }
  });

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
        {
          name: "Adjustable Wrench",
          purpose: "Loosen/tighten nuts",
          affiliate_url: "https://www.amazon.com/s?k=adjustable+wrench"
        }
      ],
      stepsJson: [
        "Turn off water supply at the shutoff valve.",
        "Inspect/replace flapper.",
        "Adjust float height or replace fill valve."
      ],
      status: "published"
    }
  });

  console.log("✅ Seeded categories and sample article");
}

main().finally(() => prisma.$disconnect());
