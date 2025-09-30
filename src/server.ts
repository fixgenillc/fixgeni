import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { seedIfNeeded } from "../prisma/seed"; // make sure seed.ts is in /prisma

const app = express();
const prisma = new PrismaClient();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("tiny"));

// ---- health ----
app.get("/health", (_req, res) => res.status(200).send("ok"));
app.get("/_health", (_req, res) => res.status(200).send("ok"));

// ---- KB: list categories ----
app.get("/api/kb/categories", async (_req, res) => {
  try {
    const items = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true },
    });
    res.json({ items });
  } catch (err) {
    console.error("Error fetching categories:", err);
    res.status(500).json({ error: "internal error" });
  }
});

// ---- ADMIN: manual seed ----
// Requires header: X-Admin-Secret: <your secret from Render env>
app.post("/admin/seed", async (req, res) => {
  const header = req.header("X-Admin-Secret");
  const secret = process.env.ADMIN_SECRET || process.env.SECURITY_SECRET_KEY;
  if (!secret || header !== secret) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const result = await seedIfNeeded();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error("Manual seed failed:", err);
    res.status(500).json({ error: "seeding failed" });
  }
});

// ---- start server ----
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`FixGeni API listening on :${PORT}`);

  // AUTO-SEED on deploy (safe & idempotent)
  setImmediate(async () => {
    try {
      const { seeded } = await seedIfNeeded();
      if (seeded) {
        console.log("✅ Auto-seed completed.");
      } else {
        console.log("ℹ️ Auto-seed skipped (already seeded).");
      }
    } catch (err) {
      console.error("Seed on boot failed:", err);
    }
  });
});
