// modules/lfSquad.js
import User from "../models/User.js";

export async function requestSquad(client, userId, game, guildId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return { message: "Guild not found." };

  const user = await User.findOne({ userId }) || new User({ userId });
  user.squadRequests.push({ game });
  await user.save();

  // Example: DM users with matching roles
  const roleName = `game-${game.toLowerCase()}`;
  const role = guild.roles.cache.find(r => r.name.toLowerCase() === roleName);
  if (!role) return { message: `No one with role ${roleName} found.` };

  role.members.forEach(member => {
    if (!member.user.bot && member.user.id !== userId) {
      try {
        member.send(`🎮 VyBz says: ${message.author.username} is looking for a squad for ${game}!`);
      } catch {}
    }
  });

  return { message: `VyBz sent out your squad request for ${game}.` };
}
