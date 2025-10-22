/* ===================================================
   【ＤｅＸ　ＶｙＢｚ】 Bot Index
   Modern ES Modules | SQLite Integration | Clean Setup
   =================================================== */

import { Client, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";

// --- Modules ---
import monitorPermAbuse from "./modules/antiPermAbuse.js";
import setupServerManagement from "./modules/serverManagement.js";
import handleChatInteraction from "./modules/chatInteraction.js";
import handleLeveling from "./modules/leveling.js";
import lfSquad from "./modules/lfSquad.js";
import { connectDB } from "./modules/sqliteDatabase.js";

// --- Environment ---
dotenv.config();
const TOKEN = process.env.BOT_TOKEN;

// --- Discord Client Setup ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

// --- Database Connection ---
try {
  await connectDB();
  console.log("[SQLITE] Database connected successfully ✅");
} catch (err) {
  console.error("[SQLITE] Database connection failed ❌", err);
}

// --- Ready Event ---
client.on("clientReady", () => {
  console.log(`💫 VyBz is online and flexin’ as ${client.user.tag}`);
});

// --- Load Modules ---
monitorPermAbuse(client);
setupServerManagement(client);
handleChatInteraction(client);
handleLeveling(client);
lfSquad(client);

// --- Login ---
client.login(TOKEN)
  .then(() => console.log("[LOGIN] Bot connected to Discord successfully ✅"))
  .catch((err) => console.error("[LOGIN] Discord connection failed ❌", err));

// --- Keep-alive for Render ---
import express from "express";
const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => res.send("VyBz Bot is running!"));
app.listen(PORT, () => console.log(`[EXPRESS] Keep-alive server running on port ${PORT}`));
