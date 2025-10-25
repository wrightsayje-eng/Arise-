// 🛡️ antiPermAbuse.js v1.4.2 Patched
export default function antiPermAbuse(client) {
  const leaveData = new Map(); // Tracks users' leave counts and timers

  const THRESHOLD = 2;       // Number of leaves before lock
  const TIME_WINDOW = 70_000; // 70 seconds in ms
  const RESET_TIME = 180_000; // 180 seconds in ms
  const LOCK_DURATION = 60 * 60 * 1000; // 1 hour lock

  client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
      // Ignore if user joins or no channel involved
      if (oldState.channelId === newState.channelId) return;

      const userId = newState.member.id;
      const channelId = oldState.channelId || newState.channelId;

      // Initialize leave tracking
      if (!leaveData.has(userId)) {
        leaveData.set(userId, { count: 0, timer: null });
      }

      const userData = leaveData.get(userId);

      // User left VC
      if (oldState.channelId && !newState.channelId) {
        userData.count += 1;
        console.log(`[ANTI-PERM] ${newState.member.user.tag} left VC ${oldState.channelId} (count: ${userData.count})`);

        // Start/reset the leave timer
        if (userData.timer) clearTimeout(userData.timer);
        userData.timer = setTimeout(() => {
          userData.count = 0;
          console.log(`[ANTI-PERM] Leave count reset for ${newState.member.user.tag}`);
        }, RESET_TIME);

        // Lock if threshold reached
        if (userData.count >= THRESHOLD) {
          userData.count = 0; // Reset count after lock
          try {
            // Lock logic: disconnect user from VC
            const channel = oldState.channel;
            if (channel && channel.members.has(userId)) {
              await channel.permissionOverwrites.edit(userId, { Connect: false });
              console.log(`[ANTI-PERM] Locked ${newState.member.user.tag} from VC ${channel.id} for 1 hour`);

              // Send message in same channel
              const textChannel = channel.guild.channels.cache.find(ch => ch.type === 0); // type 0 = text
              if (textChannel) {
                await textChannel.send(`Yo This Foo <@${userId}> tweakin’ I Had To Lock’em Out For An Hr. Find One Of My Big Homies To Let’em In`);
              }
            }
          } catch (lockErr) {
            console.error(`[ANTI-PERM] Failed to lock ${newState.member.user.tag}:`, lockErr);
          }

          // Unlock after duration
          setTimeout(async () => {
            try {
              const channel = oldState.channel;
              if (channel) {
                await channel.permissionOverwrites.edit(userId, { Connect: true });
                console.log(`[ANTI-PERM] Unlocking ${newState.member.user.tag} after 1 hour`);
              }
            } catch (unlockErr) {
              console.error(`[ANTI-PERM] Failed to unlock ${newState.member.user.tag}:`, unlockErr);
            }
          }, LOCK_DURATION);
        }
      }
    } catch (err) {
      console.error('[ANTI-PERM] voiceStateUpdate handler error:', err);
    }
  });

  // $clear command to remove all locks and timers
  client.on('messageCreate', async (message) => {
    if (!message.guild || message.author.bot) return;
    if (message.content.toLowerCase() === '$clear') {
      leaveData.forEach((data, userId) => {
        if (data.timer) clearTimeout(data.timer);
        const member = message.guild.members.cache.get(userId);
        if (member) {
          const vc = member.voice.channel;
          if (vc) vc.permissionOverwrites.edit(userId, { Connect: true }).catch(() => {});
        }
      });
      leaveData.clear();
      message.channel.send('[ANTI-PERM] All locks and timers cleared by $clear command.');
    }
  });
}
