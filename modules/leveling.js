/**
 * leveling.js v1.4 — DexVyBz
 * Tracks XP from messages and VC activity
 * Sends level-up messages in the same text channel
 * Scaling XP thresholds for progressive leveling
 */

import { EmbedBuilder } from 'discord.js';
import chalk from 'chalk';

// CONFIGURATION
const MESSAGE_XP = 1;
const VC_XP_PER_SEC = 1 / 120; // 1 XP per 2 minutes
const LEVEL_BASE = 280;         // Base XP for Level 2
const LEVEL_MULTIPLIER = 1.5;   // Growth per level

// State
const messageCooldowns = new Map();
const joinTimes = new Map();
const lastLevelSent = new Map();

// ===== Helper: Calculate XP threshold for level N =====
function xpForLevel(level) {
  if (level === 1) return 0;
  let xp = LEVEL_BASE;
  for (let i = 2; i <= level; i++) {
    xp = Math.floor(xp * LEVEL_MULTIPLIER);
  }
  return xp;
}

export default function setupLeveling(client, db) {
  if (!db) return;

  // ===== Text message XP =====
  client.on('messageCreate', async (message) => {
    if (!db || message.author.bot) return;

    const now = Date.now();
    const lastMsg = messageCooldowns.get(message.author.id) || 0;
    if (now - lastMsg < 60000) return; // 1 min cooldown
    messageCooldowns.set(message.author.id, now);

    // Get or create user
    let user = await db.get('SELECT xp, level FROM users WHERE id = ?', [message.author.id]);
    if (!user) {
      await db.run(
        'INSERT INTO users (id, username, xp, level) VALUES (?, ?, ?, ?)',
        [message.author.id, message.author.username, MESSAGE_XP, 1]
      );
      user = { xp: MESSAGE_XP, level: 1 };
    } else {
      user.xp = user.xp || 0;
      user.level = user.level || 1;
      user.xp += MESSAGE_XP;
    }

    // Determine new level
    let newLevel = user.level;
    while (user.xp >= xpForLevel(newLevel + 1)) newLevel++;

    // Send level-up embed if level increased
    if (newLevel > user.level && lastLevelSent.get(message.author.id) !== newLevel) {
      const embed = new EmbedBuilder()
        .setTitle('🎉 Level Up!')
        .setDescription(`${message.author} just reached **Level ${newLevel}**!`)
        .setColor('Random')
        .setTimestamp();

      try {
        await message.channel.send({ embeds: [embed] });
        console.log(chalk.green(`[LEVELING] Level-up delivered to ${message.author.tag} in #${message.channel.name}`));
        lastLevelSent.set(message.author.id, newLevel);
      } catch (err) {
        console.error(chalk.red(`[LEVELING] Failed to send level-up message: `), err);
      }
    }

    await db.run('UPDATE users SET xp = ?, level = ? WHERE id = ?', [user.xp, newLevel, message.author.id]);
  });

  // ===== Voice channel XP =====
  client.on('voiceStateUpdate', async (oldState, newState) => {
    const memberId = newState.id;
    const oldChannel = oldState.channelId;
    const newChannel = newState.channelId;
    const now = Date.now();

    // Join VC
    if (!oldChannel && newChannel) joinTimes.set(memberId, now);

    // Leave VC
    if (oldChannel && !newChannel) {
      const joinedAt = joinTimes.get(memberId);
      if (!joinedAt) return;
      joinTimes.delete(memberId);

      const durationSec = (now - joinedAt) / 1000;
      const xpEarned = Math.floor(durationSec * VC_XP_PER_SEC);

      const user = await db.get('SELECT xp, level FROM users WHERE id = ?', [memberId]);
      if (user) {
        const newXP = user.xp + xpEarned;
        await db.run('UPDATE users SET xp = ? WHERE id = ?', [newXP, memberId]);
        console.log(chalk.blue(`[LEVELING] ${memberId} earned ${xpEarned} XP from VC activity`));
      }
    }
  });

  // ===== Optional: $rank command =====
  client.on('messageCreate', async (message) => {
    if (!db || message.author.bot) return;
    if (!message.content.startsWith('$rank')) return;

    const userId = message.author.id;
    const user = await db.get('SELECT xp, level FROM users WHERE id = ?', [userId]);
    if (!user) {
      return message.channel.send(`You have no XP yet, ${message.author}. Start chatting or joining VC!`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`${message.author.username}'s Rank`)
      .setColor('Random')
      .addFields(
        { name: 'Level', value: `${user.level}`, inline: true },
        { name: 'Total XP', value: `${user.xp}`, inline: true }
      )
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  });
}
