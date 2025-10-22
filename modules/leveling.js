/**
 * ===============================
 * Leveling System
 * ===============================
 */

export function levelingSystem(client, db) {
  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot) return;

      // Add XP for messages
      const user = await db.get('SELECT * FROM users WHERE id = ?', message.author.id);
      if (user) {
        let newXP = user.xp + 10; // Example increment
        let newLevel = user.level;

        // Level up every 100 XP
        if (newXP >= newLevel * 100) {
          newLevel++;
          message.reply(`🎉 Congrats! You've leveled up to level ${newLevel}`);
        }

        await db.run('UPDATE users SET xp = ?, level = ? WHERE id = ?', newXP, newLevel, message.author.id);
      } else {
        await db.run('INSERT INTO users (id, username, xp, level) VALUES (?, ?, ?, ?)', message.author.id, message.author.username, 10, 1);
      }
    } catch (err) {
      console.error('[LEVELING SYSTEM ERROR]', err);
    }
  });
}
