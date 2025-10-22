// ────────────────────────────────
// 【ＤｅＸ】 SQLite Database Connection
// ────────────────────────────────

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// Define database file path inside your project
const dbFilePath = path.resolve("./data/session18.sqlite");

// Ensure the folder exists
const dbFolder = path.dirname(dbFilePath);
if (!fs.existsSync(dbFolder)) fs.mkdirSync(dbFolder, { recursive: true });

// Open SQLite database (creates file if it doesn't exist)
const db = new Database(dbFilePath, { verbose: console.log });

// Optional: initialize tables if they don’t exist
const initTables = () => {
  db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0
    )
  `).run();

  db.prepare(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    )
  `).run();
};

// Initialize tables
initTables();

console.log("🟢 [SQLITE] Database connected and ready");

export default db;
