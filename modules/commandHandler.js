// commandHandler.js v1.9 — DexVyBz Patched
import { EmbedBuilder, PermissionsBitField } from 'discord.js';
import antiPermAbuse from './antiPermAbuse.js';
import setupLeveling from './leveling.js';

export default async function setupCommands(client, db) {
  if (!client) throw new Error('[COMMANDS] Discord client not provided');
  if (!db) throw new Error('[COMMANDS] Database not provided');

  // Initialize leveling module
  await setupLeveling(client, db);

  const helpCooldown = new Map();

  client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('$') || message.author.bot) return;

    const [cmd, ...args] = message.content.slice(1).trim().split(/\s+/);

    try {
      // =========================
      // $help
      // =========================
      if (cmd === 'help') {
        const now = Date.now();
        const lastSent = helpCooldown.get(message.author.id) || 0;
        if (now - lastSent < 5000) return;
        helpCooldown.set(message.author.id, now);

        const embed = new EmbedBuilder()
          .setTitle('🛠 Available Commands')
          .setColor('Red')
          .setDescription(
            '`$join` - Bot joins VC\n' +
            '`$leave` - Bot leaves VC\n' +
            '`$play <url>` - Play music\n' +
            '`$setstatus <text>` - Set VC status\n' +
            '`$clearstatus` - Clear VC status\n' +
            '`$scan` - Scan links (Admin only)\n' +
            '`$lock` - Lock VC temporarily\n' +
            '`$clear` - Clear all locks and timers\n' +
            '`$rank` - Show your chat & VC rank\n' +
            '`$leaderboard` - Show VC leaderboard'
          )
          .setFooter({ text: `Requested by ${message.author.tag}` })
          .setTimestamp();

        return message.channel.send({ embeds: [embed] });
      }

      // =========================
      // $setstatus
      // =========================
      if (cmd === 'setstatus') {
        const statusText = args.join(' ');
        if (!statusText) return message.reply('❌ Please provide a status text.');
        const memberVC = message.member.voice.channel;
        if (!memberVC) return message.reply('❌ You must be in a voice channel to set a status.');

        memberVC.originalName = memberVC.originalName || memberVC.name;
        await memberVC.setName(`${memberVC.originalName} - ${statusText}`);
        return message.reply(`✅ Voice Channel status set: "${statusText}"`);
      }

      // =========================
      // $clearstatus
      // =========================
      if (cmd === 'clearstatus') {
        const memberVC = message.member.voice.channel;
        if (!memberVC || !memberVC.originalName)
          return message.reply('ℹ️ No custom status was set.');
        await memberVC.setName(memberVC.originalName);
        delete memberVC.originalName;
        return message.reply(`✅ Voice Channel status cleared.`);
      }

      // =========================
      // $clear - Clear locks/timers
      // =========================
      if (cmd === 'clear') {
        if (typeof antiPermAbuse.clearAllLocks === 'function') {
          antiPermAbuse.clearAllLocks();
          return message.reply('✅ All VC locks and timers cleared.');
        }
        return message.reply('❌ Clear function not available.');
      }

      // =========================
      // $scan - Manual bio scan
      // =========================
      if (cmd === 'scan') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator))
          return message.reply('❌ Only admins can run this command.');
        try {
          const scanLinksModule = await import('./scanLinks.js');
          if (scanLinksModule.default) {
            await scanLinksModule.default(client, db, message);
            console.log(`[SCAN] Manual scan triggered by ${message.author.tag}`);
          }
        } catch (err) {
          console.error('[SCAN] Failed to run manual scan:', err);
          return message.reply('❌ Scan failed to execute.');
        }
      }

    } catch (err) {
      console.error('[COMMAND ERROR]', err);
      message.reply('❌ An error occurred while executing that command.');
    }
  });
}
