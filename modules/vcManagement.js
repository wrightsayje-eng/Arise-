// modules/vcManagement.js
import User from "../models/User.js";

export async function handleVoiceState(oldState, newState) {
  const member = newState.member;
  if (!member || member.user.bot) return;

  // Example AFK move logic
  const vc = newState.channel;
  if (!vc) return;

  const user = await User.findOne({ userId: member.id }) || new User({ userId: member.id });

  // Greening Out: 30 min in VC muted & deafened
  if (vc && member.voice.mute && member.voice.deaf) {
    if (!user.vcStartTime) user.vcStartTime = new Date();
    const now = new Date();
    if (now - new Date(user.vcStartTime) > 30 * 60 * 1000) { // 30 min
      const afkChannel = vc.guild.channels.cache.find(ch => ch.name.toLowerCase().includes("afk"));
      if (afkChannel && vc.id !== afkChannel.id) member.voice.setChannel(afkChannel);
      // Send funny DM
      try {
        member.send("😴 Yo! VyBz says you greened out! Moved to AFK.");
      } catch {}
      user.vcStartTime = null;
    }
  } else {
    user.vcStartTime = new Date();
  }

  // Save state
  await user.save();
}
