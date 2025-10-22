/**
 * ────────────────【💾 SQLite Database Module v0.2】────────────────
 * DexBot central database handler using sqlite3
 * Supports async operations and ensures DB folder/file existence
 * Handles errors gracefully without crashing the bot
 */

import sqlite3 from "sqlite3";
import { open } from "sqlite";
import fs from "fs";
import path from "path";

// Ensure the database folder exists
const dataDir = path.resolve("./root/data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// SQLite database file path
const DB_PATH = path.join(dataDir, "dexbot.sqlite");

// Open SQLite database with promise-based API
export const db = await open({
  filename: DB_PATH,
  driver: sqlite3.Database
});

// Initialize tables if they do not exist
await db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  join_leave_count INTEGER DEFAULT 0,
  last_join_leave INTEGER DEFAULT 0,
  vc_lock_expiration INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT,
  message TEXT,
  timestamp INTEGER
);
`);

console.log("💾 [DB] SQLite database ready at", DB_PATH);

/**
 * Helper function to log messages to DB
 */
export async function logToDB(type, message) {
  const timestamp = Date.now();
  try {
    await db.run(
      `INSERT INTO logs (type, message, timestamp) VALUES (?, ?, ?)`,
      [type, message, timestamp]
    );
  } catch (err) {
    console.error("❌ [DB] Log insertion failed:", err);
  }
}
