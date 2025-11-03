// modules/doormanModal.js
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionsBitField } from 'discord.js';

const PASSWORDS = {
    "I love boobies": { level: 1, maxUses: 15, used: 0 },
    "Fuck Pogi": { level: 2, maxUses: 6, used: 0 },
    "Loyalty Equals Royalty": { level: 3, maxUses: 6, used: 0 }
};

const SECRET_VC_ID = '1434698733320273982';

export default async function setupDoorman(client, db) {

    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        // ===== Button click → open modal =====
        if (interaction.isButton() && interaction.customId === 'open_password_modal') {
            const modal = new ModalBuilder()
                .setCustomId('doorman_password_modal')
                .setTitle('Enter Doorman Password');

            const passwordInput = new TextInputBuilder()
                .setCustomId('password')
                .setLabel('Password')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter your password')
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(passwordInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
        }

        // ===== Modal submit =====
        if (interaction.isModalSubmit() && interaction.customId === 'doorman_password_modal') {
            const pw = interaction.fields.getTextInputValue('password').trim();
            const entry = PASSWORDS[pw];

            if (!entry) {
                await interaction.reply({ content: '❌ Invalid password.', ephemeral: true });
                return;
            }

            if (entry.used >= entry.maxUses) {
                await interaction.reply({ content: '⚠️ This password has been used up. Ask someone to drag you.', ephemeral: true });
                return;
            }

            // Increment use
            entry.used += 1;

            // Give VC perms
            const guild = interaction.guild;
            const member = interaction.member;
            const vc = guild.channels.cache.get(SECRET_VC_ID);

            if (!vc) {
                await interaction.reply({ content: '❌ Secret VC not found.', ephemeral: true });
                return;
            }

            let perms = [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.Connect,
            ];

            if (entry.level >= 2) {
                perms.push(PermissionsBitField.Flags.MuteMembers, PermissionsBitField.Flags.DeafenMembers);
            }

            if (entry.level >= 3) {
                perms.push(PermissionsBitField.Flags.MoveMembers);
            }

            await vc.permissionOverwrites.edit(member.id, { Allow: perms });

            await interaction.reply({ content: `✅ Access granted! You can join the secret VC. Remaining uses: ${entry.maxUses - entry.used}`, ephemeral: true });
        }
    });

}
