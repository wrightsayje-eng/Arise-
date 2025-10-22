// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },

  poachingCheck: {
    hasLink: { type: Boolean, default: false },
    warned: { type: Boolean, default: false },
    deadline: { type: Date, default: null }
  },

  vcStartTime: { type: Date, default: null }, // for AFK / greening out
  afkWhitelist: { type: Date, default: null }, // whitelist timers (3hrs)

  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },

  permAbuseCooldown: { type: Date, default: null },

  squadRequests: [
    {
      game: String,
      requestedAt: { type: Date, default: Date.now },
      responded: { type: Boolean, default: false }
    }
  ]
});

export default mongoose.model("User", userSchema);
