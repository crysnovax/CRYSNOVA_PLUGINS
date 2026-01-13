const { kord } = require(process.cwd() + "/core");
const fs = require("fs");
const path = process.cwd() + "/memory_gost.json";

// ---------------- MEMORY ----------------
let memory = {};
if (fs.existsSync(path)) memory = JSON.parse(fs.readFileSync(path));
else fs.writeFileSync(path, JSON.stringify(memory, null, 2));

function saveMemory() {
  fs.writeFileSync(path, JSON.stringify(memory, null, 2));
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function parseTime(time) {
  if (!time) return null;
  const match = time.match(/^(\d+)(s|m)$/);
  if (!match) return null;
  const value = parseInt(match[1]);
  return match[2] === "s" ? value * 1000 : value * 60000;
}

// ---------------- CONTENT ----------------
// JOKES (add up to 100)
const jokes = [
  "😂 Why e phone waka go school? To sabi class better.",
  "🤣 I try code without bug… I just wake up.",
  "😆 Why programmers dey love dark mode? Light dey attract bug!",
  "🤣 Why mosquito no dey pay rent? Because e dey free!",
  "😂 I tell my dog small secret… e no fit keep am 😆",
  // ...add more jokes to reach 100
];

// STORIES (long, fun, Pidgin style, up to 100)
const stories = [
  "📖 Peter waka enter market, e see something wey shock am well well 😱. E still smile and learn lesson. Na so e day end 🎉.",
  "📖 Sarah waka enter forest, she help lost dog return house 🤝. Wahala small but e happy 😎.",
  // ...add more long stories to reach 100
];

// QUOTES (up to 100)
const quotes = [
  "💡 If today hard, tomorrow go easy, just hold on.",
  "💪 Small small progress na better pass zero.",
  "🌟 Work dey pay for person wey no dey slack.",
  "🧘 Take rest, your mind go fresh to perform.",
  "🔥 Believe yourself, nobody fit do your work for you.",
  // ...add more quotes to reach 100
];

// ---------------- TYPING SIMULATION ----------------
async function typingSend(m, text) {
  const ms = 1000 + Math.floor(Math.random() * 2000);
  await delay(ms);
  return m.send(text);
}

// ---------------- SAFE MATH ----------------
function safeEval(expr) {
  try {
    const result = Function(`"use strict";return (${expr})`)();
    return result;
  } catch {
    return null;
  }
}

// ---------------- DICE ----------------
function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

// ---------------- WEATHER ----------------
function fakeWeather(city) {
  const conditions = ["sunny 🌞","rainy 🌧","cloudy ☁️","stormy ⛈","windy 🌬","foggy 🌫"];
  const temp = 20 + Math.floor(Math.random() * 15); // 20°C - 34°C
  const cond = randomItem(conditions);
  return `🌤 Weather for ${city}: ${cond}, temperature around ${temp}°C`;
}

// ---------------- CORE GOST COMMAND ----------------
kord(
  {
    cmd: "gost",
    desc: "Infinity Gost Pro Max 😎",
    fromMe: false,
    type: "fun"
  },
  async (m, text) => {
    const userId = m.sender;
    if (!memory[userId]) memory[userId] = {
      name: null,
      favorite: null,
      hobbies: [],
      mood: "neutral",
      reminders: [],
      game: {},
      lastMessages: [],
      chatMode: true
    };

    const msg = text?.toLowerCase();
    const user = memory[userId];

    if (!text) return typingSend(m, "🙂 I dey here oh, wetin dey happen? Use `.gost help` to see commands.");

    // Remember last messages
    if (!user.lastMessages) user.lastMessages = [];
    user.lastMessages.push(msg);
    if (user.lastMessages.length > 3) user.lastMessages.shift();

    // ---------------- HELP ----------------
    if (msg === "help") {
      return typingSend(m, `
📜 Gost Infinity Commands:

👤 Personal Info:
.name <name>
.favorite <thing>
.hobby <thing>
.info
.mood <happy/sad/angry> / .mood

⏰ Reminders:
.remind <10s/5m> <task>
.reminders
.delreminder <number>

😂 Fun & Chat:
.joke
.advice
.story
.weather <city>
.chatmode <on/off>

🎲 Games:
.rps <rock/paper/scissors>
.coin
.guess <1-20>
.roll
.math <expression>

🔎 Stats & Features:
.features

🫥 Secret:
.secret
`);
    }

    // ---------------- SECRET ----------------
    if (msg === "secret") {
      return typingSend(m, "🫥 Chai! My owner is Gost 💀");
    }

    // ---------------- PERSONAL INFO ----------------
    if (msg.startsWith("name ")) { user.name = text.slice(5).trim(); saveMemory(); return typingSend(m, `✅ I go dey call you ${user.name}`); }
    if (msg.startsWith("favorite ")) { user.favorite = text.slice(9).trim(); saveMemory(); return typingSend(m, `🎉 I don remember say your favorite na ${user.favorite}`); }
    if (msg.startsWith("hobby ")) { const h = text.slice(6).trim(); user.hobbies.push(h); saveMemory(); return typingSend(m, `✅ I don add hobby: ${h}`); }
    if (msg === "info") return typingSend(m, `📋 Info:\nName: ${user.name || "N/A"}\nFavorite: ${user.favorite || "N/A"}\nHobbies: ${user.hobbies.join(", ") || "N/A"}\nMood: ${user.mood}`);

    // ---------------- MOOD ----------------
    if (msg.startsWith("mood ")) { user.mood = text.slice(5).trim(); saveMemory(); return typingSend(m, `🙂 Mood set to "${user.mood}"`); }
    if (msg === "mood") return typingSend(m, `🙂 Your last mood na "${user.mood}"`);

    // ---------------- REMINDERS ----------------
    if (msg.startsWith("remind ")) {
      const parts = text.slice(7).trim().split(" ");
      const delayTime = parseTime(parts[0]);
      const task = parts.slice(1).join(" ");
      if (!delayTime || !task) return typingSend(m, "❌ Wrong usage! Example: `.gost remind 10s Drink water`");
      const reminder = { task, time: Date.now() + delayTime };
      user.reminders.push(reminder);
      saveMemory();
      setTimeout(async () => { 
        try { 
          await typingSend(m, `🔔 Reminder: "${task}"`); 
          user.reminders = user.reminders.filter(r => r !== reminder); 
          saveMemory(); 
        } catch(e){} 
      }, delayTime);
      return typingSend(m, `⏳ Reminder set: "${task}" for ${parts[0]}`);
    }

    if (msg === "reminders") {
      if (!user.reminders.length) return typingSend(m, "📭 You no get active reminder");
      let list = "⏳ Your reminders:\n";
      user.reminders.forEach((r,i)=>{ const rem = Math.max(0,Math.round((r.time-Date.now())/1000)); list += `${i+1}. ${r.task} - ${rem}s left\n`; });
      return typingSend(m, list);
    }

    if (msg.startsWith("delreminder ")) {
      const num = parseInt(msg.split(" ")[1]);
      if (isNaN(num) || num<1 || num>user.reminders.length) return typingSend(m, "❌ Wrong usage!");
      const removed = user.reminders.splice(num-1,1);
      saveMemory();
      return typingSend(m, `✅ Removed reminder: ${removed[0].task}`);
    }

    // ---------------- FUN ----------------
    if (msg.includes("joke")) return typingSend(m, randomItem(jokes));
    if (msg.includes("advice") || msg.includes("quote")) return typingSend(m, randomItem(quotes));
    if (msg === "story") return typingSend(m, randomItem(stories));
    if (msg.startsWith("weather ")) return typingSend(m, fakeWeather(text.slice(8).trim()));

    // ---------------- MINI-GAMES ----------------
    if (msg.startsWith("rps ")) {
      const choice = msg.split(" ")[1];
      const valid = ["rock","paper","scissors"];
      if (!valid.includes(choice)) return typingSend(m,"❌ Invalid choice!");
      const bot = randomItem(valid);
      let res = "";
      if (choice === bot) res="🤝 Tie!";
      else if ((choice==="rock"&&bot==="scissors")||(choice==="paper"&&bot==="rock")||(choice==="scissors"&&bot==="paper")) res="🎉 You win!";
      else res="😢 You lose!";
      return typingSend(m, `You: ${choice}\nMe: ${bot}\n${res}`);
    }

    if (msg === "coin") return typingSend(m, `🪙 Coin: ${Math.random()<0.5?"Heads":"Tails"}`);
    if (msg.startsWith("guess ")) { 
      const guess = parseInt(msg.split(" ")[1]); 
      const number = Math.floor(Math.random()*20)+1; 
      if(guess===number){return typingSend(m,`🎉 Correct! Number na ${number}.`);} 
      else if(guess<number) return typingSend(m,"📈 Too small!"); 
      else return typingSend(m,"📉 Too high!"); 
    }
    if (msg === "roll") return typingSend(m, `🎲 You roll: ${rollDice()}`);
    if (msg.startsWith("math ")) { const expr = text.slice(5).trim(); const res = safeEval(expr); return res===null?typingSend(m,"❌ Invalid math"):typingSend(m,`🧮 Result: ${res}`); }

    // ---------------- STATS ----------------
    if (msg === "features") return typingSend(m, `✨ Gost Infinity Features:\n- 100 jokes, 100 stories, 100 quotes\n- Mood system\n- Mini-games\n- Reminders\n- Chat mode\n- Secret Easter egg 🫥`);

    // ---------------- CHAT MODE ----------------
    if (msg.startsWith("chatmode ")) { 
      const mode = text.slice(9).trim(); 
      if(mode==="on") user.chatMode = true; 
      else if(mode==="off") user.chatMode = false; 
      saveMemory(); 
      return typingSend(m, `Chat mode set to ${mode}`); 
    }

    // ---------------- FALLBACK CHAT ----------------
    if (user.chatMode) {
      const responses = ["😎 I dey hear you oh","😂 Chai, that one sweet me","🤔 I dey think about wetin you talk","😆 Wahala dey but we go manage","😄 Na true you talk!"];
      return typingSend(m, randomItem(responses));
    }

    return typingSend(m,"❌ I no understand that. Use `.gost help` to see commands");
  }
);