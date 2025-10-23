// 🎮 lfSquad.js v1.2 Beta
import chalk from 'chalk';

export default function setupLFSquad(client, db) {
  try {
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
          if (!role) return message.reply(`No role found named "${game}"`);

          await db.run('INSERT INTO lfsquad (user_id, game, message, created_at) VALUES (?, ?, ?, ?)',
            [message.author.id, game, message.content, Date.now()]);

          let sent = 0;
          const members = role.members.filter(m => !m.user.bot);
          for (const [, m] of members) {
            try { await m.send(`Yo ${m.user.username}, ${message.author.username} is looking for players for **${game}**.`); sent++; } catch {}
          }
          return message.reply(`Squad alert sent for **${game}** — DMed ${sent} member(s).`);
        }
      } catch (err) {
        console.error(chalk.red('[LF SQUAD] messageCreate error'), err);
      }
    });
    console.log('✅ LF$ module loaded');
  } catch (err) {
    console.error('❌ Failed to load LF$ module', err);
  }
}
