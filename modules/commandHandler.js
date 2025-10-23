// 🎛 commandHandler.js v1.4.2 — Modular Command Handler + DeXVyBz Logging
// DexBot — Safe event handling, role-based permissions, music integration, and action logging

import chalk from 'chalk';
import { runQuery } from '../data/sqliteDatabase.js';

// Module imports
import setupLFSquad from './lfSquad.js';
import setupChatInteraction from './chatInteraction.js';
import setupLeveling from './leveling.js';
import monitorPermAbuse from './antiPermAbuse.js';
import setupMusicCommands from './commands/musicCommands.js';
import setupLogging from './logging.js'; // ✅ DeXVyBz Logging

const PREFIX = '$';

export default function setupCommandHandler(client) {
  client.prefix = PREFIX; // attach default prefix to client

  // ===== Safe Message Event =====
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const member = message.member;
    const content = message.content.trim();

    if (!content.startsWith(PREFIX)) return;

    const args = content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = args.shift()?.toLowerCase();
    if (!cmd) return;

    // Determine roles
    const isAdmin = member.permissions.has('Administrator');
    const isStaff = member.roles.cache.some(r => r.name.toLowerCase() === 'staff');
    const isDJ = member.roles.cache.some(r => r.name.toLowerCase() === 'dj');

    // ===== Verbose Logging =====
    console.log(
      chalk.cyan(`[COMMAND] ${cmd} triggered by ${member.user.tag} in ${message.guild.name}`)
    );

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
        console.log(chalk.yellow(`[ADMIN] Reboot triggered by ${member.user.tag}`));
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
        console.log(`[STAFF] VC command received by ${member.user.tag}`);
        return message.reply('🎧 VC command received (placeholder)');
      }, 'vc');
    }

    // ===== DJ/MUSIC COMMANDS =====
    if (['join', 'leave', 'play', 'search'].includes(cmd)) {
      return safeExecute(async () => {
        console.log(
          `[MUSIC] Command: ${cmd} | User: ${member.user.tag} | Guild: ${message.guild.name}`
        );
        setupMusicCommands(cmd, message, args, { isAdmin, isStaff, isDJ });
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
      { fn: monitorPermAbuse, name: 'Anti-Perm Abuse' },
      { fn: setupLogging, name: 'DeXVyBz Logging' } // ✅ Integrated logging
    ];

    for (const mod of modules) {
      safeExecute(async () => mod.fn(client), mod.name);
    }
  });

  // ===== CLIENT READY LOG =====
  client.once('ready', () => {
    console.log(chalk.black.bgRed(`✅ DeXVyBz Online — Logged in as ${client.user.tag} at ${new Date().toLocaleString()}`));
  });
}
