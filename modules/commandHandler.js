// 🎵 musicCommands.js v1.3 Beta — VC + Audio
import {
  joinVoiceChannel,
  getVoiceConnection,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import { EmbedBuilder } from 'discord.js';

export default async function setupMusicCommands(cmd, message, args, roles) {
  const { isAdmin, isStaff, isDJ } = roles;

  console.log(`[MUSIC] Command received: ${cmd} by ${message.author.tag}`);

  if (!isDJ && !isStaff && !isAdmin) {
    console.log(`[MUSIC] Permission denied for ${message.author.tag}`);
    return message.reply('❌ DJ role or higher required.');
  }

  const vc = message.member.voice.channel;
  if (!vc) {
    console.log(`[MUSIC] User not in VC: ${message.author.tag}`);
    return message.reply('🎧 You need to be in a voice channel.');
  }

  const connection = getVoiceConnection(message.guild.id);

  if (cmd === 'join') {
    if (connection) {
      console.log(`[MUSIC] Already connected in ${vc.name}`);
      return message.reply('✅ Already connected.');
    }

    joinVoiceChannel({
      channelId: vc.id,
      guildId: message.guild.id,
      adapterCreator: vc.guild.voiceAdapterCreator,
    });
    console.log(`[MUSIC] Joined VC: ${vc.name}`);
    return message.reply(`🎶 Joined ${vc.name}`);
  }

  if (cmd === 'leave') {
    if (!connection) {
      console.log(`[MUSIC] Not connected in VC`);
      return message.reply('❌ Not connected.');
    }
    connection.destroy();
    console.log(`[MUSIC] Left VC: ${vc.name}`);
    return message.reply('👋 Left voice channel.');
  }

  if (cmd === 'play') {
    const query = args.join(' ');
    if (!query) return message.reply('🎵 Please specify a YouTube URL.');
    if (!ytdl.validateURL(query)) return message.reply('❌ Only direct YouTube links supported.');

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
    console.log(`[MUSIC] Now playing: ${query}`);
    message.reply(`🎧 Now playing: ${query}`);

    player.on(AudioPlayerStatus.Idle, () => {
      console.log('[MUSIC] Playback finished.');
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
    console.log(`[MUSIC] Search requested: ${query}`);
    return message.reply({ embeds: [embed] });
  }
}
