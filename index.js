// 🟢 index.js v0.4
// DexBot main entry — ensures database is initialized before starting the bot
// Includes minimal web server to satisfy Render Web Service port requirement

import { Client, GatewayIntentBits } from 'discord.js';
import { initDatabase } from './data/sqliteDatabase.js';
import vcManagement from './modules/vcManagement.js';
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

const PREFIX = '$';
const BOT_NAME = 'Dex';

// ===== Minimal Web Server =====
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('🌐 DexBot is online ✅'));
app.listen(PORT, () => console.log(`🌐 Web server running on port ${PORT}`));
// ===============================

// Ensure DB is initialized before bot starts listening
(async () => {
  try {
    await initDatabase(); // initialize DB
    console.log('✅ Database initialized successfully');

    // Start the bot
    client.once('clientReady', async () => {
      console.log(`✅ DexBot online as ${client.user.tag}`);

      // Start VC monitoring
      vcManagement(client);
    });

    client.login(process.env.DISCORD_TOKEN);
  } catch (err) {
    console.error('❌ Failed to initialize DexBot database or client:', err);
    process.exit(1);
  }
})();
