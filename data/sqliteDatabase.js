// sqliteDatabase.js v0.6 — DexVyBz
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';

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

    console.log(chalk.green('✅ DexBot SQLite database initialized at'), dbPath);

    try {
      await db.exec('PRAGMA foreign_keys = ON;');

      // ===== Ensure correct users table exists for leveling.js =====
      await db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT,
          xp_text INTEGER DEFAULT 0,
          level_text INTEGER DEFAULT 1,
          xp_vc INTEGER DEFAULT 0,
          level_vc INTEGER DEFAULT 1
        )
      `);
      console.log(chalk.green('[DB] users table ensured with leveling schema'));

      // ===== Other tables from your original schema =====
      await db.exec(`
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
      console.log(chalk.green('[DB] Other tables ensured'));

    } catch (err) {
      console.error(chalk.red('[DB] Failed to initialize tables:'), err);
    }

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
