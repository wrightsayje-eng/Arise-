/**
 * 【ＤｅＸ　ＶｙＢｚ】 Main Entry
 * Discord bot initialization, modules loading, express keep-alive
 */

import "dotenv/config";
import express from "express";
import { Client, GatewayIntentBits, Partials } from "discord.js";

// --- Modules ---
import db from "./modules/db.js";
import { monitorPermAbuse } from "./modules/antiPermAbuse.js";
import { setupServerManagement } from "./modules/serverManagement.js";
import { setupVCManagement } from "./modules/vcManagement.js";
import { handleChatInteraction } from "./modules/chatInteraction.js";
import { handleLeveling } from "./modules/leveling.js";
import { handleLFSquad } from "./modules/lfSquad.js";
import { handleAFK } from "./modules/afk.js";

// --- Express Keep-alive ---
const app = express();
const PORT = process.env.PORT || 3000;
app.get("/", (_, res) => res.send("VyBz is online! 💫"));
app.listen(PORT, () => console.log(`[EXPRESS] Keep-alive server running on port ${PORT}`));

// --- Discord Client ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildVoiceStates
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
});

// --- Event: clientReady ---
client.on("clientReady", async () => {
    console.log(`💫 VyBz is online and flexin’ as ${client.user.tag}`);
    console.log("[SYSTEM] Modules loaded successfully.");
});

// --- Load Modules ---
monitorPermAbuse(client);
setupServerManagement(client);
setupVCManagement(client);
handleChatInteraction(client);
handleLeveling(client);
handleLFSquad(client);
handleAFK(client);

// --- Login ---
client.login(process.env.BOT_TOKEN).then(() => console.log("[LOGIN] VyBz connected to Discord successfully ✅"))
    .catch(err => console.error("[LOGIN ERROR]", err));
