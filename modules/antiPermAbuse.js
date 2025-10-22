/**
 * ===============================
 * Anti-Permission Abuse Monitor
 * ===============================
 */

export function monitorPermAbuse(client, db) {
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    try {
      if (!newMember) return;

      // Example: prevent role escalation
      const oldRoles = oldMember.roles.cache.map(r => r.id);
      const newRoles = newMember.roles.cache.map(r => r.id);

      if (newRoles.length > oldRoles.length) {
        console.log(`[ANTI-ABUSE] ${newMember.user.tag} gained a role.`);
        // Optional: log to DB
      }
    } catch (err) {
      console.error('[ANTI-PERM ABUSE ERROR]', err);
    }
  });
}
