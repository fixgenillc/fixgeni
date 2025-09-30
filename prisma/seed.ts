import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function seedIfNeeded() {
  // check if categories already exist
  const count = await prisma.category.count();
  if (count > 0) {
    return { seeded: false, count };
  }

  const categories = [
    { name: "Plumbing", slug: "plumbing", isActive: true },
    { name: "Electrical", slug: "electrical", isActive: true },
    { name: "Carpentry", slug: "carpentry", isActive: true },
    { name: "Painting", slug: "painting", isActive: true },
  ];

  await prisma.category.createMany({ data: categories });
  return { seeded: true, count: categories.length };
}

// if you want to run `npx ts-node prisma/seed.ts` manually
if (require.main === module) {
  seedIfNeeded()
    .then((res) => {
      console.log("Seeding complete:", res);
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seeding failed:", err);
      process.exit(1);
    });
}
