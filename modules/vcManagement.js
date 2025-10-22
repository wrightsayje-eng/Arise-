/**
 * ────────────────【🎤 VC Management Module v0.2】────────────────
 * DexBot monitors rapid VC join/leave events
 * Denies connect permission for 1hr if user leaves/join repeatedly
 * Priority given to leaving events
 * Logs all actions to SQLite database
 */

import { db, logToDB } from "../data/sqliteDatabase.js";

export default function vcManagement(client) {
  const joinLeaveThreshold = 3; // max joins/leaves within timeframe
  const timeWindow = 3 * 60 * 1000; // 3 minutes in ms
  const lockDuration = 60 * 60 * 1000; // 1 hour in ms

  client.on("voiceStateUpdate", async (oldState, newState) => {
    try {
      const userId = newState.id || oldState.id;
      const now = Date.now();

      // Detect join or leave
      const joined = !oldState.channel && newState.channel;
      const left = oldState.channel && !newState.channel;

      if (!joined && !left) return; // skip moves or mute/unmute

      // Fetch user record
      let user = await db.get(`SELECT * FROM users WHERE id = ?`, [userId]);
      if (!user) {
        await db.run(
          `INSERT INTO users (id, join_leave_count, last_join_leave, vc_lock_expiration) VALUES (?, 0, 0, 0)`,
          [userId]
        );
        user = await db.get(`SELECT * FROM users WHERE id = ?`, [userId]);
      }

      // Reset count if outside time window
      if (now - user.last_join_leave > timeWindow) {
        user.join_leave_count = 0;
      }

      // Update counts
      user.join_leave_count += 1;
      user.last_join_leave = now;
      await db.run(
        `UPDATE users SET join_leave_count = ?, last_join_leave = ? WHERE id = ?`,
        [user.join_leave_count, user.last_join_leave, userId]
      );

      // Check for lock condition
      if (user.join_leave_count >= joinLeaveThreshold) {
        const channel = joined ? newState.channel : oldState.channel;
        if (channel) {
          await channel.permissionOverwrites.edit(userId, { Connect: false });
          const expiration = now + lockDuration;
          await db.run(
            `UPDATE users SET vc_lock_expiration = ? WHERE id = ?`,
            [expiration, userId]
          );
          await logToDB("VC_LOCK", `User ${userId} locked from ${channel.name} for 1hr`);
          console.log(`🔒 [VC] User ${userId} locked from ${channel.name} for 1hr`);
        }
      }

      // Unlock after duration (lazy check on next event)
      if (user.vc_lock_expiration && now > user.vc_lock_expiration) {
        const channels = client.channels.cache.filter(c => c.isVoice());
        for (const channel of channels.values()) {
          await channel.permissionOverwrites.edit(userId, { Connect: null });
        }
        await db.run(`UPDATE users SET vc_lock_expiration = 0, join_leave_count = 0 WHERE id = ?`, [
          userId
        ]);
        await logToDB("VC_UNLOCK", `User ${userId} unlocked from all VC channels`);
        console.log(`🔓 [VC] User ${userId} unlocked from all VC channels`);
      }
    } catch (err) {
      console.error("❌ [VC] Error handling voiceStateUpdate:", err);
    }
  });
}
