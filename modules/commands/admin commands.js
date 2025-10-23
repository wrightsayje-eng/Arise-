// ⚙️ adminCommands.js v1.2 Beta
// Admin-only utilities (stats, reboot)

import os from 'os';

export async function handleAdminCommand(cmd, message, args, { isAdmin }) {
  if (!isAdmin) return message.reply('❌ Admin only.');

  if (cmd === 'stats') {
    const uptime = process.uptime();
    const mem = process.memoryUsage().rss / 1024 / 1024;
    const cpu = os.loadavg()[0].toFixed(2);
    return message.reply(
      `📊 **DexVyBz Stats:**\n🕒 Uptime: ${Math.round(uptime / 60)}m\n💾 RAM: ${mem.toFixed(1)} MB\n⚙️ CPU: ${cpu}`
    );
  }

  if (cmd === 'reboot') {
    await message.reply('🔄 Rebooting DexVyBz...');
    process.exit(0);
  }
}
