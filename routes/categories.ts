import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

router.get("/", async (_req, res) => {
  const { rows } = await pool.query("SELECT * FROM categories ORDER BY name ASC;");
  res.json(rows);
});

export default router;
