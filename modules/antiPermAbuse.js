// 🛡️ AntiPermAbuse Module v1.4.2 Pro – DexVyBz Enforcement Patch
import chalk from 'chalk';

const leaveTracker = new Map();
const lockTimers = new Map();

// === CONFIGURATION ===
const LEAVE_THRESHOLD = 2;              // 2 leaves triggers lock
const TIME_WINDOW = 70 * 1000;          // within 70 seconds
const LOCK_DURATION = 60 * 60 * 1000;   // 1 hour lock
const RESET_TIME = 180 * 1000;          // reset after 180 seconds

export default async function antiPermAbuse(client) {
  client.on('voiceStateUpdate', async (oldState, newState) => {
    const user = newState.member;
    if (!user || user.user.bot) return;

    const leftChannel = oldState.channel;
    const now = Date.now();

    // === Detect VC leave ===
    if (leftChannel && !newState.channel) {
      const userId = user.id;
      if (!leaveTracker.has(userId)) leaveTracker.set(userId, []);
      const leaves = leaveTracker.get(userId);

      // Track leaves in the time window
      leaves.push(now);
      const recent = leaves.filter(ts => now - ts < TIME_WINDOW);
      leaveTracker.set(userId, recent);

      console.log(chalk.yellow(`[ANTI-PERM] ${user.user.username} left VC ${leftChannel.id} (count: ${recent.length})`));

      // === Threshold reached ===
      if (recent.length >= LEAVE_THRESHOLD) {
        console.log(chalk.red(`[ANTI-PERM] Locking ${user.user.username} from VC ${leftChannel.id} for 1 hour due to rapid leaves.`));

        try {
          // Deny CONNECT permission
          await leftChannel.permissionOverwrites.edit(user.id, { Connect: false });

          // Find a text channel to message in
          const textChannel =
            leftChannel.guild.systemChannel ||
            leftChannel.guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(client.user)?.has('SendMessages'));

          if (textChannel) {
            await textChannel.send(
              `Yo This Foo <@${user.id}> tweakin’ 😭 I Had To Lock’em Out For An Hr. Find One Of My Big Homies To Let’em In`
            );
          }

          // Schedule unlock
          const unlockTimer = setTimeout(async () => {
            try {
              await leftChannel.permissionOverwrites.delete(user.id);
              console.log(chalk.green(`[ANTI-PERM] Unlocked ${user.user.username} from VC ${leftChannel.id}`));
            } catch (err) {
              console.error(chalk.red(`[ANTI-PERM] Failed to unlock ${user.user.username}:`), err);
            }
          }, LOCK_DURATION);

          lockTimers.set(userId, unlockTimer);

          // Confirm action in console
          console.log(chalk.green(`[ANTI-PERM] Lock applied successfully for ${user.user.username}`));

        } catch (err) {
          console.error(chalk.red(`[ANTI-PERM] Failed to lock ${user.user.username}:`), err);
        }

        // Reset the user’s tracker
        leaveTracker.delete(userId);
      }

      // Auto clear user data after cooldown
      setTimeout(() => leaveTracker.delete(userId), RESET_TIME);
    }
  });
}
