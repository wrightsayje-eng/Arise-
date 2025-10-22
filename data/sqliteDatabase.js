// 💾 sqliteDatabase.js v0.3
// DexBot persistent data layer — pure sqlite3 implementation with guaranteed async initialization.

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

sqlite3.verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbPromise; // Promise to ensure single async initialization

/**
 * Initialize the DexBot SQLite database.
 * Creates necessary tables if they don't exist.
 * Returns a ready-to-use database instance.
 */
export function initDatabase() {
  if (dbPromise) return dbPromise;

  const dbPath = path.join(__dirname, 'dexbot.sqlite');

  dbPromise = (async () => {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    console.log('✅ DexBot SQLite database initialized at', dbPath);

    // Core table setup — add more tables here as needed
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT,
        joinedAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS vc_activity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        channelId TEXT,
        joinedAt INTEGER,
        leftAt INTEGER
      );

      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        event TEXT,
        details TEXT,
        timestamp INTEGER
      );
    `);

    return db;
  })();

  return dbPromise;
}

/**
 * Get the initialized database instance.
 * Throws an error if initDatabase() hasn't been called yet.
 */
export async function getDatabase() {
  if (!dbPromise) {
    throw new Error('❌ Database not initialized — call initDatabase() first.');
  }
  return dbPromise;
}

/**
 * Run a query on the DexBot database.
 * Returns an array of results.
 */
export async function runQuery(sql, params = []) {
  const db = await getDatabase();
  return db.all(sql, params);
}
