/**
 * =============================================
 *  【ＤｅＸ　ＶｙＢｚ】 — index.js
 *  Locked: DISCORD_TOKEN | Prefix: '$' | Dex responds to "Dex"
 *  SQLite3 (sqlite + sqlite3), ES modules, Discord.js v14
 *  Author: Dex for Saber — production prototype
 * =============================================
 */

import 'dotenv/config';
import express from 'express';
import chalk from 'chalk';
import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';

// Modules (all modules must export a single named function taking (client, db))
import { initDB, getRow, run, all } from './modules/sqliteDatabase.js';
import setupServerManagement from './modules/serverManagement.js';
import setupVCManagement from './modules/vcManagement.js';
import monitorPermAbuse from './modules/antiPermAbuse.js';
import setupChatInteraction from './modules/chatInteraction.js';
import setupLeveling from './modules/leveling.js';
import setupLFSquad from './modules/lfSquad.js';

// -----------------------------
// Config / Constants
// -----------------------------
const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
  console.error(chalk.red('[CONFIG] DISCORD_TOKEN not set in environment variables — aborting.'));
  process.exit(1);
}
const PREFIX = '$';
const BOT_NAME = 'Dex'; // plain-text trigger
const PORT = process.env.PORT || 3000;

// -----------------------------
// Express keep-alive
// -----------------------------
const app = express();
app.get('/', (req, res) => res.send('💫 VyBz (Dex) is online.'));
app.listen(PORT, () => console.log(chalk.cyan(`[EXPRESS] Keep-alive server running on port ${PORT}`)));

// -----------------------------
// Discord client
// -----------------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

// -----------------------------
// Boot sequence (async init)
// -----------------------------
(async () => {
  try {
    // Initialize DB
    const db = await initDB();
    console.log(chalk.green('[SQLITE] Database initialized and ready ✅'));

    // Attach DB helpers to client for modules that prefer client.db
    client.db = db;
    client.prefix = PREFIX;

    // Initialize modules (they should register event handlers safely)
    // Order: core management, moderation, features
    setupServerManagement(client, db);    // server profile scanner, auto-warn/timeout
    setupVCManagement(client, db);        // VC AFK, cam-only enforcement, join/leave spam lockout
    monitorPermAbuse(client, db);         // anti perm abuse monitor & mitigation
    setupChatInteraction(client, db);     // greetings, verification, "Dex" responses, prefix commands
    setupLeveling(client, db);            // xp and leveling (text + voice points)
    setupLFSquad(client, db);             // LF$ feature

    // Client Ready
    client.on(Events.ClientReady, (c) => {
      console.log(chalk.magentaBright(`\n💫 ${c.user.tag} is online — VyBz flexin' as ${c.user.username}`));
      console.log(chalk.yellow('[SYSTEM] Modules loaded successfully.'));
    });

    // Login
    await client.login(TOKEN);
    console.log(chalk.cyan('[LOGIN] Discord login attempted — check above for success ✅'));
  } catch (err) {
    console.error(chalk.red('[BOOT] Fatal error during startup — aborting ❌'), err);
    process.exit(1);
  }
})();
