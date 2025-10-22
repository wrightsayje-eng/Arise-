/**
 * =============================================
 * chatInteraction.js
 * - Handles prefix commands ($), "Dex" plain-text replies, unique greetings, and verification flow
 * =============================================
 */

import chalk from 'chalk';
const DEFAULT_PREFIX = '$';

export default function setupChatInteraction(client, db) {
  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot) return;

      const content = (message.content || '').trim();

      // Plain-text Dex trigger (no prefix)
      if (/^\s*dex\s*$/i.test(content)) {
        // witty reply
        return message.reply(`Yo ${message.author.username}, Dex slid in — what's good? 😎`);
      }

      // commands
      if (!content.startsWith(client.prefix ?? DEFAULT_PREFIX)) return;

      const args = content.slice((client.prefix ?? DEFAULT_PREFIX).length).trim().split(/\s+/);
      const cmd = args.shift()?.toLowerCase();

      if (!cmd) return;

      if (cmd === 'help') {
        return message.reply('Commands: `$help`, `$afk <reason>`, `$removeafk`, `$lf <game>`, `$lfon`, `$lfoff`');
      }

      if (cmd === 'afk') {
        const reason = args.join(' ') || 'AFK';
        const expires = Date.now() + (3 * 60 * 60 * 1000); // 3 hours
        await db.run('INSERT OR REPLACE INTO afk (user_id, reason, expires_at) VALUES (?, ?, ?)', [message.author.id, reason, expires]);
        return message.reply(`You are now AFK for 3 hours: ${reason}`);
      }

      if (cmd === 'removeafk' || cmd === 'back') {
        await db.run('DELETE FROM afk WHERE user_id = ?', [message.author.id]);
        return message.reply('Welcome back — AFK removed ✅');
      }

      if (cmd === 'lf' || cmd === 'lfsquad') {
        const game = args.join(' ') || null;
        if (!game) return message.reply('Usage: `$lf <game>` — tell me the game so I can ping the squad.');
        // forward to LF module by inserting into DB (lfSquad module will process or we handle here)
        await db.run('INSERT INTO lfsquad (user_id, game, message, created_at) VALUES (?, ?, ?, ?)', [message.author.id, game, content, Date.now()]);
        return message.reply(`Squad alert created for **${game}** — VyBz will ping players who opted in.`);
      }

      if (cmd === 'lfon') {
        // flag to receive DMs — simple approach: users are opted in by default; implement opt-out table if needed
        return message.reply('You are now opted in to LF$ DMs (default).');
      }
      if (cmd === 'lfoff') {
        // opt-out: store a special value in users table or separate table; omitted for brevity
        return message.reply('You are now opted out of LF$ DMs (not implemented: placeholder).');
      }

      if (cmd === 'verify') {
        // send witty verification message directing to autoverify channel
        const autoChannel = message.guild?.channels.cache.find(c => c.name?.toLowerCase().includes('autoverify') && c.isTextBased?.());
        const channelRef = autoChannel ? `<#${autoChannel.id}>` : '#autoverify';
        return message.reply(`${message.author}, slide into ${channelRef} to get auto-verified. If they know the password, I can ping admins for express verification 😉`);
      }

    } catch (err) {
      console.error(chalk.red('[CHAT-INTERACTION] Error in message handler'), err);
    }
  });

  // unique greeting on member join
  client.on('guildMemberAdd', async (member) => {
    try {
      const greetings = [
        `Yo ${member.user.username}, VyBz just pulled up — welcome! 🎉`,
        `What's good ${member.user.username}? Dex says hi 👋`,
        `Ayy ${member.user.username}, enjoy the vibes — say hey to Dex!`
      ];
      const msg = greetings[Math.floor(Math.random() * greetings.length)];
      // find a general/ welcome channel
      const welcome = member.guild.channels.cache.find(c => c.name?.toLowerCase().includes('welcome') && c.isTextBased?.());
      if (welcome) await welcome.send(msg);
    } catch (err) {
      console.error(chalk.red('[CHAT-INTERACTION] guildMemberAdd error'), err);
    }
  });
}
