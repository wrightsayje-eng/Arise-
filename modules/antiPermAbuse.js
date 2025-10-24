// antiPermAbuse.js v1.4.3
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const lockedUsers = new Map(); // userId -> { count, timer, locked, lastLeave }
const recentMoves = new Map(); // userId -> lastMoveTimestamp
const rapidLeaveThreshold = 3; // leaves in timeframe
const lockDuration = 3600000; // 1 hour
const debounceTime = 5000; // 5 seconds
const moveCooldown = 3000; // 3 seconds to ignore VC bounce spam

export default async function antiPermAbuse(client) {

  client.on('voiceStateUpdate', async (oldState, newState) => {
    const userId = newState.id;
    const member = newState.member;
    if (member.user.bot) return;

    if (!lockedUsers.has(userId)) lockedUsers.set(userId, { count: 0, timer: null, locked: false, lastLeave: 0 });
    const data = lockedUsers.get(userId);

    // Ignore rapid back-and-forth moves
    const now = Date.now();
    if (recentMoves.has(userId) && now - recentMoves.get(userId) < moveCooldown) return;
    recentMoves.set(userId, now);

    // Track leaves
    if (oldState.channel && !newState.channel) {
      if (now - data.lastLeave < debounceTime) return;
      data.lastLeave = now;

      data.count++;
      console.log(`[ANTI-PERM] ${member.user.tag} left VC ${oldState.channel.id} (count: ${data.count})`);

      if (data.count >= rapidLeaveThreshold && !data.locked) {
        data.locked = true;

        console.log(`[ANTI-PERM] Locking ${member.user.tag} from VC ${oldState.channel.id} for 1 hour due to rapid leaves.`);

        try {
          if (member.voice.channel) await member.voice.disconnect();
        } catch (err) {
          console.error('[ANTI-PERM] Failed to disconnect user:', err);
        }

        data.timer = setTimeout(() => {
          lockedUsers.delete(userId);
          console.log(`[ANTI-PERM] Unlocked ${member.user.tag}`);
        }, lockDuration);
      }
    }
  });

  // $clear command to reset all locks and timers
  client.on('messageCreate', async (message) => {
    if (!message.content.startsWith('$clear')) return;
    if (!message.member.permissions.has('ADMINISTRATOR')) return;

    for (const [userId, data] of lockedUsers) {
      if (data.timer) clearTimeout(data.timer);
      lockedUsers.delete(userId);
    }
    console.log('[ANTI-PERM] All locks and timers cleared by $clear command.');
    message.reply('✅ All anti-perm locks cleared.');
  });
}
