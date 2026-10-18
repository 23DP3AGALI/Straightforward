import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { closeDatabase, db } from "./config/db.js";
import { ensureBootstrapAdmin } from "./controllers/authController.js";
import apiRouter from "./routes/api.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must contain at least 32 characters.");
}

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_ORIGIN?.split(",") || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));
app.use("/api", apiRouter);
app.use((req, res) => res.status(404).json({ error: "Route not found." }));
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  const status = error.status || (["ER_DUP_ENTRY", "ER_NO_REFERENCED_ROW_2", "ER_ROW_IS_REFERENCED_2"].includes(error.code) ? 409 : 500);
  res.status(status).json({ error: status === 500 ? "Internal server error." : error.message });
});

const port = Number(process.env.PORT || 3000);
try {
  await db.query("SELECT 1");
  await ensureBootstrapAdmin();
  app.listen(port, () => console.log(`API listening on port ${port}`));
} catch (error) {
  console.error("Could not start the API:", error.message);
  process.exitCode = 1;
  await closeDatabase();
}