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
