// modules/doorman.js — DexVyBz Doorman Module v1.0
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, Events, PermissionsBitField } from 'discord.js';

const DOORMAN_TEXT_CHANNEL = '1434701628551725268';
const SECRET_VC_CHANNEL = '1434698733320273982';

// Password config
const PASSWORDS = {
  'I love boobies': { uses: 15, perms: { connect: true, speak: true } },
  'Fuck Pogi': { uses: 6, perms: { connect: true, speak: true, muteMembers: true, deafenMembers: true } },
  'Loyalty Equals Royalty': { uses: 6, perms: { connect: true, speak: true, muteMembers: true, deafenMembers: true, moveMembers: true } },
};

export default async function setupDoorman(client, db) {
  // Ensure usage table exists
  await db.run(`
    CREATE TABLE IF NOT EXISTS doorman_usage (
      password TEXT PRIMARY KEY,
      used INTEGER DEFAULT 0
    )
  `);

  // Initialize usage table if empty
  for (const pw of Object.keys(PASSWORDS)) {
    await db.run('INSERT OR IGNORE INTO doorman_usage(password, used) VALUES (?, ?)', [pw, 0]);
  }

  // ===== Setup Command =====
  client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('$setupdoorman')) return;
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) return;

    const channel = await client.channels.fetch(DOORMAN_TEXT_CHANNEL).catch(() => null);
    if (!channel?.isTextBased()) return message.reply('❌ Doorman channel not found.');

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('openDoormanModal')
        .setLabel('Enter VC Password')
        .setStyle(ButtonStyle.Primary)
    );

    await channel.send({
      content: '🎟 Welcome to the Doorman. Click below to enter your password:',
      components: [buttonRow],
    });

    return message.reply('✅ Doorman button posted.');
  });

  // ===== Button Interaction =====
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'openDoormanModal') return;

    const modal = new ModalBuilder()
      .setCustomId('doormanModal')
      .setTitle('Enter VC Password');

    const input = new TextInputBuilder()
      .setCustomId('doormanPassword')
      .setLabel('Password')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('Enter your VC password')
      .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    await interaction.showModal(modal);
  });

  // ===== Modal Submit Handling =====
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isModalSubmit()) return;
    if (interaction.customId !== 'doormanModal') return;

    const pw = interaction.fields.getTextInputValue('doormanPassword').trim();
    const config = PASSWORDS[pw];

    if (!config) return interaction.reply({ content: '❌ Invalid password.', ephemeral: true });

    // Check usage
    const row = await db.get('SELECT used FROM doorman_usage WHERE password = ?', [pw]);
    if (row.used >= config.uses) {
      return interaction.reply({ content: '❌ This password has been used up. Contact a moderator.', ephemeral: true });
    }

    // Increment usage
    await db.run('UPDATE doorman_usage SET used = used + 1 WHERE password = ?', [pw]);

    // Assign permissions
    const guild = interaction.guild;
    const member = interaction.member;
    const vc = await guild.channels.fetch(SECRET_VC_CHANNEL);
    if (!vc?.isVoiceBased()) return interaction.reply({ content: '❌ Secret VC not found.', ephemeral: true });

    const perms = [
      { id: member.id, allow: PermissionsBitField.resolve(config.perms) }
    ];

    await vc.permissionOverwrites.edit(member.id, config.perms);

    // Move member if in VC
    if (member.voice.channel) {
      await member.voice.setChannel(vc).catch(() => null);
    }

    await interaction.reply({ content: `✅ Access granted! You have been moved to the secret VC.`, ephemeral: true });
  });

  console.log('✅ Doorman module active.');
}
