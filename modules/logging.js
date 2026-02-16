// 🧩 logging.js — v1.5.0 Pro (DeXVyBz Logging System)
// Handles moderation + system logs to console and channel 1358627364132884690

import { EmbedBuilder, Colors } from 'discord.js';

export default async function setupLogging(client) {
  const LOG_CHANNEL_ID = '1358627364132884690';
  const WHITELIST_ROLE_ID = '1472631826307879003'; // 🔐 Whitelist Role
  const ACCENT = '#DC143C'; // Crimson

  const log = async (type, target, reason, moderator = 'System', extra = '') => {
    const channel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
    const timestamp = new Date().toLocaleString();

    const colorMap = {
      lock: Colors.DarkGrey,
      unlock: Colors.DarkButNotBlack,
      kick: Colors.Orange,
      ban: Colors.DarkRed,
      unban: Colors.Green,
      timeout: Colors.Red,
      system: Colors.DarkButNotBlack
    };

    const embed = new EmbedBuilder()
      .setTitle(`🧩 ${type.toUpperCase()} ACTION`)
      .setColor(colorMap[type] || ACCENT)
      .addFields(
        { name: '👤 Target', value: `${target || 'N/A'}`, inline: true },
        { name: '⚙️ Action', value: type.toUpperCase(), inline: true },
        { name: '🕒 Time', value: timestamp, inline: false },
        { name: '🧠 Reason', value: reason || 'No reason provided', inline: false }
      )
      .setFooter({ text: `Executed by: ${moderator}` });

    if (extra) {
      embed.addFields({ name: '📎 Details', value: extra, inline: false });
    }

    console.log(
      `\x1b[31m[DeXVyBz Log]\x1b[0m ${type.toUpperCase()} → Target: ${target} | Reason: ${reason} | By: ${moderator} | Time: ${timestamp}`
    );

    if (channel) {
      await channel.send({ embeds: [embed] }).catch(console.error);
    }
  };

  // ===============================
  // BAN
  // ===============================
  client.on('guildBanAdd', async (ban) => {
    const { user, guild } = ban;

    log(
      'ban',
      `${user.tag} (${user.id})`,
      'Banned from guild.',
      guild.name
    );
  });

  // ===============================
  // UNBAN
  // ===============================
  client.on('guildBanRemove', async (ban) => {
    const { user, guild } = ban;

    log(
      'unban',
      `${user.tag} (${user.id})`,
      'Unbanned from guild.',
      guild.name
    );
  });

  // ===============================
  // LEAVE / KICK
  // ===============================
  client.on('guildMemberRemove', async (member) => {

    // 🔐 Whitelist Protection
    if (member.roles.cache.has(WHITELIST_ROLE_ID)) {
      return; // Ignore whitelisted users
    }

    log(
      'kick',
      `${member.user.tag} (${member.id})`,
      'User kicked or left.',
      member.guild.name
    );
  });

  // ===============================
  // CUSTOM ACTION EVENT
  // ===============================
  client.on('DeXVyBzAction', async (data) => {
    const { type, target, reason, moderator, extra } = data;
    await log(type, target, reason, moderator, extra);
  });

  console.log('✅ DeXVyBz Logging system active (v1.5.0 Pro — Whitelist Enabled)');
}
