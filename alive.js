const { kord } = require(process.cwd() + "/core");

kord(
  {
    cmd: "ping",
    desc: "Check if bot is online",
    fromMe: false,
    type: "general"
  },
  async (m) => {
    await m.send("🏓 Pong! Bot is alive ✅");
  }
);