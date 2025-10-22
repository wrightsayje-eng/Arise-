// 🧩 DEX VYBZ MAIN INDEX FILE
// --------------------------------------------
// Version: v1.0
// Framework: Discord.js v15
// Database: MongoDB via Mongoose
// Hosting: Render (Web Service compatible)
// Author: Saber & Dex 😎
// --------------------------------------------

// ===== [ MODULE IMPORTS ] =====
// index.js
import { Client, GatewayIntentBits } from 'discord.js';
import { monitorPermAbuse } from './modules/antiPermAbuse.js';
import dotenv from 'dotenv';
import express from 'express';
import mongoose from 'mongoose';

dotenv.config();

// -------------------
// Client Setup
// -------------------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
  ],
});

// -------------------
// Express Keep-Alive
// -------------------
const app = express();
app.get('/', (req, res) => res.send('VyBz is online'));
app.listen(3000, () => console.log('[EXPRESS] Keep-alive server running on port 3000'));

// -------------------
// MongoDB Connection
// -------------------
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('[MONGO] Database connected successfully ✅'))
  .catch(err => console.error('[MONGO] Database connection failed ❌', err));

// -------------------
// Event Listeners
// -------------------

// clientReady replaces ready event in v15
client.on('clientReady', () => {
  console.log(`💫 VyBz is online and flexin’ as ${client.user.tag}`);
});

// Voice State Update (anti-perm abuse)
client.on('voiceStateUpdate', (oldState, newState) => {
  monitorPermAbuse(oldState, newState);
});

// -------------------
// Additional modules can be imported and initialized here
// e.g., serverManagement, vcManagement, leveling, LF$ etc.
// -------------------

client.login(process.env.BOT_TOKEN);
