// 🎛 antiPermAbuse.js v1.2 Beta
import chalk from 'chalk';

const TOGGLE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const TOGGLE_THRESHOLD = 6;
const MONITOR_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const toggleMap = new Map();
const monitoredExecutors = new Map();

export default function monitorPermAbuse(client, db) {
  try {
    client.on('voiceStateUpdate', async (oldState, newState) => {
      try {
        const target = newState.member ?? oldState?.member;
        if (!target) return;
        const guild = target.guild;

        const oldMute = oldState?.serverMute ?? false;
        const newMute = newState?.serverMute ?? false;
        const oldDeaf = oldState?.serverDeaf ?? false;
        const newDeaf = newState?.serverDeaf ?? false;
        if (oldMute === newMute && oldDeaf === newDeaf) return;

        let executorId = null;
        try {
          if (guild.members.me?.permissions.has('ViewAuditLog')) {
            const logs = await guild.fetchAuditLogs({ limit: 6, type: 'MEMBER_UPDATE' });
            for (const entry of logs.entries.values()) {
              if (entry.target?.id === target.id) {
                executorId = entry.executor?.id;
                break;
              }
            }
          }
        } catch {}

        if (!executorId || executorId === client.user.id) return;

        const key = `${executorId}:${target.id}`;
        const now = Date.now();
        if (!toggleMap.has(key)) toggleMap.set(key, []);
        toggleMap.get(key).push(now);
        const arr = toggleMap.get(key).filter(ts => ts >= now - TOGGLE_WINDOW_MS);
        toggleMap.set(key, arr);

        if (arr.length >= TOGGLE_THRESHOLD && !monitoredExecutors.has(executorId)) {
          monitoredExecutors.set(executorId, setTimeout(() => monitoredExecutors.delete(executorId), MONITOR_DURATION_MS));
          console.log(chalk.red(`[ANTI-PERM] Detected abuse by ${executorId} on ${target.id} — monitoring for ${MONITOR_DURATION_MS/60000} min`));
          try {
            await db.run(`INSERT INTO infractions (user_id, type, reason, created_at) VALUES (?, ?, ?, ?)`,
              [executorId, 'perm_abuse', `Excessive mute/deafen toggles on ${target.id}`, now]
            );
          } catch (e) {
            console.error(chalk.red('[ANTI-PERM] Failed to record infraction'), e);
          }
        }
      } catch (err) {
        console.error(chalk.red('[ANTI-PERM] voiceStateUpdate error'), err);
      }
    });

    console.log('✅ AntiPermAbuse module loaded');
  } catch (err) {
    console.error('❌ Failed to load AntiPermAbuse module', err);
  }
}
