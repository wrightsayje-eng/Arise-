/**
 * =============================================
 * leveling.js v1.5 Stable — DexVyBz XP Scaling
 * - Progressive XP formula for realistic leveling
 * - Per-message + VC-time XP gain
 * - Safe DB handling, cooldowns, and tracking
 * =============================================
 */

import chalk from 'chalk';

const XP_PER_MESSAGE = 10;
const MESSAGE_COOLDOWN_MS = 60 * 1000; // 60s cooldown
const BASE_XP_REQUIREMENT = 100; // base scaling constant
const joinTimes = new Map();
const messageCooldowns = new Map();

// === Progressive XP Formula ===
// Increases required XP as level goes up (smooth exponential)
function getXpForNextLevel(level) {
  return Math.floor(BASE_XP_REQUIREMENT * Math.pow(level, 2) + 100);
}

export default function setupLeveling(client, db) {
  if (!db) {
    console.warn(chalk.yellow('[LEVELING] ⚠️ DB not passed — leveling disabled.'));
    return;
  }

  // === Message XP Gain ===
  client.on('messageCreate', async (message) => {
    if (message.author.bot || !db) return;

    const userId = message.author.id;
    const now = Date.now();

    // Cooldown check
    const last = messageCooldowns.get(userId) || 0;
    if (now - last < MESSAGE_COOLDOWN_MS) return;
    messageCooldowns.set(userId, now);

    try {
      // Get or create user
      let user = await db.get('SELECT id, username, xp, level FROM users WHERE id = ?', [userId]);
      if (!user) {
        await db.run('INSERT INTO users (id, username, xp, level, vc_seconds) VALUES (?, ?, ?, ?, ?)', [
          userId,
          message.author.username,
          0,
          1,
          0,
        ]);
        user = { xp: 0, level: 1 };
      }

      // Add XP
      let newXp = user.xp + XP_PER_MESSAGE;
      let level = user.level;
      const xpNeeded = getXpForNextLevel(level);

      // Level-up check
      if (newXp >= xpNeeded) {
        newXp -= xpNeeded;
        level++;
        await message.channel.send(`🎉 ${message.author} leveled up to **Level ${level}**! 🆙`);
      }

      await db.run('UPDATE users SET xp = ?, level = ? WHERE id = ?', [newXp, level, userId]);
    } catch (err) {
      console.error(chalk.red('[LEVELING] messageCreate error:'), err);
    }
  });

  // === Voice Channel XP ===
  client.on('voiceStateUpdate', async (oldState, newState) => {
    if (!db) return;
    const userId = newState.id;
    const now = Date.now();

    try {
      // Joined VC → record join time
      if (!oldState.channelId && newState.channelId) {
        joinTimes.set(userId, now);
      }

      // Left VC → calculate time & grant XP
      if (oldState.channelId && !newState.channelId) {
        const joinedAt = joinTimes.get(userId);
        joinTimes.delete(userId);

        if (!joinedAt) return;

        const durationSec = Math.floor((now - joinedAt) / 1000);
        const vcXp = Math.floor(durationSec / 6); // ~10 XP per minute in VC

        let user = await db.get('SELECT xp, level FROM users WHERE id = ?', [userId]);
        if (!user) {
          await db.run('INSERT INTO users (id, username, xp, level, vc_seconds) VALUES (?, ?, ?, ?, ?)', [
            userId,
            newState.member?.user?.username || 'Unknown',
            vcXp,
            1,
            durationSec,
          ]);
          return;
        }

        const totalXp = user.xp + vcXp;
        const level = user.level;
        const xpNeeded = getXpForNextLevel(level);

        // Handle level up for VC XP
        if (totalXp >= xpNeeded) {
          const newLevel = level + 1;
          const newXp = totalXp - xpNeeded;
          await db.run('UPDATE users SET xp = ?, level = ?, vc_seconds = vc_seconds + ? WHERE id = ?', [
            newXp,
            newLevel,
            durationSec,
            userId,
          ]);

          const systemChannel =
            oldState.guild.systemChannel ||
            oldState.guild.channels.cache.find((c) => c.isTextBased() && c.permissionsFor(client.user)?.has('SendMessages'));

          if (systemChannel)
            await systemChannel.send(`🎧 ${newState.member} just leveled up to **Level ${newLevel}** for VC activity! 🔊`);
        } else {
          await db.run('UPDATE users SET xp = ?, vc_seconds = vc_seconds + ? WHERE id = ?', [
            totalXp,
            durationSec,
            userId,
          ]);
        }
      }
    } catch (err) {
      console.error(chalk.red('[LEVELING] voiceStateUpdate error:'), err);
    }
  });

  console.log(chalk.green('✅ Leveling system v1.5 initialized and listening for activity.'));
}
