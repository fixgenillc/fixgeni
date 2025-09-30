import express from "express";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();

app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.send("ok");
});

// Get all categories
app.get("/api/kb/categories", async (req, res) => {
  const categories = await prisma.category.findMany();
  res.json(categories);
});

// Seed route (TEMP: you can remove later)
app.post("/api/kb/seed", async (req, res) => {
  try {
    await prisma.category.createMany({
      data: [
        { name: "Plumbing" },
        { name: "Electrical" },
        { name: "Roofing" },
      ],
      skipDuplicates: true,
    });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Seeding failed" });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`FixGeni API listening on port ${PORT}`);
});
