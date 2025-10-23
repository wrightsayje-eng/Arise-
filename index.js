// 🟢 index.js v1.2 Beta — Safe Module Loading
// DexVyBz main entry — database + web server + modular command handler with graceful error handling

import { Client, GatewayIntentBits } from 'discord.js';
import { initDatabase } from './data/sqliteDatabase.js';
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

// ===== Safe Module Loader =====
async function loadModuleSafe(path, client) {
  try {
    const mod = await import(path);
    if (mod.default) {
      await mod.default(client);
      console.log(`✅ Loaded module: ${path}`);
    }
  } catch (err) {
    console.error(`❌ Failed to load module: ${path}`, err);
  }
}

// ===== Global unhandled rejection handler =====
process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection:', reason);
});

// ===== Bot Startup =====
(async () => {
  try {
    // 1️⃣ Initialize DB
    await initDatabase();
    console.log('✅ Database initialized successfully');

    client.once('ready', async () => {
      console.log(`✅ DexVyBz online as ${client.user.tag}`);

      // 2️⃣ Load modules safely
      await loadModuleSafe('./modules/vcManagement.js', client);
      await loadModuleSafe('./modules/commandHandler.js', client);
      await loadModuleSafe('./modules/leveling.js', client);
      await loadModuleSafe('./modules/antiPermAbuse.js', client);
      await loadModuleSafe('./modules/lfSquad.js', client);
      await loadModuleSafe('./modules/chatInteraction.js', client);

      console.log('✅ All modules loaded (or skipped if failed)');
    });

    // 3️⃣ Login
    await client.login(process.env.DISCORD_TOKEN);
  } catch (err) {
    console.error('❌ Critical error initializing DexVyBz:', err);
    process.exit(1);
  }
})();
