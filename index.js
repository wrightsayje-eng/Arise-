// 🟢 index.js v1.2 Beta
// DexVyBz main entry — database + web server + modular command handler

import { Client, GatewayIntentBits } from 'discord.js';
import { initDatabase } from './data/sqliteDatabase.js';
import vcManagement from './modules/vcManagement.js';
import setupCommandHandler from './modules/commandHandler.js';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: ['CHANNEL', 'GUILD_MEMBER', 'MESSAGE'],
});

// ===== Minimal Web Server =====
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('🌐 DexVyBz v1.2 Beta online ✅'));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));
// ===============================

// Ensure DB is initialized before bot starts listening
(async () => {
  try {
    await initDatabase();
    console.log('✅ Database initialized successfully');

    client.once('ready', async () => {
      console.log(`✅ DexVyBz online as ${client.user.tag}`);
      vcManagement(client);
      setupCommandHandler(client);
    });

    await client.login(process.env.DISCORD_TOKEN);
  } catch (err) {
    console.error('❌ Failed to initialize DexVyBz database or client:', err);
    process.exit(1);
  }
})();
