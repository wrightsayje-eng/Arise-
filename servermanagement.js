// modules/serverManagement.js
import User from "../models/User.js";
import { EmbedBuilder } from "discord.js";

export async function runPoachingScan(client, guildId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  guild.members.cache.forEach(async member => {
    if (member.user.bot) return;

    // Example: Check for banned links in nickname or profile
    const bannedLinks = member.user.username.match(/(?!gg|theplug18)\S+discord\.gg\S+/i);
    if (bannedLinks) {
      // Update DB with warning & deadline
      let user = await User.findOne({ userId: member.id });
      if (!user) user = new User({ userId: member.id });
      if (!user.poachingCheck.warned) {
        const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h
        user.poachingCheck = { hasLink: true, warned: true, deadline };
        await user.save();

        // Send DM
        try {
          await member.send(
            `⚠️ Yo! VyBz caught a server link in your profile. Remove it within 24 hours by **${deadline.toUTCString()}** or you'll get timed out.`
          );
        } catch (err) {
          console.log(`❌ Could not DM ${member.user.tag}:`, err.message);
        }
      }
    }
  });
}

export async function enforcePoachingDeadlines(client, guildId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;

  const users = await User.find({ "poachingCheck.hasLink": true, "poachingCheck.warned": true });
  const now = new Date();

  for (const user of users) {
    if (user.poachingCheck.deadline < now) {
      const member = guild.members.cache.get(user.userId);
      if (member) {
        try {
          await member.timeout(7 * 24 * 60 * 60 * 1000, "Failed to remove poaching link"); // 7 days
          await member.send("✅ Thanks for removing the link, or timeout applied.");
        } catch (err) {
          console.log(`❌ Could not timeout ${member.user.tag}:`, err.message);
        }
      }
      user.poachingCheck = { hasLink: false, warned: false, deadline: null };
      await user.save();
    }
  }
}
