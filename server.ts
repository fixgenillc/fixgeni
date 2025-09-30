import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";

import categoriesRouter from "./routes/categories";
import geniRouter from "./routes/geni";

// Ensure the data directory exists (for SQLite file)
import fs from "fs";
const dataDir = path.resolve(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Health checks (both supported)
app.get("/health", (_req, res) => res.json({ ok: true }));
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// Routes
app.use("/api/categories", categoriesRouter);
app.use("/api/geni", geniRouter);

// Fallback root
app.get("/", (_req, res) => {
  res.json({
    name: "FixGeni API",
    message: "✅ Server is running",
    docs: {
      health: "/health",
      categories: {
        list: "/api/categories",
        create: "POST /api/categories",
        seed: "POST /admin/seed"
      },
      geni: "/api/geni"
    }
  });
});

// Manual seed endpoint (optional)
import { runSeed } from "./seed";
app.post("/admin/seed", async (_req, res) => {
  try {
    await runSeed();
    res.json({ ok: true, seeded: true });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ ok: false, error: err?.message || "Seed failed" });
  }
});

const PORT = Number(process.env.PORT || 10000);
app.listen(PORT, () => {
  console.log(`FixGeni API listening on :${PORT}`);
});
