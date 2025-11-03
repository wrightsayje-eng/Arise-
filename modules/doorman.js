// 🟢 doorman.js — DexVyBz DoorMan VC Module v1.0
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField } from 'discord.js';

const DOORMAN_TEXT_CHANNEL = '1434701628551725268'; // Channel where users enter password
const DOORMAN_VC = '1428097939850530897'; // VC users join initially
const SECRET_VC = '1434698733320273982'; // Secret VC to move users to

// Default passwords and their permissions + max uses
const PASSWORDS = {
  "I love boobies": { perms: ["Connect", "Speak"], maxUses: 15 },
  "Fuck Pogi": { perms: ["Connect", "Speak", "MuteMembers", "DeafenMembers"], maxUses: 6 },
  "Loyalty Equals Royalty": { perms: ["Connect", "Speak", "MuteMembers", "DeafenMembers", "MoveMembers"], maxUses: 6 }
};

export default async function setupDoorman(client, db) {

  // ===== Ensure DB table for tracking password uses =====
  await db.exec(`
    CREATE TABLE IF NOT EXISTS doorman (
      password TEXT PRIMARY KEY,
      used INTEGER DEFAULT 0
    )
  `);

  // Insert default passwords if missing
  for (const pass of Object.keys(PASSWORDS)) {
    const row = await db.get('SELECT * FROM doorman WHERE password = ?', [pass]);
    if (!row) {
      await db.run('INSERT INTO doorman(password, used) VALUES (?, 0)', [pass]);
    }
  }

  // ===== Helper to check and increment uses =====
  async function usePassword(password) {
    const row = await db.get('SELECT * FROM doorman WHERE password = ?', [password]);
    if (!row) return false;
    if (row.used >= PASSWORDS[password].maxUses) return false;

    await db.run('UPDATE doorman SET used = used + 1 WHERE password = ?', [password]);
    return true;
  }

  // ===== Setup modal interaction =====
  client.on('interactionCreate', async (interaction) => {
    if (interaction.isModalSubmit()) {
      if (interaction.customId !== 'doormanPasswordModal') return;

      const password = interaction.fields.getTextInputValue('passwordInput');
      const info = PASSWORDS[password];

      if (!info) {
        return interaction.reply({ content: '❌ Invalid password.', ephemeral: true });
      }

      // Check remaining uses
      const success = await usePassword(password);
      if (!success) {
        return interaction.reply({ content: '❌ Password has no remaining uses. Please contact a moderator.', ephemeral: true });
      }

      // Move user to secret VC and set channel permissions
      const member = interaction.member;
      const secretChannel = await client.channels.fetch(SECRET_VC);
      if (!secretChannel || !secretChannel.isVoiceBased()) {
        return interaction.reply({ content: '❌ Secret VC not found.', ephemeral: true });
      }

      // Edit channel permission overwrites for the member
      await secretChannel.permissionOverwrites.edit(member.id, Object.fromEntries(info.perms.map(p => [p, true])));

      // Move the member
      if (member.voice.channelId === DOORMAN_VC) {
        await member.voice.setChannel(SECRET_VC);
      }

      await interaction.reply({ content: `✅ Access granted! You have been moved to the secret VC.`, ephemeral: true });
    }

    // Button to open modal
    if (interaction.isButton()) {
      if (interaction.customId === 'openDoormanModal') {
        const modal = new ModalBuilder()
          .setCustomId('doormanPasswordModal')
          .setTitle('Enter Doorman Password');

        const input = new TextInputBuilder()
          .setCustomId('passwordInput')
          .setLabel('Password')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const row = new ActionRowBuilder().addComponents(input);
        modal.addComponents(row);

        await interaction.showModal(modal);
      }
    }
  });

  // ===== Setup command to post button =====
  client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;

    if (message.content === '$setupdoorman') {
      const button = new ButtonBuilder()
        .setCustomId('openDoormanModal')
        .setLabel('Enter Password')
        .setStyle(ButtonStyle.Primary);

      const row = new ActionRowBuilder().addComponents(button);
      await message.channel.send({ content: '🎫 Click to enter the Doorman password:', components: [row] });
    }
  });

  console.log('✅ Doorman module loaded and ready.');
}
