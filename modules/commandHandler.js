// 🎛 commandHandler.js v1.1 Beta
// DexBot — Modular command handler with role-based permission checks
// Admin-only, Staff-only, DJ-only commands supported

import chalk from 'chalk';
import { runQuery } from '../data/sqliteDatabase.js';

// Module imports (fixed paths)
import setupLFSquad from './lfSquad.js';
import setupChatInteraction from './chatInteraction.js';
import setupLeveling from './leveling.js';
import monitorPermAbuse from './antiPermAbuse.js';
import setupMusicCommands from './commands/musicCommands.js'; // ✅ Corrected path

const PREFIX = '$';

export default function setupCommandHandler(client) {
  client.prefix = PREFIX; // attach default prefix to client

  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot) return;

      const content = message.content.trim();
      const member = message.member;

      // Determine user roles
      const isAdmin = member.permissions.has('Administrator');
      const isStaff = member.roles.cache.some(r => r.name.toLowerCase() === 'staff');
      const isDJ = member.roles.cache.some(r => r.name.toLowerCase() === 'dj');

      // Basic prefix check
      if (!content.startsWith(PREFIX)) return;

      const args = content.slice(PREFIX.length).trim().split(/\s+/);
      const cmd = args.shift()?.toLowerCase();
      if (!cmd) return;

      // ===== ADMIN COMMANDS =====
      if (cmd === 'reboot') {
        if (!isAdmin) return message.reply('❌ You do not have permission to reboot the bot.');
        await message.reply('🔄 Rebooting DexVyBz...');
        process.exit(0);
      }

      if (cmd === 'stats') {
        if (!isAdmin) return message.reply('❌ Admins only.');
        return message.reply(`📊 DexVyBz Stats — Users: ${message.guild.memberCount}`);
      }

      // ===== STAFF COMMANDS =====
      if (cmd === 'vc') {
        if (!isStaff && !isAdmin) return message.reply('❌ Staff only.');
        return message.reply('🎧 VC command received (placeholder)');
      }

      // ===== DJ/MUSIC COMMANDS =====
      if (['join', 'leave', 'play', 'search'].includes(cmd)) {
        if (!isDJ && !isStaff && !isAdmin) return message.reply('❌ DJ role required for music commands.');
        // Forward to music commands module
        setupMusicCommands(client, cmd, args, message);
        return;
      }

      // ===== GENERAL COMMANDS =====
      if (cmd === 'help') {
        return message.reply(
          'Commands: $help, $afk <reason>, $removeafk, $lf <game>, $lfon, $lfoff, $join, $leave, $play, $search, $stats, $reboot'
        );
      }

      // Pass commands to module-specific handlers
      setupLFSquad(client);           // LF$ system
      setupChatInteraction(client);   // Chat & prefix triggers
      setupLeveling(client);          // XP & leveling
      monitorPermAbuse(client);       // Anti-Perm abuse

    } catch (err) {
      console.error(chalk.red('[COMMAND-HANDLER] messageCreate error'), err);
    }
  });
}
