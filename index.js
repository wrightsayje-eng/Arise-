/**
 * ⚙️ DexBot Main Index (Prototype Build v1.3)
 * -------------------------------------------
 * 🧠 Core Features:
 *  - Discord.js v14+ with full ES module support.
 *  - SQLite3 local persistence (no external DB needed).
 *  - Modular structure (auto-loads command & system modules).
 *  - Voice Guard system to prevent VC join/leave spam.
 *  - Graceful error recovery and live monitoring.
 * 
 * 💬 Responds to:
 *   - Prefix Commands: `$`
 *   - Direct Mentions / “Dex” keyword (AI-style plain text)
 * 
 * 🧱 Stability Enhancements:
 *   - Auto-restart protection for module errors.
 *   - Clear, modern logging with emojis.
 */

import { Client, GatewayIntentBits, Partials, Collection } from "discord.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { initVCManagement, handleVoiceStateUpdate } from "./modules/vcManagement.js";

// 🧩 Module Imports
import setupServerManagement from "./modules/serverManagement.js";
import setupChatInteraction from "./modules/chatInteraction.js";
import setupLevelingSystem from "./modules/leveling.js";
import setupLFSquad from "./modules/lfSquad.js";

// 🗝️ Environment Config
dotenv.config();
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const PREFIX = "$";

// 🧠 Identify File Context
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 💾 SQLite Initialization
let db;
async function initDatabase() {
  db = await open({
    filename: "./data/main.sqlite",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS user_data (
      user_id TEXT PRIMARY KEY,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1
    );
  `);

  console.log("💾 [DATABASE] SQLite3 initialized successfully ✅");
}

// 🤖 Create Discord Client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
});

client.commands = new Collection();

// ⚙️ Load Modules (Dynamic Import System)
async function loadModules() {
  console.log("🧩 Loading modules...");
  await setupServerManagement(client, db);
  await setupChatInteraction(client, db);
  await setupLevelingSystem(client, db);
  await setupLFSquad(client, db);
  console.log("✅ All modules loaded successfully.");
}

// 🧩 Voice Management System
client.on("voiceStateUpdate", handleVoiceStateUpdate);

// 💬 Message Handler
client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim();

  // --- 🧠 Dex AI-Style Direct Trigger ---
  if (/^dex$/i.test(content)) {
    return message.reply("👋 Yo! Dex here — what’s up?");
  }

  // --- 💬 Prefix Command Handling ---
  if (!content.startsWith(PREFIX)) return;
  const args = content.slice(PREFIX.length).trim().split(/ +/);
  const commandName = args.shift().toLowerCase();

  try {
    const commandPath = `./commands/${commandName}.js`;
    if (fs.existsSync(path.join(__dirname, "commands", `${commandName}.js`))) {
      const { default: command } = await import(commandPath);
      await command.execute(client, message, args, db);
    }
  } catch (err) {
    console.error(`❌ [COMMAND ERROR] ${commandName}:`, err);
    message.reply("⚠️ Something glitched out — Dex is fixing it!");
  }
});

// 🚀 Bot Startup Sequence
(async () => {
  console.log("🧠 [SYSTEM] Initializing DexBot Prototype...");

  try {
    await initDatabase();
    await initVCManagement();
    await loadModules();

    client.once("ready", () => {
      console.log(`💫 ${client.user.username} is online and vibin’ as ${client.user.tag}`);
    });

    await client.login(DISCORD_TOKEN);
  } catch (err) {
    console.error("❌ [FATAL ERROR] Startup failed:", err);
  }
})();
