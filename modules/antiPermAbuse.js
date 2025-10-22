// ─────────────────────────────────────────────
// 🛡️ Anti-Permission Abuse Monitor
// Watches for suspicious permission changes in voice channels
// ─────────────────────────────────────────────

export default function monitorPermAbuse(oldState, newState) {
  try {
    const member = newState?.member;
    if (!member) return; // Skip if there's no valid member

    // Example check — customize as needed later
    if (newState.channelId && oldState.channelId !== newState.channelId) {
      console.log(`[SECURITY] ${member.user.tag} switched channels.`);
    }

    // Add more permission abuse detection logic here later...

  } catch (error) {
    console.error("[ANTI-PERM-ABUSE] ❌ Error detected:", error);
  }
}
