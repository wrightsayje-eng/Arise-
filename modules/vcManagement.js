// 🎧 vcManagement.js v1.2 Beta
// DexBot — Voice Channel monitoring & rapid join/leave protection

import { getDatabase } from '../data/sqliteDatabase.js';

const JOIN_LEAVE_LIMIT = 3; // 2-3 rapid join/leaves
const TIME_WINDOW = 3 * 60 * 1000; // 3 minutes
const LOCK_DURATION = 60 * 60 * 1000; // 1 hour in ms

const joinLeaveMap = new Map();

export default function vcManagement(client) {
  try {
    const dbPromise = getDatabase();

    client.on('voiceStateUpdate', async (oldState, newState) => {
      try {
        const userId = newState.id;
        if (newState.member.user.bot) return;

        const channelIdOld = oldState.channelId;
        const channelIdNew = newState.channelId;
        const timestamp = Date.now();
        const db = await dbPromise;

        // Record join/leave
        if (!channelIdOld && channelIdNew) {
          await db.run(
            `INSERT INTO vc_activity(userId, channelId, joinedAt, leftAt)
             VALUES (?, ?, ?, NULL)`,
            [userId, channelIdNew, timestamp]
          );
        } else if (channelIdOld && !channelIdNew) {
          await db.run(
            `UPDATE vc_activity SET leftAt = ? 
             WHERE userId = ? AND leftAt IS NULL
             ORDER BY joinedAt DESC LIMIT 1`,
            [timestamp, userId]
          );
        }

        // Rapid join/leave logic
        const events = joinLeaveMap.get(userId) || [];
        events.push(timestamp);
        const recent = events.filter(t => timestamp - t <= TIME_WINDOW);
        joinLeaveMap.set(userId, recent);

        if (recent.length >= JOIN_LEAVE_LIMIT) {
          try {
            const guild = newState.guild;
            const member = await guild.members.fetch(userId);
            const channel = guild.channels.cache.get(channelIdNew || channelIdOld);
            if (channel) {
              await channel.permissionOverwrites.edit(member, { Connect: false });
              setTimeout(() => channel.permissionOverwrites.edit(member, { Connect: null }), LOCK_DURATION);
              joinLeaveMap.set(userId, []);
              console.log(`⛔ Locked ${member.user.tag} from ${channel.name} for 1 hour due to rapid join/leaves.`);
            }
          } catch (err) {
            console.error('❌ Failed to lock user:', err);
          }
        }
      } catch (err) {
        console.error('[VC-MANAGEMENT] voiceStateUpdate error', err);
      }
    });

    console.log('✅ VC Management module loaded');
  } catch (err) {
    console.error('❌ Failed to load VC Management module', err);
  }
}
