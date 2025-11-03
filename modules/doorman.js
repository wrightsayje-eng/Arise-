// 🟢 doorman.js — DexVyBz Doorman VC Module
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Events
} from 'discord.js';

export default async function setupDoorman(client, db) {
  const DOORMAN_TEXT_CHANNEL = '1434701628551725268'; // Channel where button appears

  // ===== Post initial button on startup =====
  client.once('clientReady', async () => {
    const channel = await client.channels.fetch(DOORMAN_TEXT_CHANNEL).catch(() => null);
    if (!channel?.isTextBased()) return;

    const buttonRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('openDoormanModal')
        .setLabel('Enter VC Password')
        .setStyle(ButtonStyle.Primary)
    );

    // Check if already posted to avoid duplicates
    const messages = await channel.messages.fetch({ limit: 50 });
    if (!messages.some(msg => msg.author.id === client.user.id && msg.components.length)) {
      await channel.send({ content: '🎟 Welcome to the Doorman. Click below to enter your password:', components: [buttonRow] });
      console.log('✅ Doorman button posted in channel.');
    }
  });

  // ===== Handle button clicks =====
  client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'openDoormanModal') return;

    // Defer reply to make it ephemeral
    await interaction.showModal({
      customId: 'doormanModal',
      title: 'Enter VC Password',
      components: [
        {
          type: 1, // Action row
          components: [
            {
              type: 4, // Text input
              customId: 'vcPassword',
              label: 'Enter your password',
              style: 1, // Short
              minLength: 3,
              maxLength: 100,
              required: true,
              placeholder: 'Enter the secret password here'
            }
          ]
        }
      ]
    });
  });
}
