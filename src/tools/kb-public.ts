import { Router, Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
export const kbPublicRouter = Router();

/** List categories (active) */
kbPublicRouter.get("/categories", async (_req: Request, res: Response) => {
  const items = await prisma.category.findMany({
    where: { isActive: true },
    select: { id: true, slug: true, name: true }
  });
  res.json({ items });
});

/** Get article by slug */
kbPublicRouter.get("/articles/:slug", async (req: Request, res: Response) => {
  const { slug } = req.params;
  const article = await prisma.kbArticle.findUnique({ where: { slug } });
  if (!article) return res.status(404).json({ error: "not_found" });
  res.json({ article });
});
