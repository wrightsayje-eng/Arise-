/* =========================================
   【ＤｅＸ　ＶｙＢｚ】 Discord Bot Main Index
   Author: Saber & Dex
   Purpose: Full bot setup with modules, MongoDB, 
            Express keep-alive, and ES module style
   ========================================= */

import 'dotenv/config';
import express from 'express';
import { Client, GatewayIntentBits, Partials } from 'discord.js';
import mongoose from 'mongoose';

// -------------------- MODULE IMPORTS -------------------- //
// Management Modules
import setupServerManagement from './modules/serverManagement.js';
import monitorVCs from './modules/vcManagement.js';
import monitorPermAbuse from './modules/antiPermAbuse.js';

// Interaction Modules
import chatInteraction from './modules/chatInteraction.js';
import levelingSystem from './modules/leveling.js';
import lfSquad from './modules/lfSquad.js';

// -------------------- EXPRESS KEEP-ALIVE -------------------- //
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('VyBz is online!'));
app.listen(PORT, () => console.log(`[EXPRESS] Keep-alive server running on port ${PORT}`));

// -------------------- DISCORD CLIENT -------------------- //
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.User]
});

// -------------------- MONGO CONNECTION -------------------- //
const connectMongo = async () => {
    try {
        if (!process.env.MONGO_URI) throw new Error('MONGO_URI not set in environment variables');
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('[MONGO] Database connected successfully ✅');
    } catch (err) {
        console.error('[MONGO] Database connection failed ❌', err);
        console.log('[MONGO] ⚠️ Make sure your IP is whitelisted in MongoDB Atlas (0.0.0.0/0 for testing)');
    }
};
connectMongo();

// -------------------- CLIENT READY -------------------- //
client.once('clientReady', async () => {
    console.log(`💫 VyBz is online and flexin’ as ${client.user.tag}`);
    
    // Initialize modules
    setupServerManagement(client);
    monitorVCs(client);
    monitorPermAbuse(client);
    chatInteraction(client);
    levelingSystem(client);
    lfSquad(client);
    
    console.log('[SYSTEM] Modules loaded successfully.');
});

// -------------------- LOGIN -------------------- //
if (!process.env.BOT_TOKEN) throw new Error('BOT_TOKEN not set in environment variables');
client.login(process.env.BOT_TOKEN)
    .then(() => console.log('[LOGIN] VyBz connected to Discord successfully ✅'))
    .catch(err => console.error('[LOGIN] Failed to connect ❌', err));
