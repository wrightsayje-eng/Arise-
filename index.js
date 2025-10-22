/**
 * =============================================
 *  【ＤｅＸ　ＶｙＢｚ】 Discord Bot - Index
 *  Modern ES Modules + SQLite Integration
 * =============================================
 */

import 'dotenv/config';
import express from 'express';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

// --------------------
// EXPRESS SERVER SETUP
// --------------------
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('VyBz is online! 💫'));
app.listen(PORT, () => console.log(`[EXPRESS] Keep-alive server running on port ${PORT}`));

// --------------------
// SQLITE DATABASE SETUP
// --------------------
let db;
(async () => {
  db = await open({
    filename: './database/bot.sqlite', // Ensure folder exists, do not push .sqlite to GitHub
    driver: sqlite3.Database
  });

  // Optional: create tables if not exist
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS afk (
      user_id TEXT PRIMARY KEY,
      reason TEXT,
      expires_at INTEGER
    );
    CREATE TABLE IF NOT EXISTS squad (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      squad_name TEXT,
      timestamp INTEGER
    );
  `);

  console.log('[SQLITE] Database initialized successfully ✅');
})();

// --------------------
// DISCORD CLIENT SETUP
// --------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

// --------------------
// MODULE IMPORTS
// --------------------
import monitorPermAbuse from './modules/antiPermAbuse.js';
import setupServerManagement from './modules/serverManagement.js';
import setupVCManagement from './modules/vcManagement.js';
import chatInteraction from './modules/chatInteraction.js';
import levelingSystem from './modules/leveling.js';
import lfSquad from './modules/lfSquad.js';

// --------------------
// EVENT: CLIENT READY
// --------------------
client.once('clientReady', async () => {
  console.log(`💫 VyBz is online and flexin’ as ${client.user.tag}`);
  
  // Initialize modules
  monitorPermAbuse(client, db);
  setupServerManagement(client, db);
  setupVCManagement(client, db);
  chatInteraction(client, db);
  levelingSystem(client, db);
  lfSquad(client, db);

  console.log('[SYSTEM] Modules loaded successfully.');
});

// --------------------
// LOGIN
// --------------------
client.login(process.env.BOT_TOKEN);

// --------------------
// ERROR HANDLING
// --------------------
client.on('error', (err) => console.error('[DISCORD CLIENT ERROR]', err));
process.on('unhandledRejection', (reason, p) => {
  console.error('[UNHANDLED REJECTION]', reason);
});
