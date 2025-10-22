// modules/leveling.js
import User from "../models/User.js";

export async function handleMessageXP(message) {
  if (message.author.bot) return;
  const user = await User.findOne({ userId: message.author.id }) || new User({ userId: message.author.id });
  user.xp += 10; // example XP per message
  if (user.xp >= (user.level + 1) * 100) user.level += 1; // level up
  await user.save();
}

export async function handleVCXP(oldState, newState) {
  const member = newState.member;
  if (!member || member.user.bot) return;
  const user = await User.findOne({ userId: member.id }) || new User({ userId: member.id });
  user.xp += 5; // example XP for VC presence
  if (user.xp >= (user.level + 1) * 100) user.level += 1;
  await user.save();
}
