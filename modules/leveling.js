// ─────────────────────────────────────────────
// 🎮 Leveling Module
// Tracks points, assigns roles based on activity in chat/VCs
// ─────────────────────────────────────────────

export default function setupLeveling(client, db) { // Pass db if needed
  client.on("messageCreate", async message => {
    try {
      if (message.author.bot) return;

      // Example: increment points for activity
      // const userPoints = await db.collection("users").findOne({ id: message.author.id });
      // Increment points logic goes here

      console.log(`[LEVELING] ${message.author.tag} active in chat`);
      // Assign roles based on points
    } catch (error) {
      console.error("[LEVELING] ❌ Error updating user points:", error);
    }
  });

  client.on("voiceStateUpdate", (oldState, newState) => {
    try {
      if (!newState || !newState.member || !newState.channel) return;

      // Add VC participation points here
      console.log(`[LEVELING] ${newState.member.user.tag} active in VC: ${newState.channel.name}`);
    } catch (error) {
      console.error("[LEVELING] ❌ Error updating VC points:", error);
    }
  });
}
