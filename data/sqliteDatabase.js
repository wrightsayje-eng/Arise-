// ⛩️ DexBot SQLite Database v0.1
// ✅ Uses modern async SQLite with sqlite3 backend
// ✅ Automatically creates database file if missing
// ✅ Logs connection status in a clean format

import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve current directory for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database path inside /root/data
const dbPath = path.resolve(__dirname, 'dexbot.sqlite');

// Initialize database
let db;

export async function initDatabase() {
	try {
		db = await open({
			filename: dbPath,
			driver: sqlite3.Database,
		});

		console.log('🧠 DexBot SQLite Connected:', dbPath);

		// Example default table
		await db.exec(`
			CREATE TABLE IF NOT EXISTS user_activity (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				user_id TEXT NOT NULL,
				event_type TEXT NOT NULL,
				timestamp INTEGER NOT NULL
			);
		`);

		console.log('📦 Tables verified and ready');
		return db;
	} catch (err) {
		console.error('❌ Database initialization failed:', err);
		process.exit(1);
	}
}

export function getDB() {
	if (!db) throw new Error('Database not initialized! Call initDatabase() first.');
	return db;
}
