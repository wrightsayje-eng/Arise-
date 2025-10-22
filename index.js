/* =========================
   VyBz Discord Bot - Index
   Clean ES Modules & Labeled
========================= */

import "dotenv/config"; // Load env variables
import express from "express";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import { MongoClient } from "mongodb";

/* =========================
   Module Imports
========================= */
import setupServerManagement from "./modules/serverManagement.js";
import setupVCManagement from "./modules/vcManagement.js";
import monitorPermAbuse from "./modules/antiPermAbuse.js";
import setupChatInteraction from "./modules/chatInteraction.js";
import setupLeveling from "./modules/leveling.js";
import setupLFSquad from "./modules/lfSquad.js";

/* =========================
   Express Keep-Alive
========================= */
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => res.send("VyBz is online!"));
app.listen(PORT, () => console.log(`[EXPRESS] Keep-alive server running on port ${PORT}`));

/* =========================
   Discord Client Setup
========================= */
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildPresences
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

/* =========================
   MongoDB Connection
========================= */
const mongoSRV = process.env.MONGO_URI_SRV;      // SRV URI
const mongoDirect = process.env.MONGO_URI_DIRECT; // Direct URI
let dbClient;

async function connectMongo() {
  try {
    dbClient = new MongoClient(mongoSRV);
    await dbClient.connect();
    console.log("[MONGO] Connected successfully using SRV URI ✅");
    return dbClient.db();
  } catch (errSRV) {
    console.warn("[MONGO] SRV connection failed ❌", errSRV.message);
    try {
      dbClient = new MongoClient(mongoDirect);
      await dbClient.connect();
      console.log("[MONGO] Connected successfully using direct URI ✅");
      return dbClient.db();
    } catch (errDirect) {
      console.error("[MONGO] Direct connection failed ❌", errDirect.message);
      console.warn("[MONGO] ⚠️ Make sure your IP is whitelisted in MongoDB Atlas (0.0.0.0/0 for testing)");
      process.exit(1);
    }
  }
}

/* =========================
   Discord Event Handlers
========================= */
client.once("clientReady", async () => {
  console.log(`💫 VyBz is online and flexin’ as ${client.user.tag}`);
  
  // Connect to Mongo
  const db = await connectMongo();

  /* =========================
     Load Modules with DB
  ========================== */
  setupServerManagement(client, db);
  setupVCManagement(client, db);
  monitorPermAbuse(client, db);
  setupChatInteraction(client, db);
  setupLeveling(client, db);
  setupLFSquad(client, db);

  console.log("[SYSTEM] Modules loaded successfully.");
});

/* =========================
   Discord Login
========================= */
client.login(process.env.BOT_TOKEN).then(() => {
  console.log("[LOGIN] VyBz connected to Discord successfully ✅");
}).catch(err => {
  console.error("[LOGIN] Failed to connect to Discord ❌", err);
});
