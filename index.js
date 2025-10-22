// 🧩 DEX VYBZ MAIN INDEX FILE
// --------------------------------------------
// Version: v1.0
// Framework: Discord.js v15
// Database: MongoDB via Mongoose
// Hosting: Render (Web Service compatible)
// Author: Saber & Dex 😎
// --------------------------------------------

// ===== [ MODULE // 
// index.js
import express from "express";
import chalk from "chalk";
import { Client, GatewayIntentBits, Partials, Events } from "discord.js";
import mongoose from "mongoose";
import dotenv from "dotenv";

import monitorPermAbuse from "./modules/antiPermAbuse.js";
import setupServerManagement from "./modules/serverManagement.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ========== EXPRESS KEEP-ALIVE SERVER ==========
app.get("/", (req, res) => res.send("💫 VyBz Bot is Alive and Flexin’!"));
app.listen(PORT, () =>
  console.log(chalk.cyan(`[EXPRESS] Keep-alive server running on port ${PORT}`))
);

// ========== MONGO CONNECTION ==========
const mongoURI = process.env.MONGO_URI;

mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log(chalk.green("[MONGO] Database connected ✅")))
  .catch((err) =>
    console.log(chalk.red("[MONGO] Database connection failed ❌"), err)
  );

// ========== DISCORD CLIENT ==========
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});

// ========== ON READY ==========
client.once(Events.ClientReady, (readyClient) => {
  console.log(
    chalk.greenBright(
      `\n💫 ${readyClient.user.username} is online and flexin’ as ${readyClient.user.tag}`
    )
  );

  console.log(chalk.yellow("[SYSTEM] Modules loaded successfully."));
  setupServerManagement(client);
});

// ========== VOICE STATE / PERMISSION MONITOR ==========
client.on(Events.VoiceStateUpdate, (oldState, newState) => {
  if (!newState || !newState.member) return; // Prevents crash
  monitorPermAbuse(oldState, newState);
});

// ========== LOGIN ==========
client.login(process.env.TOKEN).then(() => {
  console.log(chalk.magenta("[LOGIN] VyBz connected to Discord successfully ✅"));
}).catch((err) => {
  console.log(chalk.red("[LOGIN] Failed to connect to Discord ❌"), err);
});
