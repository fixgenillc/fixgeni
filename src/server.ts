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
// --- Admin Exec (temporary "shell") ---
import express from "express";
import { runAllowed, getAllowed } from "./tools/adminExec";

const ADMIN_EXEC_ENABLED = process.env.ADMIN_EXEC_ENABLED === "1";

if (ADMIN_EXEC_ENABLED) {
  const ADMIN_TOKEN = process.env.ADMIN_EXEC_TOKEN || "";
  const adminRouter = express.Router();

  // Only accept JSON
  adminRouter.use(express.json({ limit: "32kb" }));

  // Simple auth via header token
  adminRouter.use((req, res, next) => {
    const token = String(req.header("x-admin-token") || "");
    if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
      return res.status(401).json({ error: "unauthorized" });
    }
    next();
  });

  // List allowed commands (for sanity)
  adminRouter.get("/commands", (_, res) => {
    res.json({ allowed: getAllowed() });
  });

  // Run one allowed command
  adminRouter.post("/exec", async (req, res) => {
    try {
      const cmd = req.body?.cmd as ReturnType<typeof getAllowed>[number];
      if (!cmd || !getAllowed().includes(cmd)) {
        return res.status(400).json({ error: "cmd must be one of " + getAllowed().join(", ") });
      }
      const { stdout, stderr } = await runAllowed(cmd);
      res.json({ ok: true, cmd, stdout, stderr });
    } catch (e: any) {
      res.status(500).json({ ok: false, error: e?.err?.message || "exec failed", stdout: e?.stdout, stderr: e?.stderr });
    }
  });

  // Mount at /_admin
  // Example: POST https://<your-service>.onrender.com/_admin/exec
  app.use("/_admin", adminRouter);
}
// --- end Admin Exec ---
