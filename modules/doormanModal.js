// 🟢 doormanModal.js — DexVyBz Doorman VC Modal Logic
import { Events, PermissionsBitField } from 'discord.js';

export default async function setupDoormanModal(client, db) {
  const SECRET_VC_ID = '1434698733320273982';

  // Passwords and usage limits
  const passwords = [
    { text: 'I love boobies', perms: ['VIEW_CHANNEL'], maxUses: 15 },
    { text: 'Fuck Pogi', perms: ['VIEW_CHANNEL', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS'], maxUses: 6 },
    { text: 'Loyalty Equals Royalty', perms: ['VIEW_CHANNEL', 'MUTE_MEMBERS', 'DEAFEN_MEMBERS', 'MOVE_MEMBERS'], maxUses: 6 }
  ];

  // Ensure DB table exists for usage tracking
  await db.run(`
    CREATE TABLE IF NOT EXISTS doormanPasswords (
      password TEXT PRIMARY KEY,
      uses INTEGER DEFAULT 0,
      maxUses INTEGER
    )
  `);

  // Initialize table values
  for (const p of passwords) {
    await db.run(
      `INSERT OR IGNORE INTO doormanPasswords(password, uses, maxUses) VALUES (?, 0, ?)`,
      [p.text, p.maxUses]
    );
  }

  // Handle modal submission
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== 'doormanModal') return;

    const input = interaction.fields.getTextInputValue('vcPassword').trim();

    // Fetch DB entry
    const entry = await db.get(`SELECT * FROM doormanPasswords WHERE password = ?`, [input]);
    if (!entry) {
      await interaction.reply({ content: '❌ Invalid password.', ephemeral: true });
      return;
    }

    if (entry.uses >= entry.maxUses) {
      await interaction.reply({ content: '⚠️ This password has been fully used. Contact staff to be moved manually.', ephemeral: true });
      return;
    }

    // Determine perms
    const passwordObj = passwords.find(p => p.text === input);
    const member = interaction.member;

    const secretVC = await interaction.guild.channels.fetch(SECRET_VC_ID);
    if (!secretVC?.isVoiceBased()) {
      await interaction.reply({ content: '❌ Secret VC not found.', ephemeral: true });
      return;
    }

    // Update permissions
    const permsToApply = {};
    for (const perm of passwordObj.perms) {
      permsToApply[perm] = true;
    }

    await secretVC.permissionOverwrites.edit(member, permsToApply);

    // Move member if in another VC
    if (member.voice.channelId) {
      await member.voice.setChannel(secretVC).catch(() => {});
    }

    // Increment usage
    await db.run(`UPDATE doormanPasswords SET uses = uses + 1 WHERE password = ?`, [input]);

    // Reply ephemeral and delete modal
    await interaction.reply({ content: `✅ Access granted! Enjoy the secret VC.`, ephemeral: true });
  });
}
