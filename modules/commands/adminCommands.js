// ⚙️ adminCommands.js v1.3 — DexVyBz Admin Utilities
import os from 'os';
import { runQuery, getDatabase } from '../data/sqliteDatabase.js';
import chalk from 'chalk';

export async function handleAdminCommand(cmd, message, args, { isAdmin, isOwner }) {
  if (!isAdmin && !isOwner) return message.reply('❌ Admin only.');

  const db = await getDatabase();

  // ---------- BASIC STATS ----------
  if (cmd === 'stats') {
    const uptime = process.uptime();
    const mem = process.memoryUsage().rss / 1024 / 1024;
    const cpu = os.loadavg()[0].toFixed(2);
    return message.reply(
      `📊 **DexVyBz Stats:**\n🕒 Uptime: ${Math.round(uptime / 60)}m\n💾 RAM: ${mem.toFixed(1)} MB\n⚙️ CPU: ${cpu}`
    );
  }

  // ---------- REBOOT ----------
  if (cmd === 'reboot') {
    await message.reply('🔄 Rebooting DexVyBz...');
    process.exit(0);
  }

  // ---------- BOT STATUS ----------
  if (cmd === 'botstatus') {
    const status = args.join(' ').slice(0, 128); // Discord max length
    if (!status) return message.reply('❌ Provide a status message.');
    await message.client.user.setPresence({ activities: [{ name: status, type: 0 }] });
    return message.reply(`✅ Bot status updated: ${status}`);
  }

  // ---------- WHITELIST ----------
  if (cmd === 'whitelist') {
    const modules = ['scan', 'music', 'vc', 'rapidleave'];
    const moduleArg = args.shift()?.toLowerCase();
    if (!modules.includes(moduleArg)) return message.reply(`❌ Choose a module: ${modules.join(', ')}`);

    const mention = message.mentions.members.first() || args[0];
    if (!mention) return message.reply('❌ Mention a user to whitelist.');

    const userId = typeof mention === 'string' ? mention.replace(/\D/g, '') : mention.id;

    await db.run(
      'INSERT OR REPLACE INTO whitelist(user_id, module) VALUES (?, ?)',
      [userId, moduleArg]
    );

    return message.reply(`✅ User <@${userId}> whitelisted for **${moduleArg}** module.`);
  }
}
