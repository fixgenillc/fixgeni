import { Router } from "express";

const router = Router();

// Example Geni endpoint
router.get("/", (req, res) => {
  res.json({ message: "🤖 Geni Assistant Ready" });
});

export default router;
