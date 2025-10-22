import express from "express";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import dotenv from "dotenv";
import mongoose from "mongoose";
import chalk from "chalk"; // for colored console outputs
dotenv.config();

/* ========================
   EXPRESS SERVER SECTION
   Keep VyBz awake with uptime monitor
======================== */
const app = express();
app.get("/", (req, res) => {
  res.send("VyBz is awake! 🔥");
});
app.listen(process.env.PORT || 3000, () => {
  console.log(chalk.green(`🟢 Express server running on port ${process.env.PORT || 3000}`));
});

/* ========================
   MONGODB CONNECTION SECTION
======================== */
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(chalk.green("✅ MongoDB connected — VyBz is vibin'"));
  } catch (err) {
    console.error(chalk.red("❌ MongoDB connection error:"), err);
  }
}
connectDB();

/* ========================
   MODULE IMPORT SECTION
======================== */
import { runPoachingScan, enforcePoachingDeadlines } from "./modules/serverManagement.js";
import { handleVoiceState } from "./modules/vcManagement.js";
import { handleChatMessage } from "./modules/chatInteraction.js";
import { requestSquad } from "./modules/lfSquad.js";
import { monitorPermAbuse } from "./modules/antiPermAbuse.js";
import { handleMessageXP, handleVCXP } from "./modules/leveling.js";

/* ========================
   DISCORD CLIENT SETUP SECTION
======================== */
const VyBz = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences, // optional
  ],
  partials: [Partials.Channel],
});

/* ========================
   READY EVENT SECTION
======================== */
VyBz.once("ready", () => {
  console.log(chalk.green(`🟢 ${VyBz.user.tag} is online and flexin' 😎`));

  // Periodic Poaching Scan
  setInterval(() => {
    VyBz.guilds.cache.forEach(async guild => {
      try {
        await runPoachingScan(VyBz, guild.id);
        await enforcePoachingDeadlines(VyBz, guild.id);
        console.log(chalk.yellow(`⚡ Poaching scan completed for guild ${guild.name}`));
      } catch (err) {
        console.error(chalk.red(`❌ Error in poaching scan for guild ${guild.name}:`), err);
      }
    });
  }, 30 * 60 * 1000); // every 30 minutes
});

/* ========================
   VOICE STATE UPDATE SECTION
======================== */
VyBz.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    handleVoiceState(oldState, newState);      // AFK, CAM ONLY, Whitelist
    handleVCXP(oldState, newState);            // Leveling XP
    monitorPermAbuse(oldState, newState);      // Anti-Perm Abuse
  } catch (err) {
    console.error(chalk.red("❌ Error in voiceStateUpdate:"), err);
  }
});

/* ========================
   MESSAGE CREATE SECTION
======================== */
VyBz.on("messageCreate", async message => {
  try {
    handleChatMessage(message);                // AI Chat, verification, AFK whitelist
    handleMessageXP(message);                  // Leveling XP from text
  } catch (err) {
    console.error(chalk.red("❌ Error in messageCreate:"), err);
  }
});

/* ========================
   INTERACTION CREATE (SLASH COMMANDS) SECTION
======================== */
VyBz.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    if (commandName === "lfsquad") {
      const game = interaction.options.getString("game");
      const result = await requestSquad(VyBz, interaction.user.id, game, interaction.guildId);
      await interaction.reply({ content: result.message, ephemeral: true });
    }

    // Future slash commands can be added here
  } catch (err) {
    console.error(chalk.red(`❌ Error handling interaction ${commandName}:`), err);
  }
});

/* ========================
   LOGIN SECTION
======================== */
VyBz.login(process.env.BOT_TOKEN)
  .then(() => console.log(chalk.green("🔑 VyBz logged in successfully")))
  .catch(err => console.error(chalk.red("❌ VyBz failed to login:"), err));
