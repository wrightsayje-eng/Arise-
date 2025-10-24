// 🔗 scanLinks.js v1.3 Pro — Detect & Handle Malicious Links
import { EmbedBuilder, Colors } from 'discord.js';

export default async function scanLinks(client) {
  const suspiciousDomains = ['badlink.com', 'malware.io', 'phishing.net'];

  client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;

    try {
      const found = suspiciousDomains.find(domain => message.content.includes(domain));
      if (found) {
        await message.delete().catch(console.error);
        const embed = new EmbedBuilder()
          .setTitle('⚠️ Suspicious Link Detected')
          .setDescription(`User: ${message.author.tag}\nLink: ${found}`)
          .setColor(Colors.Red)
          .setTimestamp();
        const modChannel = await client.channels.fetch('1358627364132884690').catch(() => null);
        if (modChannel) await modChannel.send({ embeds: [embed] });
      }
    } catch (err) {
      console.error('[SCAN LINKS] Error processing message:', err);
    }
  });

  console.log('✅ Link Scanner Module active (v1.3 Pro)');
}
