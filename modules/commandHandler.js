// commandHandler.js v1.7 — DexVyBz Fully Patched
import { Client } from 'discord.js';
import antiPermAbuse from './antiPermAbuse.js';
import setupLeveling from './leveling.js';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export default async function setupCommands(client) {
  // ===== DATABASE =====
  const db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  // ===== LEVELING MODULE HOOK =====
  setupLeveling(client, db);

  // ===== HELP COOLDOWN =====
  const helpCooldown = new Map();

  // ===== MESSAGE HANDLER =====
  client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('$') || message.author.bot) return;
    const [cmd, ...args] = message.content.slice(1).trim().split(/\s+/);

    try {
      // =========================
      // $help
      // =========================
      if (cmd === 'help') {
        if (helpCooldown.has(message.author.id)) return;
        helpCooldown.set(message.author.id, true);
        setTimeout(() => helpCooldown.delete(message.author.id), 3000);

        return message.channel.send(
          '🛠 **Available Commands:**\n' +
          '`$join` — Bot joins VC\n' +
          '`$leave` — Bot leaves VC\n' +
          '`$play <url>` — Play music\n' +
          '`$setstatus <text>` — Set VC status\n' +
          '`$clearstatus` — Clear VC status\n' +
          '`$scan` — Scan links\n' +
          '`$lock` — Lock VC temporarily\n' +
          '`$clear` — Clear all locks and timers\n' +
          '`$rank` / `$stats` — Show your chat & VC rank\n' +
          '`$leaderboard` — Show VC leaderboard'
        );
      }

      // =========================
      // $setstatus <text>
      // =========================
      if (cmd === 'setstatus') {
        const statusText = args.join(' ');
        if (!statusText) return message.reply('❌ Please provide a status text.');

        const memberVC = message.member.voice.channel;
        if (!memberVC) return message.reply('❌ You must be in a voice channel to set a status.');

        if (!memberVC.originalName) memberVC.originalName = memberVC.name;
        await memberVC.setName(`${memberVC.originalName} - ${statusText}`);

        message.reply(`✅ Voice Channel status set: "${statusText}"`);
        console.log(`[SETSTATUS] VC "${memberVC.name}" updated by ${message.author.tag}`);
      }

      // =========================
      // $clearstatus
      // =========================
      if (cmd === 'clearstatus') {
        const memberVC = message.member.voice.channel;
        if (!memberVC) return message.reply('❌ You must be in a voice channel to clear a status.');
        if (!memberVC.originalName) return message.reply('ℹ️ No custom status was set on this VC.');

        await memberVC.setName(memberVC.originalName);
        delete memberVC.originalName;

        message.reply(`✅ Voice Channel status cleared. Name reverted to "${memberVC.name}"`);
        console.log(`[CLEARSTATUS] VC "${memberVC.name}" reverted by ${message.author.tag}`);
      }

      // =========================
      // $clear
      // =========================
      if (cmd === 'clear') {
        if (antiPermAbuse && typeof antiPermAbuse.clearAllLocks === 'function') {
          antiPermAbuse.clearAllLocks();
          message.reply('✅ All VC locks and timers have been cleared.');
          console.log(`[CLEAR] All locks cleared by ${message.author.tag}`);
        } else {
          console.warn('[CLEAR] antiPermAbuse.clearAllLocks is missing or invalid.');
          message.reply('❌ Cannot clear locks: function not found.');
        }
      }

      // =========================
      // $join
      // =========================
      if (cmd === 'join') {
        const vc = message.member.voice.channel;
        if (!vc) return message.reply('❌ You must be in a VC to use $join.');
        await vc.join?.(); // music bot join logic (replace with your bot join function)
        message.reply(`✅ Joined VC: ${vc.name}`);
        console.log(`[JOIN] ${message.author.tag} triggered join for VC "${vc.name}"`);
      }

      // =========================
      // $leave
      // =========================
      if (cmd === 'leave') {
        const vc = message.guild.me.voice.channel;
        if (!vc) return message.reply('❌ I am not in a VC.');
        await vc.leave?.();
        message.reply(`✅ Left VC: ${vc.name}`);
        console.log(`[LEAVE] Left VC "${vc.name}"`);
      }

      // =========================
      // $play <url>
      // =========================
      if (cmd === 'play') {
        const url = args[0];
        if (!url) return message.reply('❌ Please provide a URL to play.');
        // TODO: insert your music playback logic here
        message.reply(`🎵 Playing: ${url}`);
        console.log(`[PLAY] ${message.author.tag} requested: ${url}`);
      }

      // =========================
      // $scan
      // =========================
      if (cmd === 'scan') {
        const url = args[0];
        if (!url) return message.reply('❌ Please provide a link to scan.');
        // TODO: insert your scan logic here
        message.reply(`🔍 Scanning link: ${url}`);
        console.log(`[SCAN] ${message.author.tag} scanned: ${url}`);
      }

      // =========================
      // $lock
      // =========================
      if (cmd === 'lock') {
        const vc = message.member.voice.channel;
        if (!vc) return message.reply('❌ You must be in a VC to lock.');
        // TODO: insert lock logic here
        message.reply(`🔒 VC "${vc.name}" locked temporarily.`);
        console.log(`[LOCK] ${message.author.tag} locked VC "${vc.name}"`);
      }

      // =========================
      // $rank / $stats / $leaderboard
      // =========================
      if (['rank', 'stats', 'leaderboard'].includes(cmd)) return; // handled by leveling.js

    } catch (err) {
      console.error('[COMMAND ERROR]', err);
      message.reply('❌ An error occurred while executing that command.');
    }
  });
}
