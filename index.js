import { Client, GatewayIntentBits } from 'discord.js';
import { initDatabase } from './data/sqliteDatabase.js';
import dotenv from 'dotenv';
import express from 'express';
import chalk from 'chalk';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: ['CHANNEL','GUILD_MEMBER','MESSAGE'],
});

// ===== Minimal Web Server =====
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req,res)=>res.send('🌐 DexVyBz v1.5 Beta online ✅'));
app.listen(PORT, ()=>console.log(`🌐 Web server running on port ${PORT}`));

// ===== Verbose Logging =====
client.on('messageCreate', message=>{
  if (!message.author.bot)
    console.log(chalk.blue(`[MSG] ${message.author.tag}: ${message.content}`));
});

client.on('voiceStateUpdate',(oldState,newState)=>{
  const oldChannel = oldState.channelId || 'None';
  const newChannel = newState.channelId || 'None';
  console.log(chalk.green(`[VC] ${newState.id} moved from ${oldChannel} -> ${newChannel}`));
});

// ===== Safe Module Loader =====
async function loadModuleSafe(path, client, db){
  try{
    const mod = await import(path);
    if (mod.default) await mod.default(client, db);
    console.log(chalk.yellow(`✅ Loaded module: ${path}`));
  }catch(err){
    console.error(chalk.red(`❌ Failed to load module: ${path}`), err);
  }
}

// ===== Global unhandled rejection handler =====
process.on('unhandledRejection',(reason,promise)=>{
  console.error(chalk.red('⚠️ Unhandled Rejection:'), reason);
});

// ===== Bot Startup =====
(async ()=>{
  try{
    const db = await initDatabase();
    console.log(chalk.yellow('✅ Database initialized successfully'));

    client.once('clientReady', async ()=>{
      await client.application?.fetch(); // ensures owner detection works
      console.log(chalk.green(`✅ DexVyBz online as ${client.user.tag}`));

      // Load all modules
      await loadModuleSafe('./modules/commandHandler.js', client, db);
      await loadModuleSafe('./modules/lfSquad.js', client, db);
      await loadModuleSafe('./modules/chatInteraction.js', client, db);
      await loadModuleSafe('./modules/leveling.js', client, db);
      await
