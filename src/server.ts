// src/server.ts
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";
import { seedIfNeeded } from "./seed";

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT ? Number(process.env.PORT) : 10000;

app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("tiny"));

// --- Health endpoints (used by Render) ---
app.get("/health", (_req: Request, res: Response) => res.status(200).send("ok"));
app.get("/_health", (_req: Request, res: Response) => res.status(200).json({ ok: true }));

// --- Simple API: list KB categories ---
app.get("/api/kb/categories", async (_req: Request, res: Response) => {
  try {
    const cats = await prisma.category.findMany({
      select: { id: true, slug: true, name: true, isActive: true, createdAt: true, updatedAt: true },
      orderBy: { name: "asc" },
    });
    res.json({ items: cats });
  } catch (err) {
    console.error("GET /api/kb/categories error:", err);
    res.status(500).json({ error: "Failed to load categories" });
  }
});

// (Optional) quick check route to see if seed is done
app.get("/api/kb/seed-status", async (_req, res) => {
  try {
    const count = await prisma.category.count();
    res.json({ categoryCount: count });
  } catch (e) {
    res.status(500).json({ error: "status check failed" });
  }
});

// --- Start server, then seed in the background so boot is fast ---
app.listen(PORT, () => {
  console.log(`FixGeni API listening on :${PORT}`);
  // Kick off background seed (won't block health checks)
  seedIfNeeded(prisma)
    .then((didSeed) => {
      if (didSeed) console.log("✅ Seed completed");
      else console.log("ℹ️ Seed skipped (already seeded)");
    })
    .catch((e) => console.error("❌ Seed error", e));
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
