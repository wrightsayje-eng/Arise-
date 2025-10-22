/**
 * ===============================
 * Voice Channel Management
 * ===============================
 */

export function setupVCManagement(client, db) {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
      // Track when users join/leave VC
      if (oldState.channelId !== newState.channelId) {
        console.log(`[VC] ${newState.member.user.tag} moved to ${newState.channel?.name || 'none'}`);
      }
    } catch (err) {
      console.error('[VC MANAGEMENT ERROR]', err);
    }
  });
}
