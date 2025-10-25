// 🛡️ AntiPermAbuse Module v1.5.0 — DexVyBz Pro Lock & Logging Patch
import chalk from 'chalk';

const leaveTracker = new Map();
const lockTimers = new Map();

// === CONFIGURATION ===
const LEAVE_THRESHOLD = 2;
const TIME_WINDOW = 70 * 1000;          // 70s to trigger
const LOCK_DURATION = 60 * 60 * 1000;   // 1h lock
const RESET_TIME = 180 * 1000;          // reset window
const ADMIN_CHANNEL_ID = '1342342913773932703'; // Hardcoded lockout message channel

export default async function antiPermAbuse(client) {

  // === Helper to clear all locks (for $clear command) ===
  client.antiPermClearAllLocks = async function () {
    for (const [userId, timer] of lockTimers.entries()) {
      clearTimeout(timer);
      lockTimers.delete(userId);
      try {
        const guilds = client.guilds.cache;
        for (const guild of guilds.values()) {
          for (const channel of guild.channels.cache.values()) {
            if (channel.isVoiceBased()) {
              const perms = channel.permissionOverwrites.cache.get(userId);
              if (perms) await channel.permissionOverwrites.delete(userId);
            }
          }
        }
      } catch (err) {
        console.error(chalk.red(`[ANTI-PERM] Failed to clear lock for ${userId}:`), err);
      }
    }
  };

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

      leaves.push(now);
      const recent = leaves.filter(ts => now - ts < TIME_WINDOW);
      leaveTracker.set(userId, recent);

      console.log(chalk.yellow(`[ANTI-PERM] ${user.user.username} left VC ${leftChannel.id} (count: ${recent.length})`));

      if (recent.length >= LEAVE_THRESHOLD) {
        console.log(chalk.red(`[ANTI-PERM] Locking ${user.user.username} from VC ${leftChannel.id} for 1 hour due to rapid leaves.`));

        const textChannel = leftChannel.guild.channels.cache.get(ADMIN_CHANNEL_ID);

        try {
          await leftChannel.permissionOverwrites.edit(user.id, { Connect: false });
          console.log(chalk.green(`[ANTI-PERM] Lock applied successfully for ${user.user.username}`));

          if (textChannel) {
            await textChannel.send(
              `Yo This Foo <@${user.id}> tweakin’ 😭 I Had To Lock'em Out For An Hr.\nFind One Of My Big Homies To Let'em In 🔒`
            );
          }

          // Schedule unlock
          const unlockTimer = setTimeout(async () => {
            try {
              await leftChannel.permissionOverwrites.delete(user.id);
              console.log(chalk.green(`[ANTI-PERM] Unlocked ${user.user.username} from VC ${leftChannel.id}`));
              if (textChannel) {
                await textChannel.send(
                  `Aight <@${user.id}>'s timeout done ⏱️ They can rejoin VC now.`
                );
              }
            } catch (err) {
              console.error(chalk.red(`[ANTI-PERM] Unlock failed for ${user.user.username}:`), err);
              if (textChannel) {
                await textChannel.send(`⚠️ Failed to unlock <@${user.id}> automatically — check VC perms manually.`);
              }
            }
          }, LOCK_DURATION);

          lockTimers.set(userId, unlockTimer);
        } catch (err) {
          console.error(chalk.red(`[ANTI-PERM] Lock failed for ${user.user.username}:`), err);
          if (textChannel) {
            await textChannel.send(`⚠️ Tried to lock <@${user.id}> but couldn't change permissions. Check my role perms.`);
          }
        }

        leaveTracker.delete(userId);
      }

      setTimeout(() => leaveTracker.delete(userId), RESET_TIME);
    }
  });
}
