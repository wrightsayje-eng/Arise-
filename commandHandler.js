// 🎛 commandHandler.js v1.5 — Fully Integrated Command Handler
import chalk from 'chalk';
import { runQuery, getDatabase } from './data/sqliteDatabase.js';

// Module imports
import setupLFSquad from './modules/lfSquad.js';
import setupChatInteraction from './modules/chatInteraction.js';
import setupLeveling from './modules/leveling.js';
import monitorPermAbuse from './modules/antiPermAbuse.js';
import setupMusicCommands from './modules/musicCommands.js';
import setupLogging from './modules/logging.js';
import setupScanLinks from './modules/scanLinks.js';

const PREFIX = '$';

export default function setupCommandHandler(client) {
  client.prefix = PREFIX;

  // ===== Safe Message Event =====
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    const member = message.member;
    const content = message.content.trim();
    if (!content.startsWith(PREFIX)) return;

    const args = content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = args.shift()?.toLowerCase();
    if (!cmd) return;

    const isAdmin = member.permissions.has('Administrator');
    const isOwner = member.id === client.application?.owner?.id;
    const isStaff = member.roles.cache.some(r => r.name.toLowerCase() === 'staff');
    const isDJ = member.roles.cache.some(r => r.name.toLowerCase() === 'dj');

    console.log(chalk.cyan(`[COMMAND] ${cmd} by ${member.user.tag} in ${message.guild.name}`));

    const safeExecute = async (fn, context = '') => {
      try { await fn(); } 
      catch (err) { 
        console.error(chalk.red(`[COMMAND-HANDLER] Error in ${context}:`), err);
        message.reply('⚠️ Oops! Something went wrong running that command.');
      }
    };

    const db = await getDatabase();

    // ===== ADMIN / OWNER COMMANDS =====
    if (['reboot', 'stats', 'botstatus', 'whitelist'].includes(cmd)) {
      return safeExecute(async () => {
        if (!isAdmin && !isOwner) return message.reply('❌ Admin/Owner only.');

        if (cmd === 'reboot') {
          console.log(chalk.yellow(`[ADMIN] Reboot by ${member.user.tag}`));
          await message.reply('🔄 Rebooting DexVyBz...');
          process.exit(0);
        }

        if (cmd === 'stats') {
          const uptime = process.uptime();
          const mem = process.memoryUsage().rss / 1024 / 1024;
          return message.reply(
            `📊 DexVyBz Stats — Users: ${message.guild.memberCount}, Uptime: ${Math.round(uptime/60)}m, RAM: ${mem.toFixed(1)} MB`
          );
        }

        if (cmd === 'botstatus') {
          const status = args.join(' ').slice(0,128);
          if (!status) return message.reply('❌ Provide a status message.');
          await client.user.setPresence({ activities: [{ name: status, type: 0 }] });
          return message.reply(`✅ Bot status updated: ${status}`);
        }

        if (cmd === 'whitelist') {
          const modules = ['scan', 'music', 'vc', 'rapidleave'];
          const moduleArg = args.shift()?.toLowerCase();
          if (!modules.includes(moduleArg)) return message.reply(`❌ Choose module: ${modules.join(', ')}`);

          const mention = message.mentions.members.first() || args[0];
          if (!mention) return message.reply('❌ Mention a user to whitelist.');
          const userId = typeof mention === 'string' ? mention.replace(/\D/g,'') : mention.id;

          await db.run('INSERT OR REPLACE INTO whitelist(user_id,module) VALUES (?,?)', [userId,moduleArg]);
          return message.reply(`✅ User <@${userId}> whitelisted for **${moduleArg}** module.`);
        }
      }, `admin command: ${cmd}`);
    }

    // ===== STAFF COMMANDS =====
    if (['vc','status'].includes(cmd)) {
      return safeExecute(async () => {
        if (!isAdmin && !isStaff) return message.reply('❌ Staff only.');

        if (cmd === 'vc') {
          const vcs = message.guild.channels.cache
            .filter(ch => ch.isVoiceBased())
            .map(ch => `${ch.name} — ${ch.members.size} users`);
          return message.reply(`🎧 **Active VCs:**\n${vcs.join('\n') || 'None active'}`);
        }

        if (cmd === 'status') {
          const status = args.join(' ').slice(0,128);
          if (!status) return message.reply('❌ Provide a VC status message.');
          if (!message.channel.isVoiceBased()) return message.reply('❌ Must be in a VC channel.');
          await message.channel.setTopic(status).catch(() => null);
          return message.reply(`✅ VC status updated: ${status}`);
        }
      }, `staff command: ${cmd}`);
    }

    // ===== DJ / MUSIC COMMANDS =====
    if (['join','leave','play','search'].includes(cmd)) {
      return safeExecute(async () => {
        setupMusicCommands(cmd, message, args, { isAdmin, isStaff, isDJ });
      }, `music command: ${cmd}`);
    }

    // ===== GENERAL COMMANDS =====
    if (cmd === 'help') {
      return safeExecute(async () => {
        return message.reply('Commands: $help, $afk <reason>, $removeafk, $lf <game>, $lfon, $lfoff, $join, $leave, $play, $search, $stats, $reboot, $botstatus, $whitelist, $vc, $status, $scan');
      }, 'help');
    }

    // ===== MODULE HANDLERS =====
    const modules = [
      { fn: setupLFSquad, name:'LF$ system' },
      { fn: setupChatInteraction, name:'Chat Interaction' },
      { fn: setupLeveling, name:'Leveling' },
      { fn: monitorPermAbuse, name:'Anti-Perm Abuse' },
      { fn: setupLogging, name:'DeXVyBz Logging' },
      { fn: setupScanLinks, name:'Scan Links' } // ✅ whitelist-integrated
    ];

    for (const mod of modules) {
      safeExecute(async () => mod.fn(client), mod.name);
    }
  });

  client.once('ready', () => {
    console.log(chalk.black.bgRed(`✅ DeXVyBz Online — Logged in as ${client.user.tag} at ${new Date().toLocaleString()}`));
  });
}
