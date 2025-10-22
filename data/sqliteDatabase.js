// ✨ Dex Database Handler v0.2
// 📁 File: /root/data/sqliteDatabase.js
// 🧱 Engine: sqlite3 (Async Mode)
// 🧠 Purpose: Handles persistent storage for Dex’s data (users, guilds, etc.)

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import fs from 'fs';

// 🗂️ Ensure the /data directory exists
const dataDir = path.resolve('./data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

// 📌 Define DB path
const dbPath = path.join(dataDir, 'dexbot.sqlite');

// ⚡ Open SQLite connection (async)
export async function getDatabase() {
  const db = await open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  // 🧱 Initialize tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      lastSeen INTEGER
    );

    CREATE TABLE IF NOT EXISTS guilds (
      id TEXT PRIMARY KEY,
      name TEXT,
      prefix TEXT DEFAULT '$',
      joinedAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS vc_activity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      guildId TEXT,
      joinedAt INTEGER,
      leftAt INTEGER
    );

    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      guildId TEXT,
      reason TEXT,
      timestamp INTEGER
    );
  `);

  console.log('✅ [DexDB] SQLite database ready →', dbPath);
  return db;
}

// 🔁 Safe query function
export async function runQuery(query, params = []) {
  const db = await getDatabase();
  try {
    return await db.run(query, params);
  } catch (error) {
    console.error('❌ [DexDB] Query error:', error.message);
  } finally {
    await db.close();
  }
}

// 📊 Fetch data helper
export async function fetchOne(query, params = []) {
  const db = await getDatabase();
  try {
    return await db.get(query, params);
  } catch (error) {
    console.error('❌ [DexDB] Fetch error:', error.message);
  } finally {
    await db.close();
  }
}

// 📋 Fetch multiple rows
export async function fetchAll(query, params = []) {
  const db = await getDatabase();
  try {
    return await db.all(query, params);
  } catch (error) {
    console.error('❌ [DexDB] FetchAll error:', error.message);
  } finally {
    await db.close();
  }
}
