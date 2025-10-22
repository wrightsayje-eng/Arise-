// modules/chatInteraction.js
import User from "../models/User.js";

export async function handleChatMessage(message) {
  if (message.author.bot) return;

  const user = await User.findOne({ userId: message.author.id }) || new User({ userId: message.author.id });

  // Example: verification auto-reply
  if (message.content.toLowerCase().includes("verify")) {
    message.reply(`Yo! To get verified, head to the #AutoVerify channel. Need express? VyBz can ping the admins if you know the password 😉`);
  }

  // Example: AFK whitelist
  if (message.content.toLowerCase() === "!afkwhitelist") {
    const now = new Date();
    user.afkWhitelist = new Date(now.getTime() + 3 * 60 * 60 * 1000); // 3 hrs
    await user.save();
    message.reply("✅ VyBz has whitelisted you from AFK checks for 3 hours.");
  }

  await user.save();
}
