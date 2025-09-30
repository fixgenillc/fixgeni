// src/seed.ts
import { PrismaClient } from "@prisma/client";

/**
 * Idempotent seed for initial KB categories.
 * - Safe to run on every boot.
 * - Uses `upsert` by unique `slug`.
 */
export async function runSeed(prisma: PrismaClient) {
  const categories = [
    { slug: "plumbing", name: "Plumbing" },
    { slug: "electrical", name: "Electrical" },
    { slug: "hvac", name: "HVAC" },
    { slug: "appliances", name: "Appliances" },
    { slug: "roofing", name: "Roofing" },
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        isActive: true, // ensure active if it already exists
      },
      create: {
        slug: c.slug,
        name: c.name,
        isActive: true,
      },
    });
  }
}

/**
 * Seed only if there are no categories yet (or if override env is set).
 * Called from server.ts after the app starts listening so health checks pass fast.
 *
 * To force seeding on a running instance, set env:
 *   FORCE_SEED=true
 */
export async function seedIfNeeded(prisma: PrismaClient): Promise<boolean> {
  try {
    const force = (process.env.FORCE_SEED ?? "").toLowerCase() === "true";
    const count = await prisma.category.count();

    if (!force && count > 0) {
      // Already seeded — skip
      return false;
    }

    await runSeed(prisma);
    return true;
  } catch (err) {
    console.error("Seed failed:", err);
    throw err;
  }
}
