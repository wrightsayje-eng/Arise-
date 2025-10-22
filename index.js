/**
 * =============================================
 *  【ＤｅＸ　ＶｙＢｚ】 — index.js
 *  Canonical: DISCORD_TOKEN | Prefix: '$' | Dex responds to "Dex"
 *  SQLite3 (sqlite + sqlite3), ES modules, Discord.js v14
 *  Author: Dex for Saber
 * =============================================
 */

import 'dotenv/config';
import express from 'express';
import chalk from 'chalk';
import { Client, GatewayIntentBits, Partials, Events } from 'discord.js';

// Modules
import { initDB } from './modules/sqliteDatabase.js';
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
  console.error(chalk.red('[CONFIG] DISCORD_TOKEN not set — aborting.'));
  process.exit(1);
}
const PREFIX = '$';
const BOT_NAME = 'Dex';
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

// Boot sequence
(async () => {
  try {
    // Init DB
    const db = await initDB();
    console.log(chalk.green('[SQLITE] Database initialized and ready ✅'));

    // attach db and config to client for ease
    client.db = db;
    client.prefix = PREFIX;
    client.botName = BOT_NAME;

    // Initialize modules
    setupServerManagement(client, db);
    setupVCManagement(client, db);
    monitorPermAbuse(client, db);
    setupChatInteraction(client, db);
    setupLeveling(client, db);
    setupLFSquad(client, db);

    // Ready handler
    client.on(Events.ClientReady, (c) => {
      console.log(chalk.magentaBright(`\n💫 ${c.user.tag} is online — VyBz flexin' as ${c.user.username}`));
      console.log(chalk.yellow('[SYSTEM] Modules loaded successfully.\n'));
    });

    // login
    await client.login(TOKEN);
    console.log(chalk.cyan('[LOGIN] Discord login attempt complete.'));

    // global error handlers
    process.on('unhandledRejection', (reason, p) => {
      console.error(chalk.red('[UNHANDLED REJECTION]'), reason, p);
    });
    process.on('uncaughtException', (err) => {
      console.error(chalk.red('[UNCAUGHT EXCEPTION]'), err);
      // don't exit immediately in production—consider reporting and restarting safely
    });

  } catch (err) {
    console.error(chalk.red('[BOOT] Fatal error during startup — aborting ❌'), err);
    process.exit(1);
  }
})();
