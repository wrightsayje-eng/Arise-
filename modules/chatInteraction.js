// ─────────────────────────────────────────────
// 💬 Chat Interaction Module
// Greets new users, handles verification, witty responses
// ─────────────────────────────────────────────

export default function setupChatInteraction(client) {
  client.on("messageCreate", async message => {
    try {
      if (message.author.bot) return;

      // Unique greeting example
      if (message.content.toLowerCase().includes("hi") || message.content.toLowerCase().includes("hello")) {
        const greetings = [
          `Yo ${message.author.username}, VyBz just flexed in!`,
          `What's good ${message.author.username}? VyBz here!`,
          `Ayy ${message.author.username}, welcome to the vibes!`
        ];
        const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
        message.channel.send(randomGreeting);
      }

      // Verification example
      if (message.content.toLowerCase().includes("verify")) {
        message.channel.send(
          `${message.author}, slide into the **#autoverify** channel. If you're known, I can ping admins for express verification 😉`
        );
      }

    } catch (error) {
      console.error("[CHAT-INTERACT] ❌ Error handling message:", error);
    }
  });
}
