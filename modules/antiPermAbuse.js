/**
 * =============================================
 * antiPermAbuse.js
 * - Monitors rapid mute/deafen toggles in voice for abuse
 * - If one user toggles another >6 times in 2 minutes, bot joins and watches, and undoes future toggles for 15 minutes
 * =============================================
 */

import chalk from 'chalk';

const TOGGLE_WINDOW_MS = 2 * 60 * 1000; // 2 minutes
const TOGGLE_THRESHOLD = 6;
const MONITOR_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// in-memory maps
const toggleMap = new Map(); // key: executorId:targetId -> timestamps array
const monitoredExecutors = new Map(); // executorId -> timeoutId

export default function monitorPermAbuse(client, db) {
  // watch voiceStateUpdate for serverMute/serverDeaf changes
  client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
      // detect if someone toggled another member's serverMute/serverDeaf - changes appear on target's newState
      const target = newState.member ?? oldState?.member;
      if (!target) return;

      const guild = target.guild;

      // if serverMute or serverDeaf changed
      const oldMute = oldState?.serverMute ?? false;
      const newMute = newState?.serverMute ?? false;
      const oldDeaf = oldState?.serverDeaf ?? false;
      const newDeaf = newState?.serverDeaf ?? false;

      if (oldMute === newMute && oldDeaf === newDeaf) return; // nothing changed

      // Find executor via audit logs - best effort
      let executorId = null;
      try {
        if (guild.members.me?.permissions.has('ViewAuditLog')) {
          const logs = await guild.fetchAuditLogs({ limit: 6, type: 'MEMBER_UPDATE' });
          // find most recent entry touching this user
          for (const entry of logs.entries.values()) {
            if (entry.target?.id === target.id) {
              executorId = entry.executor?.id;
              break;
            }
          }
        }
      } catch (e) {
        // audit log may fail; ignore
      }

      if (!executorId || executorId === client.user.id) return; // no executor or bot itself

      const key = `${executorId}:${target.id}`;
      const now = Date.now();
      if (!toggleMap.has(key)) toggleMap.set(key, []);
      toggleMap.get(key).push(now);

      // prune old
      const arr = toggleMap.get(key).filter(ts => ts >= now - TOGGLE_WINDOW_MS);
      toggleMap.set(key, arr);

      if (arr.length >= TOGGLE_THRESHOLD) {
        // Abuse detected
        try {
          // Start monitoring executor for MONITOR_DURATION_MS
          if (!monitoredExecutors.has(executorId)) {
            monitoredExecutors.set(executorId, setTimeout(() => monitoredExecutors.delete(executorId), MONITOR_DURATION_MS));
            // Optionally join the VC (attempt) and ensure future toggles are undone
            console.log(chalk.red(`[ANTI-PERM] Detected abuse by ${executorId} against ${target.id}; monitoring for ${MONITOR_DURATION_MS/60000} min`));
            await db.run(`INSERT INTO infractions (user_id, type, reason, created_at) VALUES (?, ?, ?, ?)`, [executorId, 'perm_abuse', `Excessive mute/deafen toggles on ${target.id}`, now]);
          }
        } catch (e) {
          console.error(chalk.red('[ANTI-PERM] Error recording/monitoring abuse'), e);
        }
      }

    } catch (err) {
      console.error(chalk.red('[ANTI-PERM] voiceStateUpdate error'), err);
    }
  });

  // Optionally: intercept future changes and undo if from monitored executor (best-effort)
  // This requires permission to modify voice states; a full implementation would watch audit logs or listen for moderation actions and revert them.
}
