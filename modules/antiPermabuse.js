// 🛡️ AntiPermAbuse Module v1.5.0 Pro – DexVyBz Full Action & Admin Logging Patch
import chalk from 'chalk';

const leaveTracker = new Map();
const lockTimers = new Map();

// === CONFIGURATION ===
const LEAVE_THRESHOLD = 2;
const TIME_WINDOW = 70 * 1000;          // 70s to trigger
const LOCK_DURATION = 60 * 60 * 1000;   // 1h lock
const RESET_TIME = 180 * 1000;          // reset window

export default async function antiPermAbuse(client, db) {
  const adminLogChannelId = 'YOUR_ADMIN_LOG_CHANNEL_ID'; // <-- replace with your admin log channel ID

  // === Voice State Tracking ===
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

      // Track leaves in the window
      leaves.push(now);
      const recent = leaves.filter(ts => now - ts < TIME_WINDOW);
      leaveTracker.set(userId, recent);

      console.log(chalk.yellow(`[ANTI-PERM] ${user.user.username} left VC ${leftChannel.id} (count: ${recent.length})`));

      // === Trigger threshold ===
      if (recent.length >= LEAVE_THRESHOLD) {
        console.log(chalk.red(`[ANTI-PERM] Locking ${user.user.username} from VC ${leftChannel.id} for 1 hour due to rapid leaves.`));

        // Find text channel in same guild for messages
        const textChannel =
          leftChannel.guild.systemChannel ||
          leftChannel.guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(client.user)?.has('SendMessages'));

        try {
          await leftChannel.permissionOverwrites.edit(user.id, { Connect: false });
          console.log(chalk.green(`[ANTI-PERM] Lock applied successfully for ${user.user.username}`));

          if (textChannel) {
            await textChannel.send(
              `Yo This Foo <@${user.id}> tweakin’ 😭 I Had To Lock'em Out For An Hr.\nFind One Of My Big Homies To Let'em In 🔒`
            );
            const logChannel = client.channels.cache.get(adminLogChannelId);
            if (logChannel) logChannel.send(`[ANTI-PERM] Locked ${user.user.tag} in VC ${leftChannel.name} successfully.`);
          }

          // Schedule unlock
          const unlockTimer = setTimeout(async () => {
            try {
              await leftChannel.permissionOverwrites.delete(user.id);
              console.log(chalk.green(`[ANTI-PERM] Unlocked ${user.user.username} from VC ${leftChannel.id}`));
              if (textChannel) textChannel.send(`Aight <@${user.id}>'s timeout done ⏱️ They can rejoin VC now.`);
              const logChannel = client.channels.cache.get(adminLogChannelId);
              if (logChannel) logChannel.send(`[ANTI-PERM] Unlocked ${user.user.tag} from VC ${leftChannel.name}.`);
            } catch (err) {
              console.error(chalk.red(`[ANTI-PERM] Unlock failed for ${user.user.username}:`), err);
              if (textChannel) textChannel.send(`⚠️ Failed to unlock <@${user.id}> automatically — check VC perms manually.`);
              const logChannel = client.channels.cache.get(adminLogChannelId);
              if (logChannel) logChannel.send(`[ANTI-PERM] Failed to unlock ${user.user.tag}: ${err.message}`);
            }
          }, LOCK_DURATION);

          lockTimers.set(userId, unlockTimer);
        } catch (err) {
          console.error(chalk.red(`[ANTI-PERM] Lock failed for ${user.user.username}:`), err);
          if (textChannel) textChannel.send(`⚠️ Tried to lock <@${user.id}> but couldn't change permissions. Check my role perms.`);
          const logChannel = client.channels.cache.get(adminLogChannelId);
          if (logChannel) logChannel.send(`[ANTI-PERM] Lock failed for ${user.user.tag}: ${err.message}`);
        }

        leaveTracker.delete(userId);
      }

      // Auto clear tracker
      setTimeout(() => leaveTracker.delete(userId), RESET_TIME);
    }
  });

  // === Clear Command for Timers/Locks ===
  client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('$clear') || message.author.bot) return;
    leaveTracker.clear();
    lockTimers.forEach(timer => clearTimeout(timer));
    lockTimers.clear();
    console.log(chalk.blue('[ANTI-PERM] All locks and timers cleared by $clear command.'));
    const textChannel = message.channel;
    await textChannel.send('✅ All anti-perm abuse locks and timers have been reset.');
    const logChannel = client.channels.cache.get(adminLogChannelId);
    if (logChannel) logChannel.send(`[ANTI-PERM] $clear command executed by ${message.author.tag}.`);
  });
}
