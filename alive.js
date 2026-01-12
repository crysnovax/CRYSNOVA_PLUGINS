const { kord } = require(process.cwd() + "/core");

const MAX_CHARS = 8000;

kord(
  {
    cmd: "repeatx",
    desc: "Repeat text N times (max 8000 chars)",
    fromMe: false,
    type: "general"
  },
  async (m, text) => {
    if (!text) {
      return await m.send("❌ Usage: .repeatx <count> <text>");
    }

    const args = text.split(" ");
    const count = parseInt(args.shift());

    if (isNaN(count) || count < 1) {
      return await m.send("❌ Count must be a valid number");
    }

    const msgText = args.join(" ");
    if (!msgText) {
      return await m.send("❌ No text to repeat");
    }

    let output = "";
    let i = 0;

    while (i < count && (output.length + msgText.length + 1) <= MAX_CHARS) {
      output += msgText + "\n";
      i++;
    }

    if (!output) {
      return await m.send("❌ Text is too long");
    }

    await m.send(output.trim());
  }
);