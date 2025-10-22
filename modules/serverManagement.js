/**
 * ===============================
 * Server Management Utilities
 * ===============================
 */

export function setupServerManagement(client, db) {
  // Example: welcome new members
  client.on('guildMemberAdd', async (member) => {
    try {
      console.log(`[SERVER] New member joined: ${member.user.tag}`);
      // Optional: DB insert
      await db.run('INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)', member.id, member.user.username);
    } catch (err) {
      console.error('[SERVER MANAGEMENT ERROR]', err);
    }
  });
}
