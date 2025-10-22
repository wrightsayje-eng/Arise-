/**
 * =============================================
 *  sqliteDatabase.js
 *  Async sqlite3 wrapper using `sqlite` + `sqlite3`
 *  Exports: initDB(), getRow(sql, params), all(sql, params), run(sql, params)
 * =============================================
 */

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';
import chalk from 'chalk';

const DB_PATH = process.env.SQLITE_PATH || './data/botDatabase.sqlite';

export let db; // exported live DB handle after init

export async function initDB() {
  // ensure folder exists
  const folder = path.dirname(DB_PATH);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  db = await open({
    filename: DB_PATH,
    driver: sqlite3.Database
  });

  // Create core tables (idempotent)
  await db.exec(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      vc_seconds INTEGER DEFAULT 0
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

    CREATE TABLE IF NOT EXISTS vc_joinlog (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      guild_id TEXT,
      event TEXT,
      ts INTEGER
    );

    CREATE TABLE IF NOT EXISTS infractions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      type TEXT,
      reason TEXT,
      created_at INTEGER
    );
  `);

  console.log(chalk.green('[SQLITE] Tables ensured (users, afk, lfsquad, vc_joinlog, infractions)'));
  return db;
}

// helpers
export async function getRow(sql, params = []) {
  return db.get(sql, params);
}
export async function all(sql, params = []) {
  return db.all(sql, params);
}
export async function run(sql, params = []) {
  return db.run(sql, params);
}
