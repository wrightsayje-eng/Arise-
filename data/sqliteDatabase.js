// sqliteDatabase.js v0.7 — DexVyBz with Doorman support
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

      // ===== users table (leveling) =====
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
      console.log(chalk.green('[DB] users table ensured'));

      // ===== Other existing tables =====
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

      // ===== Doorman module tables =====
      await db.exec(`
        CREATE TABLE IF NOT EXISTS doormanPasswords (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          password TEXT UNIQUE,
          description TEXT,
          maxUses INTEGER,
          uses INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS doormanUsers (
          user_id TEXT PRIMARY KEY,
          password_id INTEGER,
          grantedAt INTEGER,
          FOREIGN KEY(password_id) REFERENCES doormanPasswords(id)
        );
      `);
      console.log(chalk.green('[DB] Doorman tables ensured'));

      // ===== Pre-fill default passwords =====
      const existing = await db.all('SELECT * FROM doormanPasswords');
      if (existing.length === 0) {
        await db.run(`
          INSERT INTO doormanPasswords (password, description, maxUses, uses) VALUES
            ('I love boobies', 'Normal VC perms', 15, 0),
            ('Fuck Pogi', 'Normal VC perms + mute/deafen', 6, 0),
            ('Loyalty Equals Royalty', 'Normal VC perms + mute/deafen + drag ability', 6, 0)
        `);
        console.log(chalk.green('[DB] Doorman default passwords inserted'));
      }

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
