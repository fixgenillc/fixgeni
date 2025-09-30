import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { PrismaClient } from "@prisma/client";
import { healthRouter } from "./tools/health.js";
import { kbPublicRouter } from "./tools/kb-public.js";

const app = express();
const prisma = new PrismaClient();

// middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// health check (fast)
app.use("/", healthRouter);

// public KB endpoints
app.use("/api/kb", kbPublicRouter);

// basic error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "internal_error" });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

// warm-up DB lazily (non-blocking)
(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log("DB connection verified");
  } catch (e) {
    console.warn("DB warmup failed (continuing):", e);
  }
})();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`FixGeni API listening on :${PORT}`);
});
import express from "express";
import { prisma } from "./prisma"; // adjust path if needed

const app = express();

app.use(express.json());

// --- Seed endpoint ---
app.post("/admin/seed", async (req, res) => {
  const key = req.headers["x-security-key"];
  if (key !== process.env.SECURITY_SECRET_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }

  try {
    const categories = [
      { name: "Plumbing", description: "Fixes for pipes, leaks, etc." },
      { name: "Electrical", description: "Wiring, power issues, and repairs." },
      { name: "Appliances", description: "Fridge, oven, washer, dryer fixes." },
    ];

    for (const cat of categories) {
      await prisma.kbCategory.upsert({
        where: { name: cat.name },
        update: {},
        create: cat,
      });
    }

    res.json({ status: "ok", seeded: categories.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Seed failed" });
  }
});

// ... keep your existing routes and listen()
