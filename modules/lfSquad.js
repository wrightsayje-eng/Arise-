// ==========================
// Module: LF$ (Looking For $quad)
// Function: Helps users find other players for games
// Author: VyBz / Dex
// ==========================

import { PermissionsBitField } from "discord.js";

/**
 * LF$ module
 * Handles users requesting other players for games
 */
export default function setupLFSquad(client) {
  client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    // Command: !lf <game>
    if (message.content.startsWith("!lf ")) {
      const gameName = message.content.slice(4).trim();
      if (!gameName)
        return message.reply("Yo, you gotta tell me the game, fam! 🎮");

      const guild = message.guild;
      if (!guild) return;

      // Find role for that game
      const gameRole = guild.roles.cache.find(
        (role) => role.name.toLowerCase() === gameName.toLowerCase()
      );

      if (!gameRole)
        return message.reply(
          `No squad exists for **${gameName}** yet! Start one by creating the role!`
        );

      // Filter members who have the role and can be DMed
      const membersToDM = gameRole.members.filter(
        (m) => !m.user.bot
      );

      // DM the members
      membersToDM.forEach(async (member) => {
        try {
          await member.send(
            `Yo ${member.user.username}, VyBz here 🌀: ${message.author.username} is lookin' for a squad for **${gameName}**! Wanna join the fun?`
          );
        } catch (err) {
          console.log(
            `%c[LF$] Could not DM ${member.user.tag}: ${err.message}`,
            "color: red;"
          );
        }
      });

      // Confirm to the requesting user
      message.reply(
        `Squad alert sent for **${gameName}**! VyBz got your back. 🔥`
      );
    }
  });
}
