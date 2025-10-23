// 🧰 staffCommands.js v1.2 Beta
// Staff-only commands for VC management

export async function handleStaffCommand(cmd, message, args, { isAdmin, isStaff }) {
  if (!isAdmin && !isStaff)
    return message.reply('❌ Staff only.');

  if (cmd === 'vc') {
    const vcs = message.guild.channels.cache
      .filter(ch => ch.isVoiceBased())
      .map(ch => `${ch.name} — ${ch.members.size} users`);
    return message.reply(`🎧 **Active VCs:**\n${vcs.join('\n') || 'None active'}`);
  }
}
