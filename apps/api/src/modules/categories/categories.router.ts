import { Router } from 'express';
import { db } from '../../db/client.js';
import { categories } from '../../db/schema/index.js';
import { asc } from 'drizzle-orm';

export const categoriesRouter = Router();

categoriesRouter.get('/', async (_req, res, next) => {
  try {
    const rows = await db
      .select()
      .from(categories)
      .orderBy(asc(categories.sortOrder), asc(categories.name));

    // Build tree from flat list
    type CategoryRow = (typeof rows)[number];
    type CategoryNode = CategoryRow & { children: CategoryNode[] };

    const map = new Map<string, CategoryNode>();
    for (const row of rows) map.set(row.id, { ...row, children: [] });

    const roots: CategoryNode[] = [];
    for (const node of map.values()) {
      if (node.parentId && map.has(node.parentId)) {
        map.get(node.parentId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    res.json({ data: roots });
  } catch (err) {
    next(err);
  }
});
