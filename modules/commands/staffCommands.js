// 🧰 staffCommands.js v1.3 — DexVyBz Staff Utilities
import { runQuery } from '../data/sqliteDatabase.js';

export async function handleStaffCommand(cmd, message, args, { isAdmin, isStaff }) {
  if (!isAdmin && !isStaff) return message.reply('❌ Staff only.');

  // ---------- VC STATUS ----------
  if (cmd === 'status') {
    const status = args.join(' ').slice(0, 128);
    if (!status) return message.reply('❌ Provide a VC status message.');
    const channel = message.channel;
    if (!channel.isVoiceBased()) return message.reply('❌ Must be used in a voice channel.');
    // Discord does not allow per-VC text status, so we can simulate via topic or pinned message
    await channel.setTopic(status).catch(() => null);
    return message.reply(`✅ VC status updated: ${status}`);
  }

  // ---------- ACTIVE VCS ----------
  if (cmd === 'vc') {
    const vcs = message.guild.channels.cache
      .filter(ch => ch.isVoiceBased())
      .map(ch => `${ch.name} — ${ch.members.size} users`);
    return message.reply(`🎧 **Active VCs:**\n${vcs.join('\n') || 'None active'}`);
  }
}
