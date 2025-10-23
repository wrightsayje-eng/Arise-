// 🕵️ scanLinks.js v1.0 — DexVyBz Poaching & Invite Link Scan
import chalk from 'chalk';
import { setTimeout as sleep } from 'timers/promises';
import { runQuery, getDatabase } from '../data/sqliteDatabase.js';
import { Colors, EmbedBuilder } from 'discord.js';

const SCAN_ROLE_ID = '1358619270472401031'; // target role for scanning
const PROBATION_ROLE_ID = '1388286503418990873';
const EXEMPT_INVITES = ['theplug18']; // allowed invites
const DEADLINE_MS = 24 * 60 * 60 * 1000; // 24 hours
const SCAN_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours

export default function setupScanLinks(client) {
  const dbPromise = getDatabase();

  // ===== Utility: check invites in strings =====
  const INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord(?:app)?\.com\/invite|discord\.gg)\/([A-Za-z0-9-]+)/gi;
  async function extractBadInvites(user) {
    const checkStrings = [user.displayName, user.user?.username];
    if (user.presence?.activities) {
      for (const act of user.presence.activities) {
        if (act?.type === 'CUSTOM' && act.state) checkStrings.push(act.state);
        if (act?.type && act.name) checkStrings.push(act.name);
      }
    }
    const found = checkStrings
      .map(str => [...(str.matchAll(INVITE_REGEX) || [])].map(m => m[1].toLowerCase()))
      .flat()
      .filter(i => i && !EXEMPT_INVITES.some(e => i.includes(e)));
    return found;
  }

  // ===== Warn & Apply Probation =====
  async function warnUser(member, badInvites) {
    try {
      const db = await dbPromise;
      const deadline = Date.now() + DEADLINE_MS;

      // Add probation role
      const role = member.guild.roles.cache.get(PROBATION_ROLE_ID);
      if (role) await member.roles.add(role).catch(() => null);

      // Record infraction
      await db.run(
        'INSERT INTO infractions(user_id, type, reason, created_at) VALUES (?, ?, ?, ?)',
        [member.id, 'invite_violation', `Found invites: ${badInvites.join(',')}`, Date.now()]
      );

      // DM user
      try {
        await member.user.send(
          `⚠️ Yo ${member.user.username}, Dex spotted a server invite in your profile: **${badInvites.join(', ')}**. ` +
          `Remove it within 24 hours (${new Date(deadline).toUTCString()}) or you’ll be banned. ` +
          `Staff will check back and decide if you pass.`
        );
      } catch {
        console.warn(chalk.yellow(`[SCAN] Could not DM ${member.user.tag}`));
      }

      // Logging
      client.emit('DeXVyBzAction', {
        type: 'warn',
        target: `${member.user.tag} (${member.id})`,
        reason: `Found invites: ${badInvites.join(', ')}`,
        moderator: 'DeXVyBz ScanLinks'
      });

      return deadline;
    } catch (err) {
      console.error('[SCAN] warnUser error', err);
    }
  }

  // ===== Check Compliance After 24h =====
  async function checkCompliance(member) {
    const badInvites = await extractBadInvites(member);
    const db = await dbPromise;

    if (!badInvites.length) {
      // ✅ Compliant
      try {
        await member.user.send(
          `🎉 Yo ${member.user.username}, thanks for removing the invite links — all good! Keep vibing 😎`
        );
      } catch {}
      // Remove probation
      const role = member.guild.roles.cache.get(PROBATION_ROLE_ID);
      if (role) await member.roles.remove(role).catch(() => null);

      client.emit('DeXVyBzAction', {
        type: 'compliant',
        target: `${member.user.tag} (${member.id})`,
        reason: 'User removed poaching invites.',
        moderator: 'DeXVyBz ScanLinks'
      });
    } else {
      // ❌ Ban
      try {
        await member.user.send(
          `⛔ Yo ${member.user.username}, you did not remove the invites in time. You have been banned. ` +
          `Appeal here if you believe this was a mistake: https://discord.gg/c2BqTuGVmF`
        );
      } catch {}

      const role = member.guild.roles.cache.get(PROBATION_ROLE_ID);
      if (role) await member.roles.remove(role).catch(() => null);

      await member.ban({ reason: `Poaching invites: ${badInvites.join(', ')}` }).catch(console.error);

      client.emit('DeXVyBzAction', {
        type: 'ban',
        target: `${member.user.tag} (${member.id})`,
        reason: `Failed to remove invites: ${badInvites.join(', ')}`,
        moderator: 'DeXVyBz ScanLinks'
      });
    }
  }

  // ===== Scan Function =====
  async function runScan() {
    const db = await dbPromise;
    const guild = client.guilds.cache.first(); // single guild assumption

    if (!guild) return console.warn('[SCAN] No guild available');

    const role = guild.roles.cache.get(SCAN_ROLE_ID);
    if (!role) return console.warn('[SCAN] Scan role not found');

    for (const member of role.members.values()) {
      const whitelistRow = await db.get('SELECT * FROM whitelist WHERE user_id = ?', [member.id]);
      if (whitelistRow) continue; // skip whitelisted

      const badInvites = await extractBadInvites(member);
      if (!badInvites.length) continue;

      const deadline = await warnUser(member, badInvites);
      // schedule 24h check
      setTimeout(() => checkCompliance(member), DEADLINE_MS);
    }
  }

  // ===== Automatic Interval =====
  setInterval(runScan, SCAN_INTERVAL_MS);

  // ===== Manual Command Trigger =====
  client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('$scan') || message.author.bot) return;
    const member = message.member;
    const db = await dbPromise;

    // Only staff/admin
    const isAdmin = member.permissions.has('Administrator');
    const isStaff = member.roles.cache.some(r => r.name.toLowerCase() === 'staff');
    if (!isAdmin && !isStaff) return;

    await message.reply('🔍 Running manual scan for invite links...');
    await runScan();
    await message.reply('✅ Manual scan complete.');
  });

  console.log(chalk.green('✅ ScanLinks module loaded — 12h auto scan & manual $scan ready'));
}
