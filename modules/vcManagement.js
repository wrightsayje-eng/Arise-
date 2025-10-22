// 🛠 vcManagement.js v0.3
// DexBot voice channel monitoring — locks out users rapidly joining/leaving.

import { getDatabase } from "../data/sqliteDatabase.js";
import { PermissionsBitField } from "discord.js";

const rapidJoinLeaveMap = new Map(); // userId -> timestamps array
const RAPID_LIMIT = 3; // 2-3 rapid joins/leaves
const TIME_WINDOW = 1.5 * 60 * 1000; // 1.5 min in ms
const LOCK_DURATION = 60 * 60 * 1000; // 1 hour

export function setupVCManagement(client) {
    client.on("voiceStateUpdate", async (oldState, newState) => {
        try {
            const db = await getDatabase();
            const userId = newState.id;
            const channelId = newState.channelId || oldState.channelId;
            const now = Date.now();

            // Log join/leave in DB
            await db.run(
                `INSERT INTO vc_activity (userId, channelId, joinedAt, leftAt)
                 VALUES (?, ?, ?, ?)`,
                [
                    userId,
                    channelId,
                    newState.channelId ? now : null,
                    oldState.channelId && !newState.channelId ? now : null,
                ]
            );

            // Track rapid join/leave
            if (!rapidJoinLeaveMap.has(userId)) rapidJoinLeaveMap.set(userId, []);
            const timestamps = rapidJoinLeaveMap.get(userId);

            // Add timestamp if user left quickly
            if (!newState.channelId && oldState.channelId) {
                timestamps.push(now);

                // Remove old timestamps beyond time window
                while (timestamps.length && now - timestamps[0] > TIME_WINDOW) timestamps.shift();

                // Check if limit exceeded
                if (timestamps.length >= RAPID_LIMIT) {
                    const guild = oldState.guild;
                    const member = guild.members.cache.get(userId);
                    if (member) {
                        // Deny connect permission in all voice channels for 1hr
                        guild.channels.cache.forEach(async (channel) => {
                            if (channel.isVoiceBased()) {
                                await channel.permissionOverwrites.edit(member, {
                                    Connect: false,
                                });
                            }
                        });

                        console.log(`🔒 ${member.user.tag} locked out of VC for 1 hour (rapid join/leave)`);

                        // Clear timestamps
                        rapidJoinLeaveMap.delete(userId);

                        // Schedule unlock
                        setTimeout(async () => {
                            const memberToUnlock = guild.members.cache.get(userId);
                            if (memberToUnlock) {
                                guild.channels.cache.forEach(async (channel) => {
                                    if (channel.isVoiceBased()) {
                                        await channel.permissionOverwrites.edit(memberToUnlock, {
                                            Connect: null,
                                        });
                                    }
                                });
                                console.log(`🔓 ${memberToUnlock.user.tag} VC lock expired`);
                            }
                        }, LOCK_DURATION);
                    }
                }
            }
        } catch (err) {
            console.error("❌ VC Management error:", err);
        }
    });
}
