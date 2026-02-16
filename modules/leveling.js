// 🛡️ AntiPermAbuse Module v1.6.0 — Whitelist Role Integrated
import chalk from 'chalk';

const leaveTracker = new Map();
const lockTimers = new Map();

// === CONFIGURATION ===
const LEAVE_THRESHOLD = 2;
const TIME_WINDOW = 70 * 1000;          // 70s to trigger
const LOCK_DURATION = 60 * 60 * 1000;   // 1h lock
const RESET_TIME = 180 * 1000;          // reset window

const ADMIN_CHANNEL_ID = '1342342913773932703';
const WHITELIST_ROLE_ID = '1472631826307879003'; // 🔥 Your whitelist role

export default async function antiPermAbuse(client) {

  // === Clear all locks helper ===
  client.antiPermClearAllLocks = async function () {
    for (const [userId, timer] of lockTimers.entries()) {
      clearTimeout(timer);
      lockTimers.delete(userId);

      try {
        for (const guild of client.guilds.cache.values()) {
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
    const member = newState.member;
    if (!member || member.user.bot) return;

    // ===============================
    // 🔐 WHITELIST ROLE PROTECTION
    // ===============================
    if (member.roles.cache.has(WHITELIST_ROLE_ID)) {
      return; // Completely ignore whitelisted users
    }

    const leftChannel = oldState.channel;
    const now = Date.now();

    // === Detect VC leave ===
    if (leftChannel && !newState.channel) {

      const userId = member.id;

      if (!leaveTracker.has(userId)) {
        leaveTracker.set(userId, []);
      }

      const leaves = leaveTracker.get(userId);
      leaves.push(now);

      const recentLeaves = leaves.filter(ts => now - ts < TIME_WINDOW);
      leaveTracker.set(userId, recentLeaves);

      console.log(
        chalk.yellow(`[ANTI-PERM] ${member.user.username} left VC ${leftChannel.id} (count: ${recentLeaves.length})`)
      );

      if (recentLeaves.length >= LEAVE_THRESHOLD) {

        console.log(
          chalk.red(`[ANTI-PERM] Locking ${member.user.username} from VC ${leftChannel.id} for 1 hour.`)
        );

        const textChannel = leftChannel.guild.channels.cache.get(ADMIN_CHANNEL_ID);

        try {
          await leftChannel.permissionOverwrites.edit(member.id, { Connect: false });

          console.log(
            chalk.green(`[ANTI-PERM] Lock applied successfully for ${member.user.username}`)
          );

          if (textChannel) {
            await textChannel.send(
              `Yo This Foo <@${member.id}> tweakin’ 😭 I Had To Lock'em Out For An Hr.\nFind One Of My Big Homies To Let'em In 🔒`
            );
          }

          // === Schedule Unlock ===
          const unlockTimer = setTimeout(async () => {
            try {
              await leftChannel.permissionOverwrites.delete(member.id);

              console.log(
                chalk.green(`[ANTI-PERM] Unlocked ${member.user.username} from VC ${leftChannel.id}`)
              );

              if (textChannel) {
                await textChannel.send(
                  `Aight <@${member.id}>'s timeout done ⏱️ They can rejoin VC now.`
                );
              }

            } catch (err) {
              console.error(
                chalk.red(`[ANTI-PERM] Unlock failed for ${member.user.username}:`),
                err
              );

              if (textChannel) {
                await textChannel.send(
                  `⚠️ Failed to unlock <@${member.id}> automatically — check VC perms manually.`
                );
              }
            }

          }, LOCK_DURATION);

          lockTimers.set(userId, unlockTimer);

        } catch (err) {
          console.error(
            chalk.red(`[ANTI-PERM] Lock failed for ${member.user.username}:`),
            err
          );

          if (textChannel) {
            await textChannel.send(
              `⚠️ Tried to lock <@${member.id}> but couldn't change permissions. Check my role perms.`
            );
          }
        }

        leaveTracker.delete(userId);
      }

      setTimeout(() => leaveTracker.delete(userId), RESET_TIME);
    }
  });
}
