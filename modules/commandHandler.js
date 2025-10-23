// 🎛 commandHandler.js v1.2 Beta
// Modular command router — routes commands to their specific modules

import chalk from 'chalk';
import { handleMusicCommand } from '../commands/musicCommands.js';
import { handleAdminCommand } from '../commands/adminCommands.js';
import { handleStaffCommand } from '../commands/staffCommands.js';

const PREFIX = '$';

export default function setupCommandHandler(client) {
  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot || !message.content.startsWith(PREFIX)) return;

      const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
      const cmd = args.shift()?.toLowerCase();
      if (!cmd) return;

      const member = message.member;
      const isAdmin = member.permissions.has('Administrator');
      const isStaff = member.roles.cache.some(r => r.name.toLowerCase() === 'staff');
      const isDJ = member.roles.cache.some(r => r.name.toLowerCase() === 'dj');

      // 🎵 Music
      if (['join', 'leave', 'play', 'search'].includes(cmd))
        return handleMusicCommand(cmd, message, args, { isAdmin, isStaff, isDJ });

      // 🛠 Admin
      if (['stats', 'reboot'].includes(cmd))
        return handleAdminCommand(cmd, message, args, { isAdmin });

      // 🧰 Staff
      if (cmd === 'vc')
        return handleStaffCommand(cmd, message, args, { isAdmin, isStaff });

      // 📖 General Help
      if (cmd === 'help')
        return message.reply('**Commands:** $help, $join, $leave, $play, $search, $vc, $stats, $reboot');

    } catch (err) {
      console.error(chalk.red('[COMMAND-HANDLER] error:'), err);
    }
  });
}
