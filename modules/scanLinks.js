// 🔗 scanLinks.js v1.3 Patched
import { EmbedBuilder, Colors } from 'discord.js';
import { getDatabase } from '../data/sqliteDatabase.js';

export default async function scanLinks(client) {
  const db = await getDatabase();

  client.on('messageCreate', async (message) => {
    try {
      if (message.author.bot || !message.guild) return;

      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const matches = message.content.match(urlRegex);
      if (!matches) return;

      const safeLinks = [];
      const blockedLinks = [];

      for (const link of matches) {
        const row = await db.get('SELECT * FROM blocked_links WHERE url = ?', [link]);
        if (row) blockedLinks.push(link);
        else safeLinks.push(link);
      }

      if (blockedLinks.length) {
        await message.delete().catch(() => null);
        const embed = new EmbedBuilder()
          .setTitle('🚫 Blocked Link Detected')
          .setColor(Colors.Red)
          .setDescription(`Blocked: ${blockedLinks.join('\n')}`)
          .setFooter({ text: `User: ${message.author.tag} | ID: ${message.author.id}` });

        message.channel.send({ embeds: [embed] }).catch(() => null);
        console.log(`[SCANLINKS] Deleted blocked links from ${message.author.tag}: ${blockedLinks.join(', ')}`);
      }
    } catch (err) {
      console.error('[SCANLINKS] Error processing messageCreate:', err);
    }
  });

  console.log('✅ Link scanning module loaded (v1.3 Patched)');
}
