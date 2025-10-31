// 🔗 scanLinks.js v2.0 Pro — Scan User Bios for Poaching Links
import { EmbedBuilder, Colors, PermissionsBitField } from 'discord.js';
import fetch from 'node-fetch';
import chalk from 'chalk';

const AUTO_SCAN_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const WHITELISTED_LINK = '.gg/theplug18';
const LOG_CHANNEL_ID = '1358627364132884690'; // same channel you already have

/**
 * Fetch a member's server profile bio
 */
async function getUserBio(client, userId, guildId) {
  try {
    const res = await fetch(`https://discord.com/api/v10/users/${userId}/profile?guild_id=${guildId}`, {
      headers: {
        Authorization: `Bot ${client.token}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) return '';
    const data = await res.json();
    return data.bio || '';
  } catch (err) {
    console.error(chalk.red('[SCAN LINKS] Failed to fetch bio:'), err);
    return '';
  }
}

/**
 * Scan a single user for server links
 */
async function scanMember(client, member) {
  const bio = await getUserBio(client, member.id, member.guild.id);
  if (!bio) return null;

  const matches = bio.match(/discord\.gg\/\S+/gi) || [];
  const offendingLinks = matches.filter(l => !l.includes(WHITELISTED_LINK));

  return offendingLinks.length ? { member, links: offendingLinks } : null;
}

/**
 * Handle punishment & DM
 */
async function punishMember(client, member, links) {
  const logChannel = await client.channels.fetch(LOG_CHANNEL_ID).catch(() => null);

  const embed = new EmbedBuilder()
    .setTitle('🚨 Poaching Link Detected')
    .setColor(Colors.Red)
    .setDescription(`User: ${member.user.tag}\nLinks: ${links.join(', ')}`)
    .setTimestamp();

  if (logChannel) await logChannel.send({ embeds: [embed] });

  // DM user
  try {
    await member.send(
      `⚠️ You have links in your server bio that violate our anti-poaching policy: ${links.join(', ')}.\n` +
      `You have 24 hours to remove them, or you will be timed out.`
    );
  } catch {
    console.log(chalk.yellow(`[SCAN LINKS] Could not DM ${member.user.tag}`));
  }

  // Timeout 24 hours
  try {
    await member.timeout(24 * 60 * 60 * 1000, 'Poaching link detected in bio');
    console.log(chalk.green(`[SCAN LINKS] Timed out ${member.user.tag} for 24 hours`));
  } catch (err) {
    console.error(`[SCAN LINKS] Failed to timeout ${member.user.tag}:`, err);
  }

  return true;
}

/**
 * Run full scan across guild
 */
export default async function scanLinks(client) {
  const runScan = async (manualTrigger = false, initiator = null) => {
    const guild = client.guilds.cache.first();
    if (!guild) return console.error('[SCAN LINKS] No guild found');

    console.log(chalk.blue(`[SCAN LINKS] Starting ${manualTrigger ? 'manual' : 'auto'} scan...`));

    const members = await guild.members.fetch();
    let totalScanned = 0;
    let totalOffenders = 0;

    for (const [id, member] of members) {
      if (member.user.bot) continue;
      totalScanned++;

      const offending = await scanMember(client, member);
      if (offending) {
        totalOffenders++;
        await punishMember(client, offending.member, offending.links);
      }
    }

    console.log(chalk.green(`[SCAN LINKS] Scan complete. Scanned ${totalScanned}, offenders: ${totalOffenders}`));

    if (manualTrigger && initiator) {
      initiator.send(`✅ Manual scan complete. Scanned **${totalScanned}** members, found **${totalOffenders}** violations.`);
    }
  };

  // Auto scan every 6 hours
  setInterval(runScan, AUTO_SCAN_INTERVAL_MS);

  // Admin-only $scan command
  client.on('messageCreate', async (message) => {
    if (!message.content.toLowerCase().startsWith('$scan')) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    await runScan(true, message.channel);
  });

  console.log('✅ Bio Scan Module active (v2.0 Pro)');
}
