import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import geniRoutes from "./routes/geni.js";
import categoryRoutes from "./routes/categories.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.get("/health", (_req, res) => res.send("ok"));
app.use("/api/geni", geniRoutes);
app.use("/api/categories", categoryRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
