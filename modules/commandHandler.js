// commandHandler.js v1.6 — DexVyBz Patched
import { Client } from 'discord.js';
import antiPermAbuse from './antiPermAbuse.js';
import setupLeveling from './leveling.js'; // Import leveling functions

export default async function setupCommands(client, db) {
  if (!client) throw new Error('[COMMANDS] Discord client not provided');
  if (!db) throw new Error('[COMMANDS] Database not provided');

  // Initialize leveling module (handles XP, ranks, leaderboard)
  await setupLeveling(client, db);

  const helpCooldown = new Map(); // Prevents duplicate $help spam

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
        return;
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
        return;
      }

      // =========================
      // $clear - clear all locks and timers
      // =========================
      if (cmd === 'clear') {
        if (typeof antiPermAbuse.clearAllLocks === 'function') {
          antiPermAbuse.clearAllLocks();
          message.reply('✅ All VC locks and timers have been cleared.');
          console.log(`[CLEAR] All locks cleared by ${message.author.tag}`);
        } else {
          message.reply('❌ Clear function not available.');
        }
        return;
      }

      // =========================
      // $rank and $leaderboard
      // Delegates to leveling.js listeners
      // =========================
      if (cmd === 'rank' || cmd === 'leaderboard') {
        // No code needed here; handled by leveling.js
        return;
      }

      // =========================
      // Other commands (join, leave, play, scan, lock) can be added below
      // =========================

    } catch (err) {
      console.error('[COMMAND ERROR]', err);
      message.reply('❌ An error occurred while executing that command.');
    }
  });
}
