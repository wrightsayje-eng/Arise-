// modules/doormanModal.js (v2)
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionsBitField } from 'discord.js';
import { getDatabase } from '../data/sqliteDatabase.js'; // <-- use your existing DB helper

const SECRET_VC_ID = '1434698733320273982';

export default async function setupDoorman(client) {

    client.on('interactionCreate', async interaction => {
        if (!interaction.isButton() && !interaction.isModalSubmit()) return;

        const db = await getDatabase();

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

            // Fetch password entry from DB
            const entry = await db.get(`SELECT * FROM doorman_passwords WHERE password = ?`, [pw]);
            if (!entry) {
                await interaction.reply({ content: '❌ Invalid password.', ephemeral: true });
                return;
            }

            if (entry.used >= entry.max_uses) {
                await interaction.reply({ content: '⚠️ This password has been used up. Ask someone to drag you.', ephemeral: true });
                return;
            }

            // Increment use count in DB
            await db.run(`UPDATE doorman_passwords SET used = used + 1 WHERE password = ?`, [pw]);

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

            const remaining = entry.max_uses - entry.used - 1; // minus this use
            await interaction.reply({ content: `✅ Access granted! You can join the secret VC. Remaining uses: ${remaining}`, ephemeral: true });
        }
    });

}
