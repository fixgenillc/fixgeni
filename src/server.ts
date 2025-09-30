import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";
import { seedIfNeeded } from "./seed";

const app = express();
const prisma = new PrismaClient();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

/** Health checks */
app.get("/health", (_req, res) => res.status(200).send("ok"));
app.get("/_health", (_req, res) => res.status(200).send("ok"));

/** Seed status (includes updatedAt) */
app.get("/api/kb/seed-status", async (_req, res) => {
  try {
    const count = await prisma.category.count();
    const latest = await prisma.category.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { id: true, slug: true, name: true, updatedAt: true },
    });
    res.json({ categoryCount: count, latest });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "seed-status failed" });
  }
});

/** Public categories (includes updatedAt) */
app.get("/api/kb/categories", async (_req, res) => {
  try {
    const items = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        slug: true,
        name: true,
        createdAt: true,
        updatedAt: true, // <-- kept
      },
    });
    res.json({ items });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "categories fetch failed" });
  }
});

/** Boot */
const port = Number(process.env.PORT || 10000);
app.listen(port, async () => {
  console.log(`FixGeni API listening on :${port}`);

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("DB connection verified");
  } catch (e) {
    console.error("DB connection failed", e);
  }

  // Idempotent auto-seed on boot
  try {
    const didSeed = await seedIfNeeded(prisma);
    console.log(didSeed ? "Seed completed" : "Seed skipped");
  } catch (e) {
    console.error("Seed error", e);
  }
});

/** (Optional) last-resort 404 so bad paths don’t look like crashes */
app.use((_req, res) => res.status(404).json({ error: "Not found" }));
