// 🎤 vcManagement.js v1.6 Pro — Voice Channel Tracking & Lock System
import { Events } from 'discord.js';

export default async function vcManagement(client) {
  const lockedUsers = new Set();

  client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
    try {
      const member = newState.member ?? oldState.member;
      if (!member) return;

      // Track leaves
      if (oldState.channelId && !newState.channelId) {
        console.log(`[VC TRACK] ${member.user.tag} left VC ${oldState.channel.name}`);
      }

      // Lock system (no false positives)
      if (lockedUsers.has(member.id)) {
        console.log(`[VC LOCK] ${member.user.tag} attempted re-entry while locked.`);
        const channel = oldState.channel ?? newState.channel;
        if (channel) {
          await member.voice.disconnect().catch(() => null);
        }
      }
    } catch (err) {
      console.error('[VC MANAGEMENT] Error processing voice state:', err);
    }
  });

  client.setVCStatus = async (text) => {
    try {
      const activity = {
        name: text,
        type: 3, // Listening
      };
      await client.user.setActivity(activity);
      console.log(`🎵 VC Activity Status updated: ${text}`);
    } catch (err) {
      console.error('[VC MANAGEMENT] $setstatus failed:', err);
    }
  };

  console.log('✅ VC Management Module active (v1.6 Pro)');
}
