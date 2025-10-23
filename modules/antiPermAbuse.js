// 🎛 antiPermAbuse.js v1.4.1 Pro
import chalk from 'chalk';

const LEAVE_THRESHOLD = 2;           // 2 leaves per user
const THRESHOLD_WINDOW_MS = 70 * 1000;  // 70 seconds
const RESET_TIMER_MS = 180 * 1000;      // 180 seconds
const LOCK_DURATION_MS = 60 * 60 * 1000; // 1 hour

// Maps for tracking leaves and locks
const leaveMap = new Map();        // Map<vcId, Map<userId, Array<timestamps>>>
const lockedMap = new Map();       // Map<vcId, Map<userId, Timeout>>
const resetTimers = new Map();     // Map<vcId, Map<userId, Timeout>>

export default function monitorPermAbuse(client) {

  client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
      const user = newState.member ?? oldState?.member;
      if (!user || user.user.bot) return;

      const vcLeft = oldState.channel && !newState.channel; // user left VC
      if (!vcLeft) return;

      const vcId = oldState.channel.id;

      // Admin/Staff/DJ exclusions
      const isExcluded = user.permissions.has('Administrator') ||
                         user.roles.cache.some(r => ['staff', 'dj'].includes(r.name.toLowerCase()));
      if (isExcluded) return;

      // Initialize maps
      if (!leaveMap.has(vcId)) leaveMap.set(vcId, new Map());
      if (!leaveMap.get(vcId).has(user.id)) leaveMap.get(vcId).set(user.id, []);
      const userLeaves = leaveMap.get(vcId).get(user.id);

      const now = Date.now();
      userLeaves.push(now);

      // Filter out old leaves
      const recentLeaves = userLeaves.filter(ts => ts >= now - THRESHOLD_WINDOW_MS);
      leaveMap.get(vcId).set(user.id, recentLeaves);

      // Lock user if threshold exceeded
      if (recentLeaves.length >= LEAVE_THRESHOLD && (!lockedMap.has(vcId) || !lockedMap.get(vcId)?.has(user.id))) {
        if (!lockedMap.has(vcId)) lockedMap.set(vcId, new Map());

        const timeout = setTimeout(() => {
          lockedMap.get(vcId).delete(user.id);
          try {
            user.send(`✅ Your temporary VC lock in <#${vcId}> has been lifted.`);
          } catch {}
          console.log(chalk.green(`[ANTI-PERM] Unlocked ${user.user.tag} in VC ${vcId}`));
        }, LOCK_DURATION_MS);

        lockedMap.get(vcId).set(user.id, timeout);
        console.log(chalk.red(`[ANTI-PERM] Locked ${user.user.tag} from VC ${vcId} for 1 hour due to rapid leaves.`));

        try { user.send(`⛔ You have been temporarily locked from VC <#${vcId}> for 1 hour due to rapid leaves.`); } catch {}

        // Reset leave tracker
        leaveMap.get(vcId).set(user.id, []);

        // Clear any pending reset timer
        if (resetTimers.get(vcId)?.has(user.id)) {
          clearTimeout(resetTimers.get(vcId).get(user.id));
        }
      }

      // Set/reset leave tracker clearing
      if (!resetTimers.has(vcId)) resetTimers.set(vcId, new Map());
      if (resetTimers.get(vcId).has(user.id)) clearTimeout(resetTimers.get(vcId).get(user.id));

      const resetTimeout = setTimeout(() => {
        leaveMap.get(vcId)?.set(user.id, []);
        resetTimers.get(vcId)?.delete(user.id);
      }, RESET_TIMER_MS);

      resetTimers.get(vcId).set(user.id, resetTimeout);

    } catch (err) {
      console.error(chalk.red('[ANTI-PERM] voiceStateUpdate error'), err);
    }
  });

  // ================= $clearlocks command =================
  client.on('messageCreate', async (message) => {
    if (!message.content.toLowerCase().startsWith('$clearlocks')) return;

    const member = message.member;
    const vcId = member.voice.channel?.id;
    if (!vcId) return message.reply('❌ You must be in a VC to clear locks.');

    const isAdminOrStaff = member.permissions.has('Administrator') ||
                           member.roles.cache.some(r => ['staff', 'dj'].includes(r.name.toLowerCase()));
    if (!isAdminOrStaff) return message.reply('❌ Admin/Staff only.');

    // Clear all locks and timers
    if (lockedMap.has(vcId)) {
      for (const [userId, timeout] of lockedMap.get(vcId)) {
        clearTimeout(timeout);
      }
      lockedMap.set(vcId, new Map());
    }

    if (resetTimers.has(vcId)) {
      for (const [userId, timeout] of resetTimers.get(vcId)) {
        clearTimeout(timeout);
      }
      resetTimers.set(vcId, new Map());
    }

    if (leaveMap.has(vcId)) leaveMap.set(vcId, new Map());

    message.reply(`✅ All locks cleared and timers reset for VC <#${vcId}>.`);
    console.log(chalk.green(`[ANTI-PERM] $clearlocks executed in VC ${vcId} by ${member.user.tag}`));
  });

  console.log('✅ AntiPermAbuse module v1.4.1 Pro loaded');
}
