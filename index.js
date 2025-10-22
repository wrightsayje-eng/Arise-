// 🧩 DEX VYBZ MAIN INDEX // Version: v1.0
// ==========================
// VyBz Discord Bot
// Author: Dex (Saber's Bot)
// Version: 1.0
// Description: All-in-one server management, moderation, leveling, LF$, social, and AI interaction
// ==========================

import "dotenv/config";
import express from "express";
import { Client, GatewayIntentBits } from "discord.js";
import { MongoClient } from "mongodb";

// ==== Module Imports ====
import setupServerManagement from "./modules/serverManagement.js";
import monitorVCManagement from "./modules/vcManagement.js";
import monitorPermAbuse from "./modules/antiPermAbuse.js";
import setupChatInteraction from "./modules/chatInteraction.js";
import setupLeveling from "./modules/leveling.js";
import setupLFSquad from "./modules/lfSquad.js";

// ==== Express Keep-Alive Server ====
const app = express();
app.get("/", (req, res) => res.send("VyBz is flexin' online 💫"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`[EXPRESS] Keep-alive server running on port ${PORT}`)
);

// ==== Discord Client Setup ====
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
  ],
});

// ==== MongoDB Connection ====
const mongoURI = process.env.MONGO_URI;
const mongoClient = new MongoClient(mongoURI);
try {
  await mongoClient.connect();
  console.log("%c[MONGO] Database connected successfully ✅", "color: green;");
} catch (err) {
  console.log(`%c[MONGO] Database connection failed ❌ ${err}`, "color: red;");
}

// ==== Event: Bot Ready ====
client.on("clientReady", () => {
  console.log(`💫 VyBz is online and flexin’ as ${client.user.tag}`);
});

// ==== Module Initialization ====
setupServerManagement(client, mongoClient);
monitorVCManagement(client, mongoClient);
monitorPermAbuse(client);
setupChatInteraction(client, mongoClient);
setupLeveling(client, mongoClient);
setupLFSquad(client);

// ==== Login ====
client.login(process.env.DISCORD_TOKEN).then(() => {
  console.log("%c[LOGIN] VyBz connected to Discord successfully ✅", "color: cyan;");
});

// ==== Global Error Handling ====
process.on("unhandledRejection", (error) =>
  console.log(`%c[ERROR] Unhandled promise rejection: ${error}`, "color: red;")
);

process.on("uncaughtException", (error) =>
  console.log(`%c[ERROR] Uncaught exception: ${error}`, "color: red;")
);
