// 🧩 DEX VYBZ MAIN INDEX FILE
// --------------------------------------------
// Version: v1.0
// Framework: Discord.js v15
// Database: MongoDB via Mongoose
// Hosting: Render (Web Service compatible)
// Author: Saber & Dex 😎
// --------------------------------------------

// ===== [ MODULE IMPORTS ] =====
import express from "express";
import { Client, GatewayIntentBits, Partials, Collection } from "discord.js";
import mongoose from "mongoose";
import chalk from "chalk";
import dotenv from "dotenv";

// ===== [ ENV SETUP ] =====
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ===== [ EXPRESS KEEP-ALIVE ] =====
app.get("/", (req, res) => {
  res.send("VyBz is vibin’ 🧠💨");
});
app.listen(PORT, () => {
  console.log(chalk.greenBright(`[EXPRESS] Keep-alive server running on port ${PORT}`));
});

// ===== [ DISCORD CLIENT SETUP ] =====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.User],
});

client.commands = new Collection();

// ===== [ MONGO CONNECTION ] =====
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(chalk.cyanBright("[MONGO] Database connection established ✅"));
  } catch (err) {
    console.error(chalk.redBright("[MONGO] Database connection failed ❌"), err);
  }
})();

// ===== [ MODULE IMPORTS ] =====
import { runPoachingScan, enforcePoachingDeadlines } from "./modules/serverManagement.js";
import { handleVoiceState } from "./modules/vcManagement.js";
import { handleChatMessage } from "./modules/chatInteraction.js";
import { requestSquad } from "./modules/lfSquad.js";
import { monitorPermAbuse } from "./modules/antiPermAbuse.js";
import { handleMessageXP, handleVCXP } from "./modules/leveling.js";

// ===== [ READY EVENT ] =====
client.once("ready", async () => {
  console.log(chalk.magentaBright(`\n💫 VyBz is online and flexin’ as ${client.user.tag}`));
  console.log(chalk.yellowBright("[SYSTEM] Modules loaded successfully."));
  runPoachingScan(client);
  enforcePoachingDeadlines(client);
  monitorPermAbuse(client);
});

// ===== [ MESSAGE HANDLER ] =====
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  try {
    handleChatMessage(message);
    handleMessageXP(message);
    requestSquad(message);
  } catch (err) {
    console.error(chalk.redBright(`[MESSAGE ERROR] ${err.message}`));
  }
});

// ===== [ VOICE STATE HANDLER ] =====
client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    handleVoiceState(oldState, newState);
    handleVCXP(newState);
  } catch (err) {
    console.error(chalk.redBright(`[VC ERROR] ${err.message}`));
  }
});

// ===== [ LOGIN ] =====
client.login(process.env.BOT_TOKEN)
  .then(() => console.log(chalk.greenBright("[LOGIN] VyBz connected to Discord successfully ✅")))
  .catch((err) => console.error(chalk.redBright("[LOGIN ERROR]"), err));
