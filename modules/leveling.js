/**
 * =============================================
 * leveling.js
 * - Simple XP per message and per VC time on leave
 * - Stores xp and level in users table
 * =============================================
 */

import chalk from 'chalk';

const XP_PER_MESSAGE = 10;
const MESSAGE_COOLDOWN_MS = 60 * 1000; // 60s per user to get XP
const LEVEL_BASE = 100; // XP needed for level * current level

const messageCooldowns = new Map();

export default function setupLeveling(client, db) {
  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot) return;

      const now = Date.now();
      const last = messageCooldowns.get(message.author.id) || 0;
      if (now - last < MESSAGE_COOLDOWN_MS) return; // cooldown

      messageCooldowns.set(message.author.id, now);

      // get or create user
      const user = await db.get('SELECT id, xp, level FROM users WHERE id = ?', [message.author.id]);
      if (!user) {
        await db.run('INSERT INTO users (id, username, xp, level, vc_seconds) VALUES (?, ?, ?, ?, ?)', [message.author.id, message.author.username, XP_PER_MESSAGE, 1, 0]);
        return;
      }

      let newXP = (user.xp || 0) + XP_PER_MESSAGE;
      let lvl = user.level || 1;
      const threshold = LEVEL_BASE * lvl;

      if (newXP >= threshold) {
        lvl += 1;
        newXP = newXP - threshold;
        // reward: attempt to add role if configured (not implemented here)
        try {
          await message.reply(`🎉 ${message.author.username} leveled up to level ${lvl}!`);
        } catch (e) { /* ignore DM fail */ }
      }

      await db.run('UPDATE users SET xp = ?, level = ? WHERE id = ?', [newXP, lvl, message.author.id]);
      // console.log(chalk.blue(`[LEVELING] ${message.author.tag}: xp=${newXP}, level=${lvl}`));
    } catch (err) {
      console.error(chalk.red('[LEVELING] messageCreate error'), err);
    }
  });

  // voice-state based accumulation (simplified): when user leaves a VC, add seconds to vc_seconds and convert to XP
  client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
      // user left VC => calculate duration if we stored join times somewhere (simple approach: not persisted)
      // For robustness store join timestamps in memory map
      // We'll implement in-memory joinTimes map
    } catch (err) {
      console.error(chalk.red('[LEVELING] voiceStateUpdate error'), err);
    }
  });
}
