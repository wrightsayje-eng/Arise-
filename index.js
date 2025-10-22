// 🟢 index.js v0.3
// DexBot main entry — ensures database is initialized before starting the bot

import { Client, GatewayIntentBits } from 'discord.js';
import { initDatabase } from './data/sqliteDatabase.js';
import vcManagement from './modules/vcManagement.js'; // assuming you have this module
import dotenv from 'dotenv';

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
