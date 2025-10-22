/**
 * 🎧 Voice Channel Management Module (Dex VC Guard)
 * -------------------------------------------------
 * Watches for users repeatedly joining/leaving voice channels
 * within a short time window and locks them out for 1 hour.
 *
 * 🧠 Dex Notes:
 *  - Uses SQLite3 to track join/leave timestamps.
 *  - Restricts access by denying "Connect" permission on the VC.
 *  - Automatically cleans up old records to keep DB lightweight.
 */

import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { PermissionsBitField } from "discord.js";

const COOLDOWN_LIMIT = 3; // Number of joins/leaves allowed
const TIME_WINDOW_MS = 3 * 60 * 1000; // 3 minutes
const LOCK_DURATION_MS = 60 * 60 * 1000; // 1 hour

let db;

// 🗂️ Initialize SQLite Database
export async function initVCManagement() {
  db = await open({
    filename: "./data/vcActivity.sqlite",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS vc_activity (
      user_id TEXT,
      guild_id TEXT,
      timestamp INTEGER
    );
  `);
  console.log("🎧 [VC GUARD] Database ready ✅");
}

// 🎯 Watch Voice State Events
export async function handleVoiceStateUpdate(oldState, newState) {
  try {
    const member = newState.member;
    const guild = newState.guild;
    const userId = member.id;

    // Detect leave events (prioritize leaving)
    if (oldState.channelId && !newState.channelId) {
      const now = Date.now();

      // Insert leave record
      await db.run(
        "INSERT INTO vc_activity (user_id, guild_id, timestamp) VALUES (?, ?, ?)",
        [userId, guild.id, now]
      );

      // Cleanup old entries
      await db.run(
        "DELETE FROM vc_activity WHERE timestamp < ?",
        [now - TIME_WINDOW_MS]
      );

      // Count recent leaves
      const records = await db.all(
        "SELECT * FROM vc_activity WHERE user_id = ? AND guild_id = ? AND timestamp > ?",
        [userId, guild.id, now - TIME_WINDOW_MS]
      );

      if (records.length >= COOLDOWN_LIMIT) {
        console.log(
          `🚨 [VC GUARD] ${member.user.tag} triggered rapid leave protection.`
        );

        // Lock all voice channels
        const voiceChannels = guild.channels.cache.filter(
          (ch) => ch.type === 2 // GUILD_VOICE
        );

        for (const [id, channel] of voiceChannels) {
          await channel.permissionOverwrites.edit(userId, {
            Connect: false,
          });
        }

        // Schedule unlock after 1 hour
        setTimeout(async () => {
          for (const [id, channel] of voiceChannels) {
            await channel.permissionOverwrites.delete(userId).catch(() => {});
          }
          console.log(`🔓 [VC GUARD] Unlocked ${member.user.tag} after 1hr.`);
        }, LOCK_DURATION_MS);

        // Log the restriction
        const systemLog = guild.channels.cache.find(
          (c) =>
            c.name.toLowerCase().includes("logs") ||
            c.name.toLowerCase().includes("mod-log")
        );
        if (systemLog) {
          systemLog.send(
            `🚷 **${member.user.tag}** was auto-locked from VC for spam joining/leaving.`
          );
        }
      }
    }
  } catch (err) {
    console.error("❌ [VC GUARD] Error:", err);
  }
}
