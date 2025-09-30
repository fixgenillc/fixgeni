import { Router } from "express";
import { getDb } from "../db";
import slugify from "slugify";

const router = Router();

// GET /api/categories
router.get("/", async (_req, res) => {
  try {
    const db = await getDb();
    const rows = await db.all(
      `SELECT id, name, slug, description, icon, isActive, createdAt, updatedAt
       FROM categories
       ORDER BY name ASC;`
    );
    res.json(rows);
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Failed to list categories" });
  }
});

// POST /api/categories
router.post("/", async (req, res) => {
  try {
    const { name, description, icon, isActive } = req.body || {};
    if (!name || typeof name !== "string") {
      return res.status(400).json({ error: "name is required" });
    }
    const slug =
      typeof req.body?.slug === "string" && req.body.slug.trim()
        ? req.body.slug.trim()
        : slugify(name, { lower: true, strict: true });

    const db = await getDb();
    await db.run(
      `INSERT INTO categories (name, slug, description, icon, isActive)
       VALUES (?, ?, ?, ?, ?);`,
      name,
      slug,
      description ?? null,
      icon ?? null,
      isActive === 0 || isActive === false ? 0 : 1
    );

    const row = await db.get(
      `SELECT id, name, slug, description, icon, isActive, createdAt, updatedAt
       FROM categories WHERE slug = ?;`,
      slug
    );

    res.status(201).json(row);
  } catch (err: any) {
    console.error(err);
    if (String(err?.message || "").includes("UNIQUE constraint failed")) {
      return res.status(409).json({ error: "slug already exists" });
    }
    res.status(500).json({ error: err?.message || "Failed to create category" });
  }
});

export default router;
