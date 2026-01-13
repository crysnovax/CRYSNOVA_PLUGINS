const { kord } = require(process.cwd() + "/core");
const axios = require("axios");
const OpenAI = require("openai");

// ===== OPENAI v4 CLIENT =====
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// ===== USER LANGUAGE STORAGE =====
const userLang = {}; // { userId: 'language' }
const langs = ["english","pigin","yoruba","igbo","french","spanish","hausa"];

// ===== HELP FUNCTION =====
function pick(arr){
  return arr[Math.floor(Math.random()*arr.length)];
}

// ===== ROAST DATA =====
const roasts = [
  "💀 Even silence dey make more sense than you.",
  "🔥 Your whole existence be typo.",
  "😂 Brain loading… error 404.",
  "😈 You dey reason backwards with confidence.",
  "💀 Even Google no fit find your sense.",
  "🔥 Your future dey buffering permanently.",
  "😂 Confidence full, result empty.",
  "😈 You be walking misunderstanding.",
  "💀 Your logic dey on sick leave.",
  "🔥 You dey talk like Wi-Fi with one bar.",
  "😂 Even your village people don mute you.",
  "😈 Your thinking dey optional.",
  "💀 Hope see you and rest.",
  "🔥 You dey try, but wrong direction.",
  "😂 Even mistake look you say ‘damn’.",
  "😈 Your IQ dey hide from shame.",
  "💀 Sense dey missing, reward active.",
  "🔥 Your mouth faster than your brain.",
  "😂 Destiny use incognito for you.",
  "😈 You be example of how not to."
];

// ===== JOKES / STORIES / QUOTES =====
const jokes = ["Joke 1","Joke 2","Joke 3","Joke 4"]; // Add 100+
const stories = ["Story 1","Story 2","Story 3"];     // Add 100+
const quotes = ["Quote 1","Quote 2","Quote 3"];     // Add 100+

// ===== WEATHER FUNCTION =====
async function getWeather(city){
  try{
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if(!apiKey) return "❌ Weather API key not set";
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    const res = await axios.get(url);
    const w = res.data;
    return `🌤 Weather in ${w.name}
Condition: ${w.weather[0].description}
🌡 Temp: ${w.main.temp}°C
🤒 Feels like: ${w.main.feels_like}°C
💧 Humidity: ${w.main.humidity}%
🌬 Wind: ${w.wind.speed} m/s`;
  }catch{
    return "❌ City not found or weather service error";
  }
}

// ===== MUSIC FUNCTION =====
async function searchMusic(query){
  try{
    const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}`;
    const res = await axios.get(url);
    const data = res.data.data;
    if(!data || data.length===0) return {text:"❌ No music found", preview:null};
    const song = data[0];
    return {
      text:`🎵 Now Playing Preview
🎶 ${song.title}
👤 ${song.artist.name}
💿 ${song.album.title}
⏱ 30s preview`,
      preview:song.preview
    };
  }catch{
    return {text:"❌ Music error", preview:null};
  }
}

// ===== MINI GAME =====
const gameData = {}; // {userId: {guess: number}}

kord({
  cmd: "guess",
  desc: "Guess the number game (1-20)",
  fromMe: false,
  type: "game"
}, async (m, text)=>{
  if(!text) return m.send("❌ Usage: .guess <number>");
  const guess = parseInt(text);
  if(isNaN(guess)||guess<1||guess>20) return m.send("❌ Number must be between 1 and 20");
  const number = Math.floor(Math.random()*20)+1;
  if(guess===number) return m.send(`🎉 Correct! The number was ${number}`);
  else if(guess<number) return m.send("📈 Too low! Try again");
  else return m.send("📉 Too high! Try again");
});

// ===== MAIN GOST COMMAND =====
kord({
  cmd: "gost",
  desc: "Gost mega bot with AI, jokes, roast, games, music, weather",
  fromMe: false,
  type: "fun"
}, async (m, text)=>{
  const msg = (text||"").trim();
  const lowerMsg = msg.toLowerCase();
  const lang = userLang[m.sender] || "english";

  // ===== LANGUAGE SWITCH =====
  if(lowerMsg.startsWith("lang ")){
    const l = lowerMsg.slice(5).trim();
    if(!langs.includes(l)) return m.send(`❌ Language not supported. Options: ${langs.join(", ")}`);
    userLang[m.sender] = l;
    return m.send(`✅ Language changed to ${l}`);
  }

  // ===== AI CHAT =====
  if(lowerMsg.startsWith("chat ")){
    const prompt = msg.slice(5).trim();
    if(!prompt) return m.send("❌ Usage: .gost chat <message>");
    if(!process.env.OPENAI_API_KEY) return m.send("❌ OPENAI_API_KEY not set");

    try{
      const completion = await openai.chat.completions.create({
        model:"gpt-4o-mini",
        messages:[
          {role:"system",content:`You are Gost, a witty Nigerian friend. Reply in ${lang}. Be friendly, funny, human-like.`},
          {role:"user", content:prompt}
        ]
      });
      return m.send(completion.choices[0].message.content);
    }catch(e){
      return m.send("❌ AI error: "+e.message);
    }
  }

  // ===== JOKE =====
  if(lowerMsg==="joke") return m.send(pick(jokes));

  // ===== STORY =====
  if(lowerMsg==="story") return m.send(pick(stories));

  // ===== QUOTE =====
  if(lowerMsg==="quote") return m.send(pick(quotes));

  // ===== WEATHER =====
  if(lowerMsg.startsWith("weather ")){
    const city = msg.slice(8).trim();
    if(!city) return m.send("❌ Usage: .gost weather <city>");
    const report = await getWeather(city);
    return m.send(report);
  }

  // ===== MUSIC =====
  if(lowerMsg.startsWith("music ")){
    const query = msg.slice(6).trim();
    if(!query) return m.send("❌ Usage: .gost music <song or artist>");
    const result = await searchMusic(query);
    await m.send(result.text);
    if(result.preview) return m.send({audio:{url:result.preview},mimetype:"audio/mp4"});
    return;
  }

  // ===== ROAST =====
  if(lowerMsg==="roast") return m.send("🔥 "+pick(roasts));

  if(lowerMsg.startsWith("roast") && m.mentionedJid && m.mentionedJid.length>0){
    const user = m.mentionedJid[0];
    return m.send(`🔥 @${user.split("@")[0]}, ${pick(roasts)}`,{mentions:[user]});
  }

  if(lowerMsg==="lastroast"){
    if(!m.quoted) return m.send("❌ Reply to a message first");
    const user = m.quoted.sender;
    const quotedText = m.quoted.text || "this message";
    return m.send(`💀 @${user.split("@")[0]}, you said:\n"${quotedText}"\n\n🔥 ${pick(roasts)}`,{mentions:[user]});
  }

  // ===== MENU =====
  if(lowerMsg==="help"||lowerMsg==="menu"){
    return m.send(
`👻 *GOST MAIN MENU*

🤖 AI CHAT
- .gost chat <message> → Talk to Gost in ${lang}

🔥 ROASTS
- .gost roast → Roast yourself
- .gost roast @user → Roast someone
- .gost lastroast → Roast last replied message

😂 FUN
- .joke → Random joke
- .story → Random story
- .quote → Random quote

🎮 MINI GAME
- .guess <number> → Guess number 1-20

🎵 MUSIC
- .gost music <song/artist> → Search music & 30s preview

🌤 WEATHER
- .gost weather <city> → Real-time weather

🌐 LANGUAGE
- .gost lang <language> → Change language (english, pigin, yoruba, igbo, french, spanish, hausa)`
    );
  }

  return m.send("❓ Unknown command. Type *.gost help*");
});

module.exports = {};
// ===== GOST PING COMMAND =====
kord({
  cmd: "gost",
  desc: "Ping Gost fun response",
  fromMe: false,
  type: "fun"
}, async (m, text) => {
  const msg = (text || "").trim().toLowerCase();

  // If user just types "gost" without any text
  if(msg === ""){
    return m.send("Sup my nigger 😎 any problem? 💀");
  }

  // Existing commands continue here...
  const lang = userLang[m.sender] || "english";

  // (Keep the rest of your mega gost.js code below)
});