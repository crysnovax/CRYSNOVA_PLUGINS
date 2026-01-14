/**
 * GOST AI — Premium Assistant + Slang Trigger
 *
 * Deps: axios, openai
 * Install:
 *   npm i axios openai
 *
 * ENV:
 *   OPENAI_API_KEY=...
 *   OPENWEATHER_API_KEY=...   (optional)
 */

const { kord } = require(process.cwd() + "/core");
const axios = require("axios");
const OpenAI = require("openai");

// ===== OPENAI CLIENT =====
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ===== HELPERS =====
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function safeReact(m, emoji) {
  try {
    if (typeof m.react === "function") return await m.react(emoji);
  } catch {}
}

async function safeSendText(m, text, opt = {}) {
  try {
    if (typeof m.send === "function") return await m.send(text, opt);
  } catch {}
  try {
    if (typeof m.reply === "function") return await m.reply(text);
  } catch {}
}

// ===== SLANG TRIGGER (no emojis before reply) =====
const GOST_REACTS = ["🌟", "🫥", "👻", "👣", "🫴"];
const slangs = [
  "How far?",
  "How you dey now?",
  "My big man, you dey?",
  "Wetin dey sup?",
  "I dey alive.",
  "Nothing dey.",
  "You good?",
  "You don chop?",
  "You still dey there?",
  "Normal normal.",
  "We move.",
  "No yawa.",
  "I dey.",
  "Everything correct."
];

// ===== ROAST DATA (safe banter) =====
const roasts = [
  "Even silence dey make more sense than you.",
  "Your whole existence be typo.",
  "Brain loading… error 404.",
  "You dey reason backwards with confidence.",
  "Even Google no fit find your sense.",
  "Your future dey buffering permanently.",
  "Confidence full, result empty.",
  "You be walking misunderstanding.",
  "Your logic dey on sick leave.",
  "You dey talk like Wi-Fi with one bar.",
  "Your thinking dey optional.",
  "You dey try, but wrong direction.",
  "Your mouth faster than your brain."
];

// ===== WEATHER FUNCTION =====
async function getWeather(city) {
  try {
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) return "Weather not configured: set OPENWEATHER_API_KEY.";

    const url =
      "https://api.openweathermap.org/data/2.5/weather?q=" +
      encodeURIComponent(city) +
      "&appid=" +
      encodeURIComponent(apiKey) +
      "&units=metric";

    const res = await axios.get(url, { timeout: 20000 });
    const w = res.data;

    return (
      "Weather in " + w.name + "\n" +
      "Condition: " + (w.weather?.[0]?.description || "-") + "\n" +
      "Temp: " + (w.main?.temp ?? "-") + "°C\n" +
      "Feels like: " + (w.main?.feels_like ?? "-") + "°C\n" +
      "Humidity: " + (w.main?.humidity ?? "-") + "%\n" +
      "Wind: " + (w.wind?.speed ?? "-") + " m/s"
    );
  } catch {
    return "City not found or weather service error.";
  }
}

// ===== MUSIC FUNCTION (Deezer preview) =====
async function searchMusic(query) {
  try {
    const url = "https://api.deezer.com/search?q=" + encodeURIComponent(query);
    const res = await axios.get(url, { timeout: 20000 });
    const data = res.data?.data || [];
    if (!data.length) return { text: "No music found.", preview: null };

    const song = data[0];
    return {
      text:
        "Now Playing Preview\n" +
        song.title + "\n" +
        (song.artist?.name || "") + " • " + (song.album?.title || "") + "\n" +
        "Preview: 30s",
      preview: song.preview || null
    };
  } catch {
    return { text: "Music error.", preview: null };
  }
}
kord(
  {
    cmd: "gost",
    desc: "Gost — AI + slang trigger + roasts + music + weather",
    fromMe: false,
    type: "fun"
  },
  async (m, text) => {
    const msg = (text || "").trim();
    const lowerMsg = msg.toLowerCase();

    // ✅ NEW: If user types only ".gost" (no args), do slang reply + random react
    if (!msg) {
      await safeReact(m, pick(GOST_REACTS));
      return safeSendText(m, pick(slangs));
    }

    // MENU
    if (lowerMsg === "menu") {
      return safeSendText(
        m,
        "*GOST MENU*\n\n" +
          "AI\n" +
          "- .gost chat <message>\n\n" +
          "SLANG\n" +
          "- .gost  (just type it)\n\n" +
          "ROAST\n" +
          "- .gost roast\n" +
          "- .gost roast @user\n" +
          "- .gost lastroast (reply to message)\n\n" +
          "MUSIC\n" +
          "- .gost music <song/artist>\n\n" +
          "WEATHER\n" +
          "- .gost weather <city>\n\n" +
          "HELP\n" +
          "- .gost help"
      );
    }

    // HELP
    if (lowerMsg === "help") {
      return safeSendText(
        m,
        "*GOST HELP*\n\n" +
          ".gost            -> random Naija slang reply\n" +
          ".gost chat <msg> -> AI chat\n" +
          ".gost roast      -> roast yourself\n" +
          ".gost roast @u   -> roast a mention\n" +
          ".gost lastroast  -> roast replied message\n" +
          ".gost music <q>  -> deezer preview\n" +
          ".gost weather <city>"
      );
    }

    // AI CHAT
    if (lowerMsg.startsWith("chat ")) {
      const prompt = msg.slice(5).trim();
      if (!prompt) return safeSendText(m, "Usage: .gost chat <message>");
      if (!process.env.OPENAI_API_KEY) return safeSendText(m, "OPENAI_API_KEY not set.");

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are Gost, a witty Nigerian street-smart friend. Reply in English + small Pidgin mix. Be helpful, clean, and concise."
            },
            { role: "user", content: prompt }
          ]
        });

        const out = completion?.choices?.[0]?.message?.content?.trim();
        return safeSendText(m, out || "No response.");
      } catch (e) {
        return safeSendText(m, "AI error: " + (e?.message || e));
      }
    }

    // WEATHER
    if (lowerMsg.startsWith("weather ")) {
      const city = msg.slice(8).trim();
      if (!city) return safeSendText(m, "Usage: .gost weather <city>");
      const report = await getWeather(city);
      return safeSendText(m, report);
    }

    // MUSIC
    if (lowerMsg.startsWith("music ")) {
      const query = msg.slice(6).trim();
      if (!query) return safeSendText(m, "Usage: .gost music <song or artist>");

      const result = await searchMusic(query);
      await safeSendText(m, result.text);

      if (result.preview) {
        try {
          if (m?.client?.sendMessage) {
            return await m.client.sendMessage(
              m.chat,
              { audio: { url: result.preview }, mimetype: "audio/mp4" },
              { quoted: m }
            );
          }
        } catch {}
      }
      return;
    }

    // SELF ROAST
    if (lowerMsg === "roast") {
      return safeSendText(m, pick(roasts));
    }

    // MENTION ROAST
    if (lowerMsg.startsWith("roast")) {
      if (m.mentionedJid && m.mentionedJid.length > 0) {
        const user = m.mentionedJid[0];
        return safeSendText(
          m,
          `@${user.split("@")[0]}, ${pick(roasts)}`,
          { mentions: [user] }
        );
      }
      return safeSendText(m, pick(roasts));
    }

    // LASTROAST (reply)
    if (lowerMsg === "lastroast") {
      if (!m.quoted) return safeSendText(m, "Reply to a message first.");
      const user = m.quoted.sender;
      const quotedText = m.quoted.text || "that message";

      return safeSendText(
        m,
        `@${String(user || "").split("@")[0]} you said:\n"${quotedText}"\n\n${pick(roasts)}`,
        { mentions: user ? [user] : [] }
      );
    }

    // fallback
    return safeSendText(m, "Unknown. Type: .gost menu");
  }
);

module.exports = {};