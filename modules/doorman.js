// 🟣 doorman.js v1.0 — DexVyBz “DoorMan” System
// Handles secret VC entry using modal password input

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  ChannelType,
  Colors,
  EmbedBuilder,
} from 'discord.js';
import chalk from 'chalk';

export default async function setupDoorman(client, db) {
  console.log(chalk.cyan('🔐 Loading DexVyBz Doorman system...'));

  // ====== CONFIG ======
  const DOORMAN_VC = '1428097939850530897'; // where users first join
  const SECRET_VC = '1434698733320273982'; // secret VC
  const PASSWORD_CHANNEL = '1434701628551725268'; // text channel for password input

  // password tiers
  const PASSWORDS = [
    { pass: 'I love boobies', uses: 15, tier: 1 },
    { pass: 'Fuck Pogi', uses: 6, tier: 2 },
    { pass: 'Loyalty Equals Royalty', uses: 6, tier: 3 },
  ];

  // ====== Ensure DB Table ======
  await db.run(`
    CREATE TABLE IF NOT EXISTS doorPasswords (
      password TEXT PRIMARY KEY,
      usesRemaining INTEGER DEFAULT 0,
      tier INTEGER DEFAULT 1
    )
  `);

  // ====== Ensure Default Passwords ======
  for (const p of PASSWORDS) {
    const existing = await db.get('SELECT * FROM doorPasswords WHERE password = ?', [p.pass]);
    if (!existing) {
      await db.run(
        'INSERT INTO doorPasswords (password, usesRemaining, tier) VALUES (?, ?, ?)',
        [p.pass, p.uses, p.tier]
      );
      console.log(chalk.green(`[DOORMAN] Added password: ${p.pass} (${p.uses} uses)`));
    }
  }

  // ====== Setup Password Modal Button ======
  const channel = await client.channels.fetch(PASSWORD_CHANNEL).catch(() => null);
  if (channel && channel.type === ChannelType.GuildText) {
    const button = new ButtonBuilder()
      .setCustomId('enter_password')
      .setLabel('Enter Password 🔐')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);

    await channel.send({
      content: '🔑 **Dex Doorman Access** — Click the button below to enter your secret password:',
      components: [row],
    });

    console.log(chalk.magenta('✅ Doorman ready in password channel.'));
  }

  // ====== Interaction Handling ======
  client.on('interactionCreate', async (interaction) => {
    // Modal trigger
    if (interaction.isButton() && interaction.customId === 'enter_password') {
      const modal = new ModalBuilder()
        .setCustomId('doorman_modal')
        .setTitle('🔐 Dex Doorman Access');

      const passwordInput = new TextInputBuilder()
        .setCustomId('doorman_password')
        .setLabel('Enter Secret Password')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('Enter your access password...')
        .setRequired(true);

      const firstRow = new ActionRowBuilder().addComponents(passwordInput);
      modal.addComponents(firstRow);

      await interaction.showModal(modal);
    }

    // Modal submission
    if (interaction.isModalSubmit() && interaction.customId === 'doorman_modal') {
      const entered = interaction.fields.getTextInputValue('doorman_password').trim();
      const record = await db.get('SELECT * FROM doorPasswords WHERE password = ?', [entered]);

      const member = interaction.member;
      const guild = interaction.guild;
      const log = (type, reason, extra = '') =>
        client.emit('DeXVyBzAction', {
          type,
          target: member.user.tag,
          reason,
          moderator: 'DoormanSystem',
          extra,
        });

      if (!record) {
        await interaction.reply({
          content: '❌ Invalid password. Please double-check and try again.',
          ephemeral: true,
        });
        log('system', 'Invalid password attempt', entered);
        return;
      }

      if (record.usesRemaining <= 0) {
        await interaction.reply({
          content: `🚪 All uses for **"${entered}"** are used up.\n<@${member.id}> message someone to drag you manually.`,
          ephemeral: false,
        });
        log('system', 'Password uses depleted', entered);
        return;
      }

      // decrement remaining uses
      await db.run('UPDATE doorPasswords SET usesRemaining = usesRemaining - 1 WHERE password = ?', [entered]);

      // move member to secret VC if currently in doorman VC
      try {
        const voiceState = guild.members.me.guild.voiceStates.cache.get(member.id);
        const userVC = member.voice.channel;
        if (userVC?.id === DOORMAN_VC) {
          await member.voice.setChannel(SECRET_VC);
        }
      } catch (err) {
        console.error('[DOORMAN] Move failed:', err);
      }

      // assign perms based on tier
      try {
        const secretVC = await guild.channels.fetch(SECRET_VC);
        if (secretVC) {
          const perms = [
            { id: member.id, allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] },
          ];

          if (record.tier >= 2)
            perms[0].allow.push(PermissionFlagsBits.MuteMembers, PermissionFlagsBits.DeafenMembers);
          if (record.tier >= 3)
            perms[0].allow.push(PermissionFlagsBits.MoveMembers);

          await secretVC.permissionOverwrites.edit(member.id, {
            Connect: true,
            Speak: true,
            MuteMembers: record.tier >= 2,
            DeafenMembers: record.tier >= 2,
            MoveMembers: record.tier >= 3,
          });

          log('system', `Access granted (Tier ${record.tier})`, `${entered} | Remaining: ${record.usesRemaining - 1}`);
        }
      } catch (err) {
        console.error('[DOORMAN] Permission set failed:', err);
      }

      const embed = new EmbedBuilder()
        .setTitle('✅ Access Granted')
        .setDescription(`Welcome <@${member.id}>! You’ve entered the secret VC.`)
        .addFields({ name: 'Tier', value: `**${record.tier}**`, inline: true })
        .setColor(Colors.Green)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  });

  console.log(chalk.green('✅ Doorman module fully initialized.'));
}
