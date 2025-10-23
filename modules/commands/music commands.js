// 🎵 musicCommands.js v1.2 Beta
// Core VC + audio functionality using @discordjs/voice

import {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import { EmbedBuilder } from 'discord.js';

export async function handleMusicCommand(cmd, message, args, roles) {
  const { isAdmin, isStaff, isDJ } = roles;

  if (!isDJ && !isStaff && !isAdmin)
    return message.reply('❌ DJ role or higher required.');

  const vc = message.member.voice.channel;
  if (!vc) return message.reply('🎧 You need to be in a voice channel.');

  const connection = getVoiceConnection(message.guild.id);

  if (cmd === 'join') {
    if (connection) return message.reply('✅ Already connected.');
    joinVoiceChannel({
      channelId: vc.id,
      guildId: message.guild.id,
      adapterCreator: vc.guild.voiceAdapterCreator,
    });
    return message.reply(`🎶 Joined ${vc.name}`);
  }

  if (cmd === 'leave') {
    if (!connection) return message.reply('❌ Not connected.');
    connection.destroy();
    return message.reply('👋 Left voice channel.');
  }

  if (cmd === 'play') {
    const query = args.join(' ');
    if (!query) return message.reply('🎵 Please specify a YouTube URL or search query.');
    if (!ytdl.validateURL(query))
      return message.reply('❌ Only direct YouTube links supported (for now).');

    const stream = ytdl(query, { filter: 'audioonly', highWaterMark: 1 << 25 });
    const resource = createAudioResource(stream);
    const player = createAudioPlayer();
    player.play(resource);

    const conn = connection || joinVoiceChannel({
      channelId: vc.id,
      guildId: message.guild.id,
      adapterCreator: vc.guild.voiceAdapterCreator,
    });

    conn.subscribe(player);
    message.reply(`🎧 Now playing: ${query}`);

    player.on(AudioPlayerStatus.Idle, () => {
      message.channel.send('✅ Playback finished.');
    });
  }

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
