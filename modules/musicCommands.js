// 🟢 index.js v1.6 — Deployable DexVyBz with fixed ready event
import { Client, GatewayIntentBits } from 'discord.js';
import { initDatabase } from './data/sqliteDatabase.js';
import dotenv from 'dotenv';
import express from 'express';
import chalk from 'chalk';

dotenv.config();

// ===== Discord Client =====
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
app.get('/', (req,res)=>res.send('🌐 DexVyBz v1.6 Beta online ✅'));
app.listen(PORT, ()=>console.log(`🌐 Web server running on port ${PORT}`));

// ===== Verbose Logging =====
client.on('messageCreate', message => {
  if (!message.author.bot)
    console.log(chalk.blue(`[MSG] ${message.author.tag}: ${message.content}`));
});

client.on('voiceStateUpdate', (oldState, newState) => {
  const oldChannel = oldState.channelId || 'None';
  const newChannel = newState.channelId || 'None';
  console.log(chalk.green(`[VC] ${newState.id} moved from ${oldChannel} -> ${newChannel}`));
});

// ===== Safe Module Loader =====
async function loadModuleSafe(path, client, db) {
  try {
    const mod = await import(path);
    if (mod.default) await mod.default(client, db);
    console.log(chalk.yellow(`✅ Loaded module: ${path}`));
  } catch (err) {
    console.error(chalk.red(`❌ Failed to load module: ${path}`), err);
  }
}

// ===== Global unhandled rejection handler =====
process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('⚠️ Unhandled Rejection:'), reason);
});

// ===== Bot Startup =====
(async () => {
  try {
    const db = await initDatabase();
    console.log(chalk.yellow('✅ Database initialized successfully'));

    // ===== Client Ready =====
    client.once('ready', async () => { // <-- fixed event
      await client.application?.fetch(); 
      console.log(chalk.green(`✅ DexVyBz online as ${client.user.tag}`));

      // ===== Load all modules safely =====
      await loadModuleSafe('./modules/commandHandler.js', client, db);
      await loadModuleSafe('./modules/lfSquad.js', client, db);
      await loadModuleSafe('./modules/chatInteraction.js', client, db);
      await loadModuleSafe('./modules/leveling.js', client, db);
      await loadModuleSafe('./modules/antiPermAbuse.js', client, db);
      await loadModuleSafe('./modules/musicCommands.js', client, db);
      await loadModuleSafe('./modules/logging.js', client, db);

      console.log(chalk.green('✅ All modules loaded successfully'));
    });

    // ===== Login =====
    await client.login(process.env.DISCORD_TOKEN);
  } catch (err) {
    console.error(chalk.red('❌ Critical error initializing DexVyBz:'), err);
    process.exit(1);
  }
})();
