/**
 * ===============================
 * Looking For Squad (LF Squad)
 * ===============================
 */

export function lfSquad(client, db) {
  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot) return;

      if (message.content.startsWith('!lfsquad')) {
        const squadName = message.content.split(' ').slice(1).join(' ') || 'Unnamed Squad';
        await db.run('INSERT INTO squad (user_id, squad_name, timestamp) VALUES (?, ?, ?)', message.author.id, squadName, Date.now());
        message.reply(`✅ You have joined/created squad: ${squadName}`);
      }
    } catch (err) {
      console.error('[LF SQUAD ERROR]', err);
    }
  });
}
