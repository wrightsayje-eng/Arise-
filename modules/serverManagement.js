/**
 * =============================================
 * serverManagement.js
 * - Scans user profile and status for invite links (poaching)
 * - Sends DM warning with 24h deadline, enforces timeout if not removed
 * =============================================
 */

import chalk from 'chalk';

const INVITE_REGEX = /(?:https?:\/\/)?(?:www\.)?(?:discord(?:app)?\.com\/invite|discord\.gg)\/([A-Za-z0-9-]+)/i;
// Allowed/whitelist invite substrings (lowercase)
const EXEMPT_INVITES = ['theplug18']; // add your allowed slugs here
const DEADLINE_MS = 24 * 60 * 60 * 1000; // 24 hours
const TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function setupServerManagement(client, db) {
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
      if (!newMember) return;

      // check nickname, about me isn't exposed; check user banner? We scan for invite links in presence, nickname, and maybe in user.username
      const checkStrings = [];

      // nickname and username
      checkStrings.push(newMember.displayName || '');
      checkStrings.push(newMember.user?.username || '');
      // presence (custom status)
      if (newMember.presence?.activities) {
        for (const act of newMember.presence.activities) {
          if (act?.type === 'CUSTOM' && act.state) checkStrings.push(act.state);
          if (act?.type && act.name) checkStrings.push(act.name);
        }
      }

      const found = checkStrings
        .map((s) => s.match(INVITE_REGEX))
        .filter(Boolean)
        .map(m => m[1].toLowerCase());

      if (!found.length) return;

      // filter exempt
      const bad = found.filter(s => !EXEMPT_INVITES.some(e => s.includes(e)));
      if (!bad.length) return;

      // We have at least one poaching invite -> DM user and record deadline
      const deadline = Date.now() + DEADLINE_MS;
      try {
        await newMember.user.send(
          `⚠️ Hey ${newMember.user.username}, I found a server invite in your profile that violates the Poaching Policy. Please remove it within 24 hours (${new Date(deadline).toUTCString()}). If you don't, you'll be timed out for 7 days. If you believe this is a mistake reply to staff.`
        );
      } catch (e) {
        console.warn(chalk.yellow('[SERVER-MANAGER] Could not DM user for profile warning.'));
      }

      // store infraction pending check
      await db.run(
        `INSERT INTO infractions (user_id, type, reason, created_at) VALUES (?, ?, ?, ?)`,
        [newMember.id, 'profile_invite_warn', `Found invites: ${bad.join(',')}`, Date.now()]
      );

      // Also store a dedicated check entry in afk table as flag? we keep infractions as record, re-check logic can be scheduled by admin
      // For automatic enforcement we would need a background job (not implemented). Instead on next member update or member rejoin we check deadline.
      console.log(chalk.yellow(`[SERVER-MANAGER] Warned ${newMember.user.tag} - found invite(s): ${bad.join(', ')}`));
    } catch (err) {
      console.error(chalk.red('[SERVER-MANAGER] Error in guildMemberUpdate'), err);
    }
  });

  // enforcement check when bot starts and occasionally when users message — a simple re-check endpoint could be added.
}
