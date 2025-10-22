/**
 * =============================================
 * lfSquad.js
 * - LF$ (Looking For $quad) system
 * - Command: `$lf <game>`
 * - DMs members with matching role names who allow DMs
 * =============================================
 */

import chalk from 'chalk';

export default function setupLFSquad(client, db) {
  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot) return;
      if (!message.content.startsWith(client.prefix || '$')) return;

      const args = message.content.slice((client.prefix || '$').length).trim().split(/\s+/);
      const cmd = args.shift()?.toLowerCase();
      if (!cmd) return;

      if (cmd === 'lf' || cmd === 'lfsquad') {
        const game = args.join(' ');
        if (!game) return message.reply('Usage: `$lf <game>`');

        const guild = message.guild;
        if (!guild) return message.reply('This command must be used in a server.');

        const role = guild.roles.cache.find(r => r.name.toLowerCase() === game.toLowerCase());
        if (!role) return message.reply(`No role found named "${game}". Create a role with that name for squads.`);

        // Save to DB
        await db.run('INSERT INTO lfsquad (user_id, game, message, created_at) VALUES (?, ?, ?, ?)', [message.author.id, game, message.content, Date.now()]);

        // DM role members
        const members = role.members.filter(m => !m.user.bot);
        let sent = 0;
        for (const [, m] of members) {
          try {
            await m.send(`Yo ${m.user.username}, ${message.author.username} is looking for players for **${game}**. Jump in if you're down!`);
            sent++;
          } catch (e) {
            // could not DM; ignore
          }
        }

        return message.reply(`Squad alert sent for **${game}** — DMed ${sent} member(s) (where allowed).`);
      }
    } catch (err) {
      console.error(chalk.red('[LF SQUAD] Error in messageCreate'), err);
    }
  });
}
