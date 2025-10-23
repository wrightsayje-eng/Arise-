// 💬 chatInteraction.js v1.2.1 Stable
import chalk from 'chalk';
const DEFAULT_PREFIX = '$';

export default function setupChatInteraction(client, db) {
  try {
    // ===== Message Event =====
    client.on('messageCreate', async (message) => {
      try {
        if (message.author.bot) return;
        const content = (message.content || '').trim();

        // Direct ping interaction
        if (/^\s*dex\s*$/i.test(content)) {
          return message.reply(`Yo ${message.author.username}, Dex slid in — what's good? 😎`);
        }

        // Prefix validation
        if (!content.startsWith(client.prefix ?? DEFAULT_PREFIX)) return;
        const args = content.slice((client.prefix ?? DEFAULT_PREFIX).length).trim().split(/\s+/);
        const cmd = args.shift()?.toLowerCase();
        if (!cmd) return;

        // ===== Basic Commands =====
        if (cmd === 'help') {
          return message.reply('Commands: `$help`, `$afk <reason>`, `$removeafk`, `$lf <game>`, `$lfon`, `$lfoff`');
        }

        if (cmd === 'afk') {
          const reason = args.join(' ') || 'AFK';
          const expires = Date.now() + (3 * 60 * 60 * 1000);
          await db.run(
            'INSERT OR REPLACE INTO afk (user_id, reason, expires_at) VALUES (?, ?, ?)',
            [message.author.id, reason, expires]
          );
          return message.reply(`You are now AFK for 3 hours: ${reason}`);
        }

        if (cmd === 'removeafk' || cmd === 'back') {
          await db.run('DELETE FROM afk WHERE user_id = ?', [message.author.id]);
          return message.reply('Welcome back — AFK removed ✅');
        }

        if (cmd === 'lf' || cmd === 'lfsquad') {
          const game = args.join(' ') || null;
          if (!game) return message.reply('Usage: `$lf <game>`');
          await db.run(
            'INSERT INTO lfsquad (user_id, game, message, created_at) VALUES (?, ?, ?, ?)',
            [message.author.id, game, message.content, Date.now()]
          );
          return message.reply(`Squad alert created for **${game}**`);
        }

        if (cmd === 'lfon') {
          return message.reply('You are now opted in to LF$ DMs (default).');
        }

        if (cmd === 'lfoff') {
          return message.reply('You are now opted out of LF$ DMs (placeholder).');
        }

        if (cmd === 'verify') {
          const autoChannel = message.guild?.channels.cache.find(
            (c) => c.name?.toLowerCase().includes('autoverify') && c.isTextBased?.()
          );
          const channelRef = autoChannel ? `<#${autoChannel.id}>` : '#autoverify';
          return message.reply(`${message.author}, slide into ${channelRef} to get auto-verified 😉`);
        }
      } catch (err) {
        console.error(chalk.red('[CHAT-INTERACTION] messageCreate error'), err);
      }
    });

    // ===== Member Join Event =====
    client.on('guildMemberAdd', async (member) => {
      try {
        const greetings = [
          `Yo ${member.user.username}, VyBz just pulled up — welcome! 🎉`,
          `What's good ${member.user.username}? Dex says hi 👋`,
          `Ayy ${member.user.username}, enjoy the vibes — say hey to Dex!`
        ];
        const welcome = member.guild.channels.cache.find(
          (c) => c.name?.toLowerCase().includes('welcome') && c.isTextBased?.()
        );
        if (welcome) {
          await welcome.send(greetings[Math.floor(Math.random() * greetings.length)]);
        }
      } catch (err) {
        console.error(chalk.red('[CHAT-INTERACTION] guildMemberAdd error'), err);
      }
    });
  } catch (err) {
    console.error(chalk.red('[CHAT-INTERACTION] setupChatInteraction failed to initialize:'), err);
  }
}
