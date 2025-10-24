// 💾 sqliteDatabase.js v0.4
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

sqlite3.verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbPromise; // Promise to ensure single async initialization

export function initDatabase() {
  if (dbPromise) return dbPromise;

  const dbPath = path.join(__dirname, 'dexbot.sqlite');

  dbPromise = (async () => {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    console.log('✅ DexBot SQLite database initialized at', dbPath);

    // Core table setup
    await db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT,
        joinedAt INTEGER,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 0
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

      CREATE TABLE IF NOT EXISTS whitelist (
        user_id TEXT PRIMARY KEY
      );
    `);

    return db;
  })();

  return dbPromise;
}

export async function getDatabase() {
  if (!dbPromise) {
    throw new Error('❌ Database not initialized — call initDatabase() first.');
  }
  return dbPromise;
}

export async function runQuery(sql, params = []) {
  const db = await getDatabase();
  return db.all(sql, params);
}
