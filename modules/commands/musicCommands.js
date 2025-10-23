// 🎵 musicCommands.js v1.4.4 Pro — Multi-Source + Queue + Fallback + Interactions
import {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import { EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';
// Removed Spotify import due to environment restrictions

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

    // Search YouTube
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

export default async function setupMusicCommands(cmd, message, args, roles) {
  const { isAdmin, isStaff, isDJ } = roles;
  const authorTag = `<@${message.author.id}>`;

  if (!isDJ && !isStaff && !isAdmin) return message.reply('❌ DJ role or higher required.');
  const vc = message.member.voice.channel;
  if (!vc) return message.reply('🎧 You must be in a VC to use music commands.');

  let connection = getVoiceConnection(message.guild.id);

  // ================= Join =================
  if (cmd === 'join') {
    if (connection) return message.reply('✅ Already connected.');
    connection = joinVoiceChannel({
      channelId: vc.id,
      guildId: message.guild.id,
      adapterCreator: vc.guild.voiceAdapterCreator,
    });
    return message.reply(`🎶 Joined ${vc.name}`);
  }

  // ================= Leave =================
  if (cmd === 'leave') {
    if (!connection) return message.reply('❌ Not connected.');
    const guildObj = guildPlayers.get(message.guild.id);
    if (guildObj) guildObj.queue = [];
    connection.destroy();
    guildPlayers.delete(message.guild.id);
    return message.reply('👋 Left voice channel and cleared queue.');
  }

  // ================= Play =================
  if (cmd === 'play') {
    if (!args.length) return message.reply('🎵 Please provide a track URL or search term.');
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

  // ================= Search placeholder =================
  if (cmd === 'search') {
    const query = args.join(' ');
    if (!query) return message.reply('🔍 Provide a search term.');
    const embed = new EmbedBuilder()
      .setTitle('🔍 DexVyBz Search Result')
      .setDescription(`Results for **${query}** (feature coming soon...)`)
      .setColor('Purple');
    return message.reply({ embeds: [embed] });
  }

  // ================= Now Playing Embed Update =================
  async function updateNowPlayingMessage(messageOrInteraction, guildObj) {
    const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

    const embed = new EmbedBuilder()
      .setTitle('🎧 Now Playing')
      .setDescription(guildObj.nowPlaying ? guildObj.nowPlaying : 'Nothing')
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
      const channel = messageOrInteraction.channel ?? messageOrInteraction.message?.channel;
      guildObj.nowPlayingMessage = await channel.send({ embeds: [embed], components: [buttons, selectMenu] });
    }
  }
}
