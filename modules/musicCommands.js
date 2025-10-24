// 🎵 musicProModule.js v1.4.4 Pro — Commands + Interactions + Queue + Buttons + Dropdown
import {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import fetch from 'node-fetch';

export const guildPlayers = new Map(); // shared map for all guilds

// Fallback: Apple Music URL -> YouTube URL
async function convertToYouTube(query) {
  try {
    if (query.includes('music.apple.com')) {
      const urlParts = query.split('/i/'); 
      if (urlParts[1]) {
        const id = urlParts[1].split('?')[0];
        const res = await fetch(`https://itunes.apple.com/lookup?id=${id}`);
        const data = await res.json();
        if (data.results[0]?.trackName) {
          query = `${data.results[0].trackName} ${data.results[0].artistName}`;
        }
      }
    }

    // YouTube search fallback
    const search = encodeURIComponent(query);
    const ytRes = await fetch(`https://www.youtube.com/results?search_query=${search}`);
    const text = await ytRes.text();
    const match = text.match(/\/watch\?v=(.{11})/);
    if (match) return `https://www.youtube.com/watch?v=${match[1]}`;
    return query;
  } catch (e) {
    console.error('[MUSIC] convertToYouTube error:', e);
    return query;
  }
}

export default async function setupMusicPro(client) {

  client.once('ready', () => {
    console.log('✅ Music Pro Module v1.4.4 loaded and ready');
  });

  // ================== Music Commands ==================
  client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;

    const prefix = '$';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const cmd = args.shift().toLowerCase();

    // Roles & permissions
    const member = message.member;
    const roles = {
      isAdmin: member.permissions.has('Administrator'),
      isStaff: member.roles.cache.some(r => ['staff', 'dj'].includes(r.name.toLowerCase())),
      isDJ: member.roles.cache.some(r => r.name.toLowerCase() === 'dj')
    };

    if (!roles.isAdmin && !roles.isStaff && !roles.isDJ) return;

    const vc = member.voice.channel;
    if (!vc) return message.reply('🎧 You must be in a VC to use music commands.');

    let connection = getVoiceConnection(message.guild.id);

    // ----------------- JOIN -----------------
    if (cmd === 'join') {
      if (connection) return message.reply('✅ Already connected.');
      connection = joinVoiceChannel({
        channelId: vc.id,
        guildId: message.guild.id,
        adapterCreator: vc.guild.voiceAdapterCreator,
      });
      return message.reply(`🎶 Joined ${vc.name}`);
    }

    // ----------------- LEAVE -----------------
    if (cmd === 'leave') {
      if (!connection) return message.reply('❌ Not connected.');
      const guildObj = guildPlayers.get(message.guild.id);
      if (guildObj) guildObj.queue = [];
      connection.destroy();
      guildPlayers.delete(message.guild.id);
      return message.reply('👋 Left voice channel and cleared queue.');
    }

    // ----------------- PLAY -----------------
    if (cmd === 'play') {
      if (!args.length) return message.reply('🎵 Provide a track URL or search term.');
      let query = args.join(' ');
      let ytUrl = query;

      if (!ytdl.validateURL(query)) {
        ytUrl = await convertToYouTube(query);
        if (!ytdl.validateURL(ytUrl)) return message.reply('❌ Could not find playable track.');
      }

      if (!connection) {
        connection = joinVoiceChannel({
          channelId: vc.id,
          guildId: message.guild.id,
          adapterCreator: vc.guild.voiceAdapterCreator,
        });
      }

      let guildObj = guildPlayers.get(message.guild.id);
      if (!guildObj) {
        const player = createAudioPlayer();
        connection.subscribe(player);
        guildObj = { player, queue: [], nowPlaying: null, repeat: false, nowPlayingMessage: null };
        guildPlayers.set(message.guild.id, guildObj);

        player.on(AudioPlayerStatus.Idle, () => {
          const next = guildObj.queue.shift();
          if (next) playTrack(message, next);
          else guildObj.nowPlaying = null;
        });

        player.on('error', err => console.error('[MUSIC] Player error:', err));
      }

      if (guildObj.nowPlaying) {
        guildObj.queue.push(ytUrl);
        return message.reply(`⏱ Added to queue: ${ytUrl}`);
      }

      function playTrack(msg, trackUrl) {
        const stream = ytdl(trackUrl, { filter: 'audioonly', highWaterMark: 1 << 25 });
        const resource = createAudioResource(stream);
        guildObj.player.play(resource);
        guildObj.nowPlaying = trackUrl;
        updateNowPlayingMessage(msg, guildObj);
      }

      playTrack(message, ytUrl);
    }

    // ----------------- SEARCH PLACEHOLDER -----------------
    if (cmd === 'search') {
      const query = args.join(' ');
      if (!query) return message.reply('🔍 Provide a search term.');
      const embed = new EmbedBuilder()
        .setTitle('🔍 DexVyBz Search Result')
        .setDescription(`Results for **${query}** (feature coming soon...)`)
        .setColor('Purple');
      return message.reply({ embeds: [embed] });
    }
  });

  // ================== Button & Menu Interactions ==================
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;

    const guildId = interaction.guildId;
    const guildObj = guildPlayers.get(guildId);
    if (!guildObj) return interaction.reply({ content: '❌ No active player in this server.', ephemeral: true });

    const player = guildObj.player;
    const authorTag = `<@${interaction.user.id}>`;

    // ----------------- BUTTON CONTROLS -----------------
    if (interaction.isButton()) {
      switch (interaction.customId) {
        case 'play_pause':
          if (player.state.status === AudioPlayerStatus.Playing) {
            player.pause();
            await interaction.reply({ content: '⏸️ Paused', ephemeral: true });
          } else {
            player.unpause();
            await interaction.reply({ content: '▶️ Resumed', ephemeral: true });
          }
          break;

        case 'skip':
          const next = guildObj.queue.shift();
          if (next) playTrack(interaction, next);
          else {
            player.stop();
            guildObj.nowPlaying = null;
            updateNowPlayingMessage(interaction, guildObj);
          }
          await interaction.reply({ content: `⏭️ Skipped`, ephemeral: true });
          break;

        case 'stop':
          player.stop();
          guildObj.queue = [];
          guildObj.nowPlaying = null;
          updateNowPlayingMessage(interaction, guildObj);
          await interaction.reply({ content: '⏹️ Stopped playback and cleared queue.', ephemeral: true });
          break;

        case 'repeat':
          guildObj.repeat = !guildObj.repeat;
          await interaction.reply({ content: `🔁 Repeat ${guildObj.repeat ? 'enabled' : 'disabled'}`, ephemeral: true });
          break;
      }
    }

    // ----------------- REMOVE FROM QUEUE -----------------
    if (interaction.isStringSelectMenu() && interaction.customId === 'remove_from_queue') {
      const selectedIndex = parseInt(interaction.values[0], 10);
      const removed = guildObj.queue.splice(selectedIndex, 1);
      updateNowPlayingMessage(interaction, guildObj);
      await interaction.reply({ content: `🗑️ Removed from queue: ${removed[0]}`, ephemeral: true });
    }

    function playTrack(msgOrInteraction, trackUrl) {
      const stream = ytdl(trackUrl, { filter: 'audioonly', highWaterMark: 1 << 25 });
      const resource = createAudioResource(stream);
      player.play(resource);
      guildObj.nowPlaying = trackUrl;
      updateNowPlayingMessage(msgOrInteraction, guildObj);
    }

    async function updateNowPlayingMessage(msgOrInteraction, guildObj) {
      const embed = new EmbedBuilder()
        .setTitle('🎧 Now Playing')
        .setDescription(guildObj.nowPlaying ?? 'Nothing')
        .addFields({ name: 'Queue', value: guildObj.queue.length ? guildObj.queue.map((t, i) => `${i + 1}. ${t}`).join('\n') : 'Empty' })
        .setColor('Purple');

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('play_pause').setLabel('⏯️ Play/Pause').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('skip').setLabel('⏭️ Skip').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('stop').setLabel('⏹️ Stop').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('repeat').setLabel('🔁 Repeat').setStyle(ButtonStyle.Success)
      );

      const selectMenu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('remove_from_queue')
          .setPlaceholder('Remove a track from queue...')
          .addOptions(guildObj.queue.map((t, i) => ({ label: t.slice(0, 80), value: i.toString() })))
      );

      if (guildObj.nowPlayingMessage) {
        await guildObj.nowPlayingMessage.edit({ embeds: [embed], components: [buttons, selectMenu] });
      } else {
        const channel = msgOrInteraction.channel ?? msgOrInteraction.message?.channel;
        guildObj.nowPlayingMessage = await channel.send({ embeds: [embed], components: [buttons, selectMenu] });
      }
    }
  });
}
