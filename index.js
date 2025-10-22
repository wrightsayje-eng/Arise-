// ⚡ DexBot Main Engine v0.2
// 🚀 Written by Dex & Saber
// 💡 Uses SQLite3 (async) for persistence
// 🎧 Includes VC anti-join/leave spam protection
// 🤖 Responds to prefix "$" and plain text "Dex"

import { Client, GatewayIntentBits, Partials, PermissionsBitField } from 'discord.js';
import { getDatabase, runQuery } from './data/sqliteDatabase.js';
import fs from 'fs';
import path from 'path';

// ✅ Load environment variables via Render dashboard
const TOKEN = process.env.DISCORD_TOKEN;

// 🧠 Initialize client with all essential intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

// 💾 Anti join-leave tracker (in-memory)
const vcJoinTracker = new Map();

// 🟢 Bot ready
client.once('ready', async () => {
  console.log(`✅ DexBot online as ${client.user.tag}`);
  const db = await getDatabase();
  await db.close();
});

// 🧩 Command prefix
const PREFIX = '$';

// 🧠 Message listener
client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim();

  // 👂 Respond to "Dex" directly
  if (/^dex$/i.test(content)) {
    return message.reply('👋 Hey there! Dex online and operational ⚙️');
  }

  // 💬 Command system
  if (!content.startsWith(PREFIX)) return;
  const [cmd, ...args] = content.slice(PREFIX.length).split(/\s+/);

  switch (cmd.toLowerCase()) {
    case 'ping':
      await message.reply('🏓 Pong!');
      break;

    case 'xp':
      const db = await getDatabase();
      const user = await db.get('SELECT * FROM users WHERE id = ?', [message.author.id]);
      if (user) {
        message.reply(`📊 ${message.author.username}, you’re level ${user.level} with ${user.xp} XP.`);
      } else {
        message.reply(`🆕 No data found — you’ll start tracking now.`);
        await db.run('INSERT INTO users (id, username, xp, level, lastSeen) VALUES (?, ?, ?, ?, ?)', [
          message.author.id,
          message.author.username,
          0,
          1,
          Date.now(),
        ]);
      }
      await db.close();
      break;

    default:
      message.reply('❓ Unknown command. Try `$ping` or `$xp`');
      break;
  }
});

// 🎧 VC Join/Leave Anti-Spam System
client.on('voiceStateUpdate', async (oldState, newState) => {
  try {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    const guildId = member.guild.id;
    const userId = member.id;
    const now = Date.now();

    // 🟢 Joined VC
    if (!oldState.channelId && newState.channelId) {
      const record = vcJoinTracker.get(userId) || [];
      const updated = record.filter((t) => now - t < 180000); // keep only last 3 min
      updated.push(now);
      vcJoinTracker.set(userId, updated);
    }

    // 🔴 Left VC
    if (oldState.channelId && !newState.channelId) {
      const record = vcJoinTracker.get(userId) || [];
      const recent = record.filter((t) => now - t < 180000); // last 3 min
      recent.push(now);
      vcJoinTracker.set(userId, recent);

      if (recent.length >= 3) {
        // 🧱 Deny Connect permission for 1hr
        const guild = member.guild;
        const channel = oldState.channel;
        if (!channel) return;

        await channel.permissionOverwrites.edit(userId, {
          Connect: false,
        });

        console.log(`🚫 ${member.user.tag} temporarily locked from VC in ${guild.name}`);

        setTimeout(async () => {
          await channel.permissionOverwrites.delete(userId).catch(() => {});
          console.log(`🔓 ${member.user.tag} VC lock lifted`);
        }, 60 * 60 * 1000); // 1 hour
      }
    }
  } catch (error) {
    console.error('❌ [VC Management Error]', error);
  }
});

// 🧱 Global error handling
process.on('unhandledRejection', (error) => {
  console.error('⚠️ Unhandled Rejection:', error);
});

// 🔌 Login
client.login(TOKEN);
