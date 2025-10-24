// 🎵 musicCommands.js v1.6 Patched
import {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus
} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } from 'discord.js';
import fetch from 'node-fetch';

export const guildPlayers = new Map();

async function convertToYouTube(query) {
  try {
    if (query.includes('music.apple.com')) {
      const urlParts = query.split('/i/');
      if (urlParts[1]) {
        const id = urlParts[1].split('?')[0];
        const res = await fetch(`https://itunes.apple.com/lookup?id=${id}`);
        const data = await res.json();
        if (data.results[0]?.trackName) query = `${data.results[0].trackName} ${data.results[0].artistName}`;
      }
    }
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
  console.log('✅ Music Pro Module loaded (v1.6 Patched)');

  client.on('messageCreate', async (message) => {
    try {
      if (!message.guild || message.author.bot) return;
      const prefix = '$';
      if (!message.content.startsWith(prefix)) return;

      const args = message.content.slice(prefix.length).trim().split(/ +/);
      const cmd = args.shift()?.toLowerCase();
      if (!cmd) return;

      const member = message.member;
      const roles = {
        isAdmin: member.permissions.has('Administrator'),
        isStaff: member.roles.cache.some(r => ['staff', 'dj'].includes(r.name.toLowerCase())),
        isDJ: member.roles.cache.some(r => r.name.toLowerCase() === 'dj')
      };
      if (!roles.isAdmin && !roles.isStaff && !roles.isDJ) return;

      const vc = member.voice.channel;
      if (!vc && ['join','play'].includes(cmd)) return message.reply('🎧 You must be in a VC to use music commands.');

      let connection = getVoiceConnection(message.guild.id);

      const getGuildObj = () => {
        if (!guildPlayers.has(message.guild.id)) {
          const player = createAudioPlayer();
          if (connection) connection.subscribe(player);
          guildPlayers.set(message.guild.id, { player, queue: [], nowPlaying: null, nowPlayingMessage: null, repeat: false });

          player.on(AudioPlayerStatus.Idle, () => {
            const gObj = guildPlayers.get(message.guild.id);
            const next = gObj.queue.shift();
            if (next) playTrack(gObj, next, message);
            else gObj.nowPlaying = null;
            updateNowPlayingMessage(gObj, message);
          });

          player.on('error', err => console.error('[MUSIC] Player error:', err));
        }
        return guildPlayers.get(message.guild.id);
      };

      function playTrack(gObj, trackUrl, msgOrInteraction) {
        try {
          const stream = ytdl(trackUrl, { filter: 'audioonly', highWaterMark: 1 << 25 });
          const resource = createAudioResource(stream);
          gObj.player.play(resource);
          gObj.nowPlaying = trackUrl;
          updateNowPlayingMessage(gObj, msgOrInteraction);
        } catch (err) { console.error('[MUSIC] playTrack error:', err); }
      }

      async function updateNowPlayingMessage(gObj, msgOrInteraction) {
        const embed = new EmbedBuilder()
          .setTitle('🎧 Now Playing')
          .setDescription(gObj.nowPlaying ?? 'Nothing')
          .addFields({ name: 'Queue', value: gObj.queue.length ? gObj.queue.map((t,i)=>`${i+1}. ${t}`).join('\n') : 'Empty' })
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
            .addOptions(gObj.queue.map((t,i)=>({label:t.slice(0,80),value:i.toString()})))
        );

        try {
          if (gObj.nowPlayingMessage) await gObj.nowPlayingMessage.edit({ embeds: [embed], components: [buttons, selectMenu] });
          else {
            const channel = msgOrInteraction.channel ?? msgOrInteraction.message?.channel;
            gObj.nowPlayingMessage = await channel.send({ embeds: [embed], components: [buttons, selectMenu] });
          }
        } catch (err) { console.error('[MUSIC] updateNowPlayingMessage error:', err); }
      }

      const gObj = getGuildObj();

      if (cmd === 'join') {
        if (connection) return message.reply('✅ Already connected.');
        connection = joinVoiceChannel({ channelId: vc.id, guildId: message.guild.id, adapterCreator: vc.guild.voiceAdapterCreator });
        connection.subscribe(gObj.player);
        return message.reply(`🎶 Joined ${vc.name}`);
      }

      if (cmd === 'leave') {
        if (!connection) return message.reply('❌ Not connected.');
        gObj.queue = [];
        connection.destroy();
        guildPlayers.delete(message.guild.id);
        return message.reply('👋 Left voice channel and cleared queue.');
      }

      if (cmd === 'play') {
        if (!args.length) return message.reply('🎵 Provide a track URL or search term.');
        let query = args.join(' ');
        let ytUrl = query;
        if (!ytdl.validateURL(query)) {
          ytUrl = await convertToYouTube(query);
          if (!ytdl.validateURL(ytUrl)) return message.reply('❌ Could not find playable track.');
        }

        if (!connection) {
          connection = joinVoiceChannel({ channelId: vc.id, guildId: message.guild.id, adapterCreator: vc.guild.voiceAdapterCreator });
          connection.subscribe(gObj.player);
        }

        if (gObj.nowPlaying) { gObj.queue.push(ytUrl); return message.reply(`⏱ Added to queue: ${ytUrl}`); }
        playTrack(gObj, ytUrl, message);
      }

      if (cmd === 'search') {
        const query = args.join(' ');
        if (!query) return message.reply('🔍 Provide a search term.');
        const embed = new EmbedBuilder().setTitle('🔍 DexVyBz Search Result').setDescription(`Results for **${query}** (feature coming soon...)`).setColor('Purple');
        return message.reply({ embeds: [embed] });
      }
    } catch (err) {
      console.error('[MUSIC] messageCreate error:', err);
    }
  });

  client.on('interactionCreate', async (interaction) => {
    try {
      if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
      const guildId = interaction.guildId;
      const gObj = guildPlayers.get(guildId);
      if (!gObj) return interaction.reply({ content: '❌ No active player in this server.', ephemeral: true });
      const player = gObj.player;

      if (interaction.isButton()) {
        switch (interaction.customId) {
          case 'play_pause':
            if (player.state.status === AudioPlayerStatus.Playing) { player.pause(); await interaction.reply({ content: '⏸️ Paused', ephemeral: true }); }
            else { player.unpause(); await interaction.reply({ content: '▶️ Resumed', ephemeral: true }); }
            break;
          case 'skip':
            const next = gObj.queue.shift();
            if (next) playTrack(gObj, next, interaction);
            else { player.stop(); gObj.nowPlaying = null; updateNowPlayingMessage(gObj, interaction); }
            await interaction.reply({ content: '⏭️ Skipped', ephemeral: true });
            break;
          case 'stop':
            player.stop(); gObj.queue=[]; gObj.nowPlaying=null; updateNowPlayingMessage(gObj,interaction);
            await interaction.reply({ content: '⏹️ Stopped playback and cleared queue.', ephemeral:true }); break;
          case 'repeat':
            gObj.repeat=!gObj.repeat; await interaction.reply({ content: `🔁 Repeat ${gObj.repeat?'enabled':'disabled'}`, ephemeral:true }); break;
        }
      }

      if (interaction.isStringSelectMenu() && interaction.customId==='remove_from_queue') {
        const selectedIndex=parseInt(interaction.values[0],10);
        const removed=gObj.queue.splice(selectedIndex,1);
        updateNowPlayingMessage(gObj,interaction);
        await interaction.reply({ content:`🗑️ Removed from queue: ${removed[0]}`, ephemeral:true });
      }
    } catch (err) { console.error('[MUSIC] interactionCreate error:', err); }
  });
}
