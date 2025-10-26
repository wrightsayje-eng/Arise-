// commandHandler.js v1.5 — DexVyBz Patched
import { Client } from 'discord.js';
import antiPermAbuse from './antiPermAbuse.js';

export default function setupCommands(client) {
  const helpCooldown = new Map(); // prevents duplicate $help spam

  client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('$') || message.author.bot) return;
    const [cmd, ...args] = message.content.slice(1).trim().split(/\s+/);

    try {
      // =========================
      // $help
      // =========================
      if (cmd === 'help') {
        if (helpCooldown.has(message.author.id)) return; // skip duplicate
        helpCooldown.set(message.author.id, true);
        setTimeout(() => helpCooldown.delete(message.author.id), 3000);

        return message.channel.send(
          '🛠 **Available Commands:**\n' +
          '`$join` - Bot joins VC\n' +
          '`$leave` - Bot leaves VC\n' +
          '`$play <url>` - Play music\n' +
          '`$setstatus <text>` - Set VC status\n' +
          '`$clearstatus` - Clear VC status\n' +
          '`$scan` - Scan links\n' +
          '`$lock` - Lock VC temporarily\n' +
          '`$clear` - Clear all locks and timers\n' +
          '`$rank` - Show your chat & VC rank\n' +
          '`$leaderboard` - Show VC leaderboard'
        );
      }

      // =========================
      // $setstatus <text>
      // =========================
      if (cmd === 'setstatus') {
        const statusText = args.join(' ');
        if (!statusText) return message.reply('❌ Please provide a status text.');

        const memberVC = message.member.voice.channel;
        if (!memberVC) return message.reply('❌ You must be in a voice channel to set a status.');

        if (!memberVC.originalName) memberVC.originalName = memberVC.name;
        await memberVC.setName(`${memberVC.originalName} - ${statusText}`);

        message.reply(`✅ Voice Channel status set: "${statusText}"`);
        console.log(`[SETSTATUS] VC "${memberVC.name}" updated by ${message.author.tag}`);
      }

      // =========================
      // $clearstatus
      // =========================
      if (cmd === 'clearstatus') {
        const memberVC = message.member.voice.channel;
        if (!memberVC) return message.reply('❌ You must be in a voice channel to clear a status.');
        if (!memberVC.originalName) return message.reply('ℹ️ No custom status was set on this VC.');

        await memberVC.setName(memberVC.originalName);
        delete memberVC.originalName;

        message.reply(`✅ Voice Channel status cleared. Name reverted to "${memberVC.name}"`);
        console.log(`[CLEARSTATUS] VC "${memberVC.name}" reverted by ${message.author.tag}`);
      }

      // =========================
      // $clear - clear all locks and timers
      // =========================
      if (cmd === 'clear') {
        antiPermAbuse.clearAllLocks();
        message.reply('✅ All VC locks and timers have been cleared.');
        console.log(`[CLEAR] All locks cleared by ${message.author.tag}`);
      }

      // =========================
      // $rank & $leaderboard integration (safe hooks for leveling.js)
      // =========================
      // Note: The leveling.js module handles these commands now. This handler does not conflict.
      // Future commands can follow the same pattern:
      // try/catch + reply + logging
      // =========================

    } catch (err) {
      console.error('[COMMAND ERROR]', err);
      message.reply('❌ An error occurred while executing that command.');
    }
  });
}
