// 🔗 scanLinks.js v2.4 — DexVyBz Poaching Enforcement
import { EmbedBuilder, Colors, PermissionsBitField } from 'discord.js';

const POACHING_LINK_PREFIX = 'https://discord.gg/';
const ALLOWED_SERVER = 'theplug18'; // Only allow this server
const APPEAL_LINK = 'https://discord.gg/cKDnHGscmw';
const SCAN_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
const TIMEOUT_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export default async function setupScanLinks(client, db) {
  if (!db) return console.error('[SCANLINKS] Database not initialized');

  // ===== Ensure tables exist =====
  await db.run(`
    CREATE TABLE IF NOT EXISTS poachingViolators (
      user_id TEXT PRIMARY KEY,
      firstDetected INTEGER,
      repeatOffense INTEGER DEFAULT 0,
      timeoutExpires INTEGER DEFAULT 0
    )
  `);

  await db.run(`
    CREATE TABLE IF NOT EXISTS poachingViolationsHistory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      detectedLink TEXT NOT NULL,
      detectedAt INTEGER NOT NULL
    )
  `);

  const logChannelId = '1358627364132884690'; // Your existing logging channel

  // ===== Helper: enforce a user =====
  async function enforceUser(member, foundLink) {
    const now = Date.now();
    let violator = await db.get('SELECT * FROM poachingViolators WHERE user_id = ?', [member.id]);
    const repeat = violator ? violator.repeatOffense + 1 : 0;

    // Save violation history
    await db.run(
      'INSERT INTO poachingViolationsHistory(user_id, detectedLink, detectedAt) VALUES (?, ?, ?)',
      [member.id, foundLink, now]
    );

    const embed = new EmbedBuilder()
      .setTitle('⚠️ Poaching Link Detected')
      .setDescription(`User: ${member.user.tag}\nLink: ${foundLink}\nAction: 24h Timeout\nRemove the link within 24hrs or face a ban`)
      .setColor(Colors.Red)
      .setTimestamp();

    const logChannel = await client.channels.fetch(logChannelId).catch(() => null);
    if (logChannel?.isTextBased()) await logChannel.send({ embeds: [embed] });

    // DM user
    try {
      await member.send(`🚨 You have a link in your bio (${foundLink}) that violates our server rules. You have 24 hours to remove it. If you fail, you will be banned. Appeal: ${APPEAL_LINK}`);
    } catch (err) {
      console.log(`[SCANLINKS] DM failed for ${member.user.tag}, continuing with punishment`);
    }

    // Apply 24h timeout
    try {
      await member.timeout(TIMEOUT_DURATION_MS, 'Poaching link detected');
    } catch (err) {
      console.error(`[SCANLINKS] Failed to timeout ${member.user.tag}:`, err);
    }

    // Update DB
    await db.run(
      `INSERT INTO poachingViolators(user_id, firstDetected, repeatOffense, timeoutExpires)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id) DO UPDATE SET
       repeatOffense=excluded.repeatOffense,
       timeoutExpires=excluded.timeoutExpires`,
      [member.id, now, repeat, now + TIMEOUT_DURATION_MS]
    );
  }

  // ===== Main scan function =====
  async function scanAllMembers(manual = false, triggerMessage = null) {
    let scanned = 0;
    let detected = 0;
    let timedOut = 0;

    const guilds = client.guilds.cache;
    for (const guild of guilds.values()) {
      await guild.members.fetch();
      for (const member of guild.members.cache.values()) {
        if (member.user.bot) continue;
        scanned++;

        const bio = member.user?.bio || '';
        const match = bio.match(/https:\/\/discord\.gg\/[a-zA-Z0-9]+/gi);
        if (!match) continue;

        const poachingLink = match.find(link => !link.includes(ALLOWED_SERVER));
        if (!poachingLink) continue;

        detected++;
        const violator = await db.get('SELECT * FROM poachingViolators WHERE user_id = ?', [member.id]);

        if (violator && violator.repeatOffense >= 1) {
          // Already timed out before → ban
          try {
            await member.send(`❌ You have repeated the poaching violation. You are being banned. Appeal: ${APPEAL_LINK}`);
          } catch {}
          await member.ban({ reason: 'Repeated poaching link in bio' }).catch(() => null);
        } else {
          await enforceUser(member, poachingLink);
          timedOut++;
        }
      }
    }

    if (manual && triggerMessage) {
      triggerMessage.reply(`✅ Scan complete. Members scanned: ${scanned}, Links detected: ${detected}, Timeouts applied: ${timedOut}`);
    }

    console.log(`[SCANLINKS] Scan finished. Scanned: ${scanned}, Detected: ${detected}, Timeouts: ${timedOut}`);
  }

  // ===== Manual $scan command =====
  client.on('messageCreate', async message => {
    if (!message.content.startsWith('$scan') || message.author.bot) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ Only admins can run this command.');
    }

    await scanAllMembers(true, message);
  });

  // ===== Auto scan interval =====
  setInterval(scanAllMembers, SCAN_INTERVAL_MS);

  console.log('✅ ScanLinks Module active (v2.4) — Poaching enforcement enabled');
}
