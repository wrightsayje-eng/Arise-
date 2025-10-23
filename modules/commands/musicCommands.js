// 🎵 musicCommands.js v1.4.1 Pro — Multi-Source + Queue + Fallback
import {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import { EmbedBuilder } from 'discord.js';
import { getInfo } from 'spotify-url-info';
import fetch from 'node-fetch';

const guildPlayers = new Map(); // Map<guildId, { player, queue: [], nowPlaying: string }>

// Fallback: Spotify / Apple Music URL -> YouTube URL
async function convertToYouTube(query) {
  try {
    // Spotify track/playlist
    if (query.includes('spotify.com')) {
      const info = await getInfo(query);
      if (info?.videoId) return `https://www.youtube.com/watch?v=${info.videoId}`;
      // fallback to track name
      query = info?.name + ' ' + (info?.artists?.map(a => a.name).join(' ') || '');
    }

    // Apple Music: search via iTunes API
    if (query.includes('music.apple.com')) {
      const urlParts = query.split('/i/'); // extract track ID
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
    return query; // fallback to original
  } catch (e) {
    console.error('[MUSIC] convertToYouTube error:', e);
    return query;
  }
}

async function setupMusicCommands(cmd, message, args, roles) {
  const { isAdmin, isStaff, isDJ } = roles;
  const authorTag = `<@${message.author.id}>`;

  if (!isDJ && !isStaff && !isAdmin) return message.reply('❌ DJ role or higher required.');
  const vc = message.member.voice.channel;
  if (!vc) return message.reply('🎧 You must be in a VC to use music commands.');

  let connection = getVoiceConnection(message.guild.id);

  // Join VC
  if (cmd === 'join') {
    if (connection) return message.reply('✅ Already connected.');
    connection = joinVoiceChannel({
      channelId: vc.id,
      guildId: message.guild.id,
      adapterCreator: vc.guild.voiceAdapterCreator,
    });
    return message.reply(`🎶 Joined ${vc.name}`);
  }

  // Leave VC & clear queue
  if (cmd === 'leave') {
    if (!connection) return message.reply('❌ Not connected.');
    const guildObj = guildPlayers.get(message.guild.id);
    if (guildObj) guildObj.queue = [];
    connection.destroy();
    guildPlayers.delete(message.guild.id);
    return message.reply('👋 Left voice channel and cleared queue.');
  }

  // Play / queue track
  if (cmd === 'play') {
    if (!args.length) return message.reply('🎵 Please provide a track URL or search term.');
    let query = args.join(' ');
    let ytUrl = query;

    // Convert Spotify / Apple Music -> YouTube
    if (!ytdl.validateURL(query)) {
      ytUrl = await convertToYouTube(query);
      if (!ytdl.validateURL(ytUrl)) return message.reply('❌ Could not find playable track.');
    }

    // Join if not connected
    if (!connection) {
      connection = joinVoiceChannel({
        channelId: vc.id,
        guildId: message.guild.id,
        adapterCreator: vc.guild.voiceAdapterCreator,
      });
    }

    // Get / create player
    let guildObj = guildPlayers.get(message.guild.id);
    if (!guildObj) {
      const player = createAudioPlayer();
      connection.subscribe(player);
      guildObj = { player, queue: [], nowPlaying: null };
      guildPlayers.set(message.guild.id, guildObj);

      // Auto-play next in queue
      player.on(AudioPlayerStatus.Idle, () => {
        const next = guildObj.queue.shift();
        if (next) playTrack(message, next, message.author);
        else guildObj.nowPlaying = null;
      });

      player.on('error', err => console.error('[MUSIC] Player error:', err));
    }

    // If already playing, queue
    if (guildObj.nowPlaying) {
      guildObj.queue.push(ytUrl);
      return message.reply(`⏱ Added to queue: ${ytUrl}`);
    }

    // Play track
    const playTrack = (msg, trackUrl, user) => {
      const stream = ytdl(trackUrl, { filter: 'audioonly', highWaterMark: 1 << 25 });
      const resource = createAudioResource(stream);
      guildObj.player.play(resource);
      guildObj.nowPlaying = trackUrl;
      msg.channel.send(`🎧 ${authorTag} Now playing: ${trackUrl}`);
    };

    return playTrack(message, ytUrl, message.author);
  }

  // Search placeholder
  if (cmd === 'search') {
    const query = args.join(' ');
    if (!query) return message.reply('🔍 Provide a search term.');
    const embed = new EmbedBuilder()
      .setTitle('🔍 DexVyBz Search Result')
      .setDescription(`Results for **${query}** (feature coming soon...)`)
      .setColor('Purple');
    return message.reply({ embeds: [embed] });
  }
}

export default setupMusicCommands;
