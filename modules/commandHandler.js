// 🎛 commandHandler.js v1.1 Beta — Safe Event Handling
// DexBot — Modular command handler with role-based permission checks
// Admin-only, Staff-only, DJ-only commands supported

import chalk from 'chalk';
import { runQuery } from '../data/sqliteDatabase.js';

// Module imports (safe paths)
import setupLFSquad from './lfSquad.js';
import setupChatInteraction from './chatInteraction.js';
import setupLeveling from './leveling.js';
import monitorPermAbuse from './antiPermAbuse.js';
import setupMusicCommands from './commands/musicCommands.js'; // ✅ Corrected path

const PREFIX = '$';

export default function setupCommandHandler(client) {
  client.prefix = PREFIX; // attach default prefix to client

  // ===== Safe Message Event =====
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const member = message.member;
    const content = message.content.trim();

    // Prefix check
    if (!content.startsWith(PREFIX)) return;

    const args = content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = args.shift()?.toLowerCase();
    if (!cmd) return;

    // Determine user roles
    const isAdmin = member.permissions.has('Administrator');
    const isStaff = member.roles.cache.some(r => r.name.toLowerCase() === 'staff');
    const isDJ = member.roles.cache.some(r => r.name.toLowerCase() === 'dj');

    // ===== Command Execution Wrapper =====
    const safeExecute = async (fn, context = '') => {
      try {
        await fn();
      } catch (err) {
        console.error(chalk.red(`[COMMAND-HANDLER] Error in ${context}:`), err);
        message.reply(`⚠️ Oops! Something went wrong while running that command.`);
      }
    };

    // ===== ADMIN COMMANDS =====
    if (cmd === 'reboot') {
      return safeExecute(async () => {
        if (!isAdmin) return message.reply('❌ You do not have permission to reboot the bot.');
        await message.reply('🔄 Rebooting DexVyBz...');
        process.exit(0);
      }, 'reboot');
    }

    if (cmd === 'stats') {
      return safeExecute(async () => {
        if (!isAdmin) return message.reply('❌ Admins only.');
        return message.reply(`📊 DexVyBz Stats — Users: ${message.guild.memberCount}`);
      }, 'stats');
    }

    // ===== STAFF COMMANDS =====
    if (cmd === 'vc') {
      return safeExecute(async () => {
        if (!isStaff && !isAdmin) return message.reply('❌ Staff only.');
        return message.reply('🎧 VC command received (placeholder)');
      }, 'vc');
    }

    // ===== DJ/MUSIC COMMANDS =====
    if (['join', 'leave', 'play', 'search'].includes(cmd)) {
      return safeExecute(async () => {
        if (!isDJ && !isStaff && !isAdmin) {
          return message.reply('❌ DJ role required for music commands.');
        }
        setupMusicCommands(client, cmd, args, message);
      }, `music command: ${cmd}`);
    }

    // ===== GENERAL COMMANDS =====
    if (cmd === 'help') {
      return safeExecute(async () => {
        return message.reply(
          'Commands: $help, $afk <reason>, $removeafk, $lf <game>, $lfon, $lfoff, $join, $leave, $play, $search, $stats, $reboot'
        );
      }, 'help');
    }

    // ===== Module Handlers (Safe) =====
    const modules = [
      { fn: setupLFSquad, name: 'LF$ system' },
      { fn: setupChatInteraction, name: 'Chat Interaction' },
      { fn: setupLeveling, name: 'Leveling' },
      { fn: monitorPermAbuse, name: 'Anti-Perm Abuse' }
    ];

    for (const mod of modules) {
      safeExecute(async () => mod.fn(client), mod.name);
    }
  });
}
