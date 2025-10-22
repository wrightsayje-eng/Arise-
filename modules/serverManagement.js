// ─────────────────────────────────────────────
// ⚙️ Server Management Module
// Handles guild joins, leaves, and basic server setup
// ─────────────────────────────────────────────

export default function setupServerManagement(client) {
  try {
    client.on("guildCreate", guild => {
      console.log(`[SERVER-MANAGER] Joined new guild: ${guild.name} (${guild.id})`);
      // Setup default roles/channels if needed
    });

    client.on("guildDelete", guild => {
      console.log(`[SERVER-MANAGER] Removed from guild: ${guild.name} (${guild.id})`);
    });

  } catch (error) {
    console.error("[SERVER-MANAGER] ❌ Error initializing module:", error);
  }
}
