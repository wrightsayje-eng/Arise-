// antiPermAbuse.js v1.4.2
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

const lockedUsers = new Map(); // userId -> { count, timer, locked }
const rapidLeaveThreshold = 3; // leaves in timeframe
const lockDuration = 3600000; // 1 hour
const debounceTime = 5000; // 5 seconds

export default async function antiPermAbuse(client) {

  // Listen to voice state changes
  client.on('voiceStateUpdate', async (oldState, newState) => {
    const userId = newState.id;
    const member = newState.member;

    // ignore bots
    if (member.user.bot) return;

    // Initialize tracking if not exists
    if (!lockedUsers.has(userId)) lockedUsers.set(userId, { count: 0, timer: null, locked: false, lastLeave: 0 });
    const data = lockedUsers.get(userId);

    // Track leaves
    if (oldState.channel && !newState.channel) {
      const now = Date.now();

      // Debounce rapid leaves
      if (now - data.lastLeave < debounceTime) return;
      data.lastLeave = now;

      data.count++;
      console.log(`[ANTI-PERM] ${member.user.tag} left VC ${oldState.channel.id} (count: ${data.count})`);

      if (data.count >= rapidLeaveThreshold && !data.locked) {
        data.locked = true;

        console.log(`[ANTI-PERM] Locking ${member.user.tag} from VC ${oldState.channel.id} for 1 hour due to rapid leaves.`);

        // Attempt disconnect
        try {
          if (member.voice.channel) await member.voice.disconnect();
        } catch (err) {
          console.error('[ANTI-PERM] Failed to disconnect user:', err);
        }

        // Set unlock timer
        data.timer = setTimeout(() => {
          lockedUsers.delete(userId);
          console.log(`[ANTI-PERM] Unlocked ${member.user.tag}`);
        }, lockDuration);
      }
    }
  });

  // $clear command to reset locks
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
