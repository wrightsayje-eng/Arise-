/**
 * leveling.js v2.0 — DexVyBz
 * - Text XP & Leveling
 * - VC XP & Leveling
 * - Sticky VC Leaderboard (every 10 minutes)
 * - Rank emojis & usernames
 * - XP scaling
 * - Hours display
 * - Help command integration safe
 */

import { EmbedBuilder } from 'discord.js';
import chalk from 'chalk';

// ===== CONFIG =====
const TEXT_XP_PER_MESSAGE = 1;
const TEXT_MESSAGE_COOLDOWN_MS = 60 * 1000; // 1 min
const TEXT_BASE_XP = 280;
const TEXT_LEVEL_MULTIPLIER = 1.5;

const VC_XP_PER_SEC = 1 / 120; // 1 XP per 2 min
const VC_BASE_XP = 280;
const VC_LEVEL_MULTIPLIER = 2;

const VC_ANNOUNCE_CHANNEL_ID = '1342342913773932703';
const VC_LEADERBOARD_CHANNEL_ID = '1432033131430543380';
const VC_LEADERBOARD_UPDATE_MS = 10 * 60 * 1000; // 10 minutes

// ===== STATE =====
const textCooldowns = new Map();
const vcJoinTimes = new Map();
const lastTextLevel = new Map();
const lastVCLevel = new Map();
let vcLeaderboardMessageId = null;
let lastLeaderboardSnapshot = '';

const rankEmojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

// ===== HELPERS =====
function xpForLevel(base, multiplier, level) {
  if (level === 1) return 0;
  let xp = base;
  for (let i = 2; i <= level; i++) xp = Math.floor(xp * multiplier);
  return xp;
}

function formatHours(xp) {
  // Each XP = 2 sec; convert to hours with 1 decimal
  return (xp * 2 / 3600).toFixed(1);
}

// ===== MAIN EXPORT =====
export default async function setupLeveling(client, db) {
  if (!db) return console.error(chalk.red('[LEVELING] Database not initialized'));

  // ===== Ensure table exists =====
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT,
      xp_text INTEGER DEFAULT 0,
      level_text INTEGER DEFAULT 1,
      xp_vc INTEGER DEFAULT 0,
      level_vc INTEGER DEFAULT 1
    )
  `);
  console.log(chalk.green('[LEVELING] users table ensured'));

  // ===== TEXT LEVELING =====
  client.on('messageCreate', async (message) => {
    if (!db || message.author.bot) return;

    const now = Date.now();
    const lastMsg = textCooldowns.get(message.author.id) || 0;
    if (now - lastMsg < TEXT_MESSAGE_COOLDOWN_MS) return;
    textCooldowns.set(message.author.id, now);

    // Fetch or create user
    let user = await db.get('SELECT xp_text, level_text, username FROM users WHERE id = ?', [message.author.id]);
    if (!user) {
      await db.run(
        'INSERT INTO users (id, username, xp_text, level_text, xp_vc, level_vc) VALUES (?, ?, ?, ?, ?, ?)',
        [message.author.id, message.author.username, TEXT_XP_PER_MESSAGE, 1, 0, 1]
      );
      user = { xp_text: TEXT_XP_PER_MESSAGE, level_text: 1, username: message.author.username };
    } else {
      user.xp_text = user.xp_text || 0;
      user.level_text = user.level_text || 1;
      user.xp_text += TEXT_XP_PER_MESSAGE;
    }

    let newLevel = user.level_text;
    while (user.xp_text >= xpForLevel(TEXT_BASE_XP, TEXT_LEVEL_MULTIPLIER, newLevel + 1)) newLevel++;

    if (newLevel > user.level_text && lastTextLevel.get(message.author.id) !== newLevel) {
      const embed = new EmbedBuilder()
        .setTitle('🎉 Level Up!')
        .setDescription(`${message.author} reached **Level ${newLevel}** in chat!`)
        .setColor('Red')
        .setTimestamp();

      try {
        await message.channel.send({ embeds: [embed] });
        lastTextLevel.set(message.author.id, newLevel);
        console.log(chalk.green(`[LEVELING] Text level-up for ${message.author.tag}`));
      } catch (err) {
        console.error(chalk.red('[LEVELING] Failed to deliver text level-up:'), err);
      }
    }

    await db.run('UPDATE users SET xp_text = ?, level_text = ? WHERE id = ?', [user.xp_text, newLevel, message.author.id]);
  });

  // ===== VC LEVELING =====
  client.on('voiceStateUpdate', async (oldState, newState) => {
    const memberId = newState.id;
    const oldChannel = oldState.channelId;
    const newChannel = newState.channelId;
    const now = Date.now();

    if (!oldChannel && newChannel) vcJoinTimes.set(memberId, now);

    if (oldChannel && !newChannel) {
      const joinedAt = vcJoinTimes.get(memberId);
      if (!joinedAt) return;
      vcJoinTimes.delete(memberId);

      const durationSec = (now - joinedAt) / 1000;
      const xpEarned = Math.floor(durationSec * VC_XP_PER_SEC);

      let user = await db.get('SELECT xp_vc, level_vc, username FROM users WHERE id = ?', [memberId]);
      if (!user) return;

      const newXP = (user.xp_vc || 0) + xpEarned;
      let newLevel = user.level_vc || 1;
      while (newXP >= xpForLevel(VC_BASE_XP, VC_LEVEL_MULTIPLIER, newLevel + 1)) newLevel++;

      await db.run('UPDATE users SET xp_vc = ?, level_vc = ?, username = ? WHERE id = ?', [
        newXP,
        newLevel,
        newState.member?.user.username || user.username,
        memberId
      ]);
      console.log(chalk.blue(`[LEVELING] ${memberId} earned ${xpEarned} XP in VC, total XP: ${newXP}`));

      if (newLevel > user.level_vc && lastVCLevel.get(memberId) !== newLevel) {
        const vcChannel = await newState.guild.channels.fetch(VC_ANNOUNCE_CHANNEL_ID);
        if (vcChannel?.isTextBased()) {
          const embed = new EmbedBuilder()
            .setTitle('🎉 VC Level Up!')
            .setDescription(`<@${memberId}> reached **Level ${newLevel}** from VC activity!`)
            .setColor('Red')
            .setTimestamp();
          try {
            await vcChannel.send({ embeds: [embed] });
            lastVCLevel.set(memberId, newLevel);
            console.log(chalk.green(`[LEVELING] VC level-up delivered for ${memberId}`));
          } catch (err) {
            console.error(chalk.red('[LEVELING] Failed to deliver VC level-up:'), err);
          }
        }
      }
    }
  });

  // ===== STICKY VC LEADERBOARD =====
  async function updateVcLeaderboard() {
    try {
      const channel = await client.channels.fetch(VC_LEADERBOARD_CHANNEL_ID);
      if (!channel?.isTextBased()) return;

      const topUsers = await db.all('SELECT id, username, xp_vc, level_vc FROM users ORDER BY xp_vc DESC LIMIT 10');

      const leaderboardDescription = topUsers.map((u, i) => {
        const rankEmoji = rankEmojis[i] || `${i + 1}.`;
        return `${rankEmoji} <@${u.id}> — Level ${u.level_vc} | ${u.xp_vc} XP | ${formatHours(u.xp_vc)} hrs`;
      }).join('\n');

      if (!leaderboardDescription) return;

      if (leaderboardDescription === lastLeaderboardSnapshot) {
        console.log(chalk.yellow('[VC Leaderboard] No changes since last update.'));
        return;
      }

      lastLeaderboardSnapshot = leaderboardDescription;

      const embed = new EmbedBuilder()
        .setTitle('🎧 VC Leaderboard')
        .setDescription(leaderboardDescription)
        .setColor('Red')
        .setTimestamp();

      if (vcLeaderboardMessageId) {
        try {
          const msg = await channel.messages.fetch(vcLeaderboardMessageId);
          await msg.edit({ embeds: [embed] });
        } catch {
          const msg = await channel.send({ embeds: [embed] });
          vcLeaderboardMessageId = msg.id;
        }
      } else {
        const msg = await channel.send({ embeds: [embed] });
        vcLeaderboardMessageId = msg.id;
      }

      console.log(chalk.green('[VC Leaderboard] Updated successfully'));
    } catch (err) {
      console.error(chalk.red('[VC Leaderboard] Update failed:'), err);
    }
  }

  setInterval(updateVcLeaderboard, VC_LEADERBOARD_UPDATE_MS);
  client.once('clientReady', updateVcLeaderboard);

  // ===== $rank command =====
  client.on('messageCreate', async (message) => {
    if (!db || message.author.bot) return;
    if (message.content.toLowerCase() !== '$rank') return;

    const user = await db.get('SELECT xp_text, level_text, xp_vc, level_vc FROM users WHERE id = ?', [message.author.id]);
    if (!user) return message.channel.send(`You have no XP yet, ${message.author}.`);

    const embed = new EmbedBuilder()
      .setTitle(`${message.author.username}'s Rank`)
      .setColor('Red')
      .addFields(
        { name: '💬 Chat Level', value: `${user.level_text}`, inline: true },
        { name: '✉️ Chat XP', value: `${user.xp_text}`, inline: true },
        { name: '🎧 VC Level', value: `${user.level_vc}`, inline: true },
        { name: '⏱️ VC XP', value: `${user.xp_vc} | ${formatHours(user.xp_vc)} hrs`, inline: true }
      )
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  });
}
