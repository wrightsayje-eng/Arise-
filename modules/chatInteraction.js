/**
 * ===============================
 * Chat Interaction & Commands
 * ===============================
 */

export function chatInteraction(client, db) {
  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot) return;

      // Simple AFK check example
      if (message.content.startsWith('!afk')) {
        const reason = message.content.split(' ').slice(1).join(' ') || 'AFK';
        const expires = Date.now() + 3 * 60 * 60 * 1000; // 3 hours
        await db.run('INSERT OR REPLACE INTO afk (user_id, reason, expires_at) VALUES (?, ?, ?)', message.author.id, reason, expires);
        message.reply(`You are now AFK for 3 hours: ${reason}`);
      }
    } catch (err) {
      console.error('[CHAT INTERACTION ERROR]', err);
    }
  });
}
