// 💾 sqliteDatabase.js v0.2
// DexBot persistent data layer — pure sqlite3 implementation.

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

sqlite3.verbose();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;

export async function initDatabase() {
  if (db) return db;

  const dbPath = path.join(__dirname, 'dexbot.sqlite'); // stored in /data
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  console.log('✅ DexBot SQLite database initialized at', dbPath);

  // Core table setup — add any others here.
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
}

export function getDB() {
  if (!db) throw new Error('❌ Database not initialized — call initDatabase() first.');
  return db;
}
