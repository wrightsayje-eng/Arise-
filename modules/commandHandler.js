// commandHandler.js v1.4.2 Patched
import { Client, GatewayIntentBits } from 'discord.js';
import antiPermAbuse from './antiPermAbuse.js';

export default function setupCommands(client) {
  client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('$') || message.author.bot) return;
    const [cmd, ...args] = message.content.slice(1).trim().split(/\s+/);

    try {
      // =========================
      // $help
      // =========================
      if (cmd === 'help') {
        return message.channel.send(
          '🛠 **Available Commands:**\n' +
          '`$join` - Bot joins VC\n' +
          '`$leave` - Bot leaves VC\n' +
          '`$play <url>` - Play music\n' +
          '`$setstatus <text>` - Set VC status\n' +
          '`$clearstatus` - Clear VC status\n' +
          '`$scan` - Scan links\n' +
          '`$lock` - Lock VC temporarily\n' +
          '`$clear` - Clear all locks and timers'
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
      // Add other existing commands here (join, leave, play, scan, lock, etc.)
      // Make sure each uses safeExecute or try/catch for stability
      // =========================

    } catch (err) {
      console.error('[COMMAND ERROR]', err);
      message.reply('❌ An error occurred while executing that command.');
    }
  });
}
