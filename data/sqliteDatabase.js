// 💾 sqliteDatabase.js v0.5 — Full schema for leveling, VC tracking, whitelist, infractions, etc.
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

sqlite3.verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbPromise;

export function initDatabase() {
  if (dbPromise) return dbPromise;

  const dbPath = path.join(__dirname, 'dexbot.sqlite');

  dbPromise = (async () => {
    const db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });

    console.log('✅ DexBot SQLite database initialized at', dbPath);

    // Full schema
    await db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT,
        joinedAt INTEGER,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 0,
        vc_seconds INTEGER DEFAULT 0
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
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        module TEXT NOT NULL,
        UNIQUE(user_id, module)
      );

      CREATE TABLE IF NOT EXISTS infractions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        type TEXT,
        reason TEXT,
        created_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS afk (
        user_id TEXT PRIMARY KEY,
        reason TEXT,
        expires_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS lfsquad (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        game TEXT,
        message TEXT,
        created_at INTEGER
      );
    `);

    return db;
  })();

  return dbPromise;
}

export async function getDatabase() {
  if (!dbPromise) throw new Error('❌ Database not initialized — call initDatabase() first.');
  return dbPromise;
}

export async function runQuery(sql, params = []) {
  const db = await getDatabase();
  return db.all(sql, params);
}
