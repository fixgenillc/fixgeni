import path from "path";
import sqlite3 from "sqlite3";
import { open, Database } from "sqlite";

// Promisified sqlite wrapper via `sqlite` package inside sqlite3 (no extra dep needed here)
let dbPromise: Promise<Database> | null = null;

export function getDb() {
  if (!dbPromise) {
    const dbPath = path.resolve(process.cwd(), "data", "app.db");
    sqlite3.verbose();
    dbPromise = open({
      filename: dbPath,
      driver: sqlite3.Database
    });
  }
  return dbPromise;
}

export async function initSchema() {
  const db = await getDb();

  // categories table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      updatedAt TEXT
    );
  `);
}
