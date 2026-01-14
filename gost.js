/**
 * GOST AI — ALL IN ONE SCRIPT
 * Author: You + ChatGPT 👻
 */

const fs = require("fs");
const path = require("path");
const axios = require("axios");
const OpenAI = require("openai");
const { kord, prefix } = require("../core");

/* ================= CONFIG ================= */

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const DATA = path.join(__dirname, ".gost");
if (!fs.existsSync(DATA)) fs.mkdirSync(DATA);

const SESSION_FILE = path.join(DATA, "session.json");
const LANG_FILE = path.join(DATA, "lang.json");

const randomGostReplies = ["👻", "Hmmm 😶‍🌫️", "Yes? 👀", "I'm here 👻", "Sup 😎"];

/* ================= HELPERS ================= */

function readJSON(file, def) {
  try { return JSON.parse(fs.readFileSync(file)); } catch { return def; }
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function chatId(m) {
  return m.chat || m.key?.remoteJid;
}

function getSession(m) {
  const db = readJSON(SESSION_FILE, {});
  return db[chatId(m)] || { on: false, mode: "tag" };
}
function setSession(m, data) {
  const db = readJSON(SESSION_FILE, {});
  db[chatId(m)] = { ...(db[chatId(m)] || {}), ...data };
  writeJSON(SESSION_FILE, db);
}

function getLang(m) {
  const db = readJSON(LANG_FILE, {});
  return db[chatId(m)] || "en";
}
function setLang(m, lang) {
  const db = readJSON(LANG_FILE, {});
  db[chatId(m)] = lang;
  writeJSON(LANG_FILE, db);
}

async function ai(prompt, lang = "en") {
  if (!process.env.OPENAI_API_KEY) return "❌ OpenAI key not set.";

  const style =
    lang === "pigin"
      ? "Reply in Nigerian Pidgin. Short and friendly."
      : "Reply in simple English. Short and friendly.";

  const r = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: `You are GOST AI. ${style}` },
      { role: "user", content: prompt }
    ]
  });

  return r.choices[0].message.content.trim();
}

/* ================= MAIN COMMAND ================= */

kord(
  {
    cmd: "gost|gst",
    desc: "GOST AI",
    type: "tools",
    react: "👻"
  },
  async (m, text) => {
    try {
      const args = text.trim().split(/\s+/);
      const sub = (args.shift() || "menu").toLowerCase();
      const rest = args.join(" ");
      const p = prefix || ".";

      /* ---- MENU ---- */
      if (sub === "menu" || sub === "help") {
        return m.reply(
`👻 *GOST MENU*

AI
- ${p}gost ai <msg>

SESSION
- ${p}gost on
- ${p}gost off
- ${p}gost mode tag|all

LANGUAGE
- ${p}gost lang en
- ${p}gost lang pigin

TOOLS
- ${p}gost summarize (reply)
- ${p}gost roast
- ${p}gost weather <city>
- ${p}gost music <song>`
        );
      }

      /* ---- SESSION ---- */
      if (sub === "on") {
        setSession(m, { on: true });
        return m.reply("👻 Auto-reply ON");
      }
      if (sub === "off") {
        setSession(m, { on: false });
        return m.reply("👻 Auto-reply OFF");
      }
      if (sub === "mode") {
        if (!["tag", "all"].includes(rest)) return m.reply("Use: gost mode tag|all");
        setSession(m, { mode: rest });
        return m.reply(`Mode set to ${rest}`);
      }

      /* ---- LANGUAGE ---- */
      if (sub === "lang") {
        if (!["en", "pigin"].includes(rest)) return m.reply("Use: en or pigin");
        setLang(m, rest);
        return m.reply(`Language set to ${rest}`);
      }

      /* ---- AI CHAT ---- */
      if (sub === "ai") {
        if (!rest) return m.reply("Use: gost ai <message>");
        const out = await ai(rest, getLang(m));
        return m.reply(out);
      }

      /* ---- SUMMARIZE ---- */
      if (sub === "summarize") {
        const q = m.quoted?.text;
        if (!q) return m.reply("Reply to a message.");
        const out = await ai(`Summarize this:\n${q}`, getLang(m));
        return m.reply(out);
      }

      /* ---- ROAST ---- */
      if (sub === "roast") {
        const out = await ai("Give one short funny roast.", getLang(m));
        return m.reply(out);
      }

      /* ---- WEATHER ---- */
      if (sub === "weather") {
        if (!rest) return m.reply("Use: gost weather <city>");
        const key = process.env.OPENWEATHER_API_KEY;
        if (!key) return m.reply("Weather API key not set.");
        const r = await axios.get(
          `https://api.openweathermap.org/data/2.5/weather?q=${rest}&appid=${key}&units=metric`
        );
        const w = r.data;
        return m.reply(
          `🌤 ${w.name}\n${w.weather[0].description}\n${w.main.temp}°C`
        );
      }

      /* ---- MUSIC ---- */
      if (sub === "music") {
        const r = await axios.get(`https://api.deezer.com/search?q=${rest}`);
        const s = r.data.data[0];
        if (!s) return m.reply("No result.");
        await m.reply(
          `🎵 ${s.title}\n${s.artist.name}\n30s preview`
        );
        return m.client.sendMessage(
          chatId(m),
          { audio: { url: s.preview }, mimetype: "audio/mp4" },
          { quoted: m }
        );
      }

    } catch (e) {
      return m.reply("❌ Error: " + e.message);
    }
  }
);

/* ================= AUTO-REPLY + GOST TRIGGER ================= */

kord({ on: "all" }, async (m, text) => {
  if (m.fromMe) return;
  const msg = (text || "").toLowerCase();

  // Random reply if message == "gost"
  if (msg === "gost") {
    return m.reply(randomGostReplies[Math.floor(Math.random() * randomGostReplies.length)]);
  }

  const st = getSession(m);
  if (!st.on) return;

  if (st.mode === "tag" && !m.mentionedJid?.length) return;
  if (msg.startsWith(prefix)) return;

  const out = await ai(text, getLang(m));
  return m.reply(out);
});

module.exports = {};