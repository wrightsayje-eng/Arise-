/**
 * =============================================
 * leveling.js v1.3 Beta
 * - Simple XP per message and per VC time on leave
 * - Stores xp and level in users table
 * - Safe DB handling and cooldowns
 * =============================================
 */

import chalk from 'chalk';

const XP_PER_MESSAGE = 10;
const MESSAGE_COOLDOWN_MS = 60 * 1000; // 60s per user to get XP
const LEVEL_BASE = 100; // XP needed for level * current level

const messageCooldowns = new Map();
const joinTimes = new Map(); // track VC join times for XP accumulation

export default function setupLeveling(client, db) {
  if (!db) {
    console.warn('[LEVELING] Warning: DB not passed, leveling disabled.');
    return;
  }

  client.on('messageCreate', async (message) => {
    try {
      if (!db || message.author.bot) return;

      const now = Date.now();
      const last = messageCooldowns.get(message.author.id) || 0;
      if (now - last < MESSAGE_COOLDOWN_MS) return; // cooldown

      messageCooldowns.set(message.author.id, now);

      // get or create user safely
      let user = await db.get('SELECT id, xp, level FROM users WHERE id = ?', [message.author.id]);
      if (!user) {
        await db.run(
          'INSERT INTO users (id, username, xp, level, vc_seconds) VALUES (?, ?, ?, ?, ?)',
          [message.author.id, message.author.username, XP_PER_MESSAGE, 1, 0]
        );
        user = { xp: XP_PER_MESSAGE, level: 1 };
      } else {
        user.xp = user.xp || 0;
        user.level = user.level || 1;
      }

      let newXP = user.xp + XP_PER_MESSAGE;
      let lvl = user.level;
      const threshold = LEVEL_BASE * lvl;

      if (newXP >= threshold) {
        lvl += 1;
        newXP -= threshold;
        try {
          await message.reply(`🎉 ${message.author.username} leveled up to level ${lvl}!`);
        } catch (e) {
          // DM fail or channel permissions fail
        }
      }

      await db.run('UPDATE users SET xp = ?, level = ? WHERE id = ?', [newXP, lvl, message.author.id]);
    } catch (err) {
      console.error(chalk.red('[LEVELING] messageCreate error'), err);
    }
  });

  // ===== Voice-State XP accumulation =====
  client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
      if (!db) return;

      const memberId = newState.id;
      const oldChannel = oldState.channelId;
      const newChannel = newState.channelId;
      const now = Date.now();

      // User joined VC -> record join time
      if (!oldChannel && newChannel) {
        joinTimes.set(memberId, now);
      }

      // User left VC -> add VC duration as XP
      if (oldChannel && !newChannel) {
        const joinedAt = joinTimes.get(memberId);
        if (joinedAt) {
          const durationSec = Math.floor((now - joinedAt) / 1000);
          joinTimes.delete(memberId);

          const user = await db.get('SELECT xp, level FROM users WHERE id = ?', [memberId]);
          if (user) {
            const newXP = (user.xp || 0) + durationSec;
            const lvl = user.level || 1;
            await db.run('UPDATE users SET xp = ? WHERE id = ?', [newXP, memberId]);
            // Optional: handle level-ups from VC XP here
          }
        }
      }
    } catch (err) {
      console.error(chalk.red('[LEVELING] voiceStateUpdate error'), err);
    }
  });
}
