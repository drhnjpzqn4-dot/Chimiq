import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { db, shelfProductsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router: IRouter = Router();

const AddToShelfBodySchema = z.object({
  productName: z.string().min(1).max(200),
  ingredients: z.string().min(1).max(5000),
  routineSlot: z.enum(["morning", "evening", "both"]).optional().default("both"),
});

router.get("/shelf", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const products = await db
    .select()
    .from(shelfProductsTable)
    .where(eq(shelfProductsTable.userId, req.user.id))
    .orderBy(shelfProductsTable.addedAt);
  res.json({ products });
});

router.post("/shelf", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const parsed = AddToShelfBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const { productName, ingredients, routineSlot } = parsed.data;
  const [product] = await db
    .insert(shelfProductsTable)
    .values({ userId: req.user.id, productName, ingredients, routineSlot })
    .returning();
  res.json(product);
});

router.delete("/shelf/:id", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const id = parseInt(req.params.id as string, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  const deleted = await db
    .delete(shelfProductsTable)
    .where(and(eq(shelfProductsTable.id, id), eq(shelfProductsTable.userId, req.user.id)))
    .returning();
  if (deleted.length === 0) {
    res.status(404).json({ error: "Product not found on shelf" });
    return;
  }
  res.json({ success: true });
});

export default router;
