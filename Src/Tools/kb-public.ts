import { Router } from 'express';
import type { PrismaClient } from '@prisma/client';

export function kbRouter(prisma: PrismaClient) {
  const r = Router();

  r.get('/categories', async (_req, res) => {
    const rows = await prisma.category.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
    res.json({ items: rows, total: rows.length });
  });

  r.get('/articles', async (req, res) => {
    const page = Math.max(parseInt(String(req.query.page || '1'), 10), 1);
    const pageSize = Math.min(Math.max(parseInt(String(req.query.pageSize || '20'), 10), 1), 50);
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.kbArticle.findMany({
        where: { status: 'published' },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          id: true, slug: true, title: true, categoryId: true,
          timeEstimateMin: true, difficulty: true, createdAt: true, updatedAt: true
        }
      }),
      prisma.kbArticle.count({ where: { status: 'published' } })
    ]);

    res.json({ items, page, pageSize, total });
  });

  return r;
}
