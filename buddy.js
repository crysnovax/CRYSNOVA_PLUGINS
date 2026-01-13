const { kord } = require(process.cwd() + "/core");

// Helper functions
function getToday() {
  const d = new Date();
  return d.toDateString();
}

function getDailyCode() {
  const today = new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < today.length; i++) {
    hash = (hash + today.charCodeAt(i)) % 10000;
  }
  return String(hash).padStart(4, "0");
}

function getTime() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

// Memory object
const memory = {}; // Stores last messages per user
function remember(userId, msg) {
  if (!memory[userId]) memory[userId] = [];
  memory[userId].push(msg);
  if (memory[userId].length > 5) memory[userId].shift(); // Keep last 5 messages
}

// Keyword replies
const replies = {
  hi: ["Hey 😄", "Hi man 👋", "Yo!"],
  hello: ["Hello 😊", "Hey there!"],
  hey: ["Hey hey 😎"],
  how: [
    "I’m good, just chilling 😌 what about you?",
    "I’m fine! How’s your day going?"
  ],
  tired: ["😔 You should rest a bit", "Take a break man, you’ve been working hard"],
  hungry: [
    "😋 Haha same! Grab some food?",
    "🍔 Let’s eat together… wish I could!",
    "😂 Hunger is real, go eat fast!"
  ],
  sad: ["I’m here 🤍 want to talk about it?", "Aww 😢 it’s okay, I got you."],
  happy: ["That’s awesome 😄 I’m happy for you", "😎 Yay! Celebrate a bit!"],
  bored: ["😅 Let’s chat then", "Hahaha wanna hear a joke?"],
  love: ["🫶 I appreciate you too", "Love you man ❤️"],
  angry: ["😤 Take a breath, I’m here", "Don’t let it stress you, relax."],
  help: ["Tell me what’s wrong", "I got you, man, what happened?"],
  bye: ["Take care 👋", "See you later!"]
};

// Casual gisting phrases
const gistReplies = [
  "😂 That’s funny!",
  "Hmm 🤔 I see...",
  "😅 Really now?",
  "Wow 😮 tell me more!",
  "😎 Haha, I’m loving this chat",
  "Hmm, interesting…",
  "😏 You’re full of stories!"
];

// Flatten all replies for default random gisting
const defaultReplies = [...Object.values(replies).flat(), ...gistReplies];

// Ultimate auto-gisting plugin
kord(
  {
    cmd: "buddyauto", // Optional command
    desc: "Ultimate friendly auto-gist bot with memory",
    fromMe: false,
    type: "fun",
    onMessage: true // auto-reply to messages
  },
  async (m, text) => {
    if (!text) return;

    const userId = m.sender; // unique user ID
    const lower = text.toLowerCase();

    // Remember the message
    remember(userId, text);

    // Daily code
    if (lower.includes("code of today") || lower.includes("today code")) {
      return m.send(`🔐 Today’s code is: *${getDailyCode()}*`);
    }

    // Time
    if (lower.includes("time")) {
      return m.send(`🕒 It’s ${getTime()} now`);
    }

    // Date
    if (lower.includes("date") || lower.includes("today")) {
      return m.send(`📅 Today is ${getToday()}`);
    }

    // Keyword replies
    const key = Object.keys(replies).find(k => lower.includes(k));
    let response;

    if (key) {
      const arr = replies[key];

      // Memory-aware reply example: special for repeated hungry
      if (key === "hungry" && memory[userId]?.some(msg => msg.toLowerCase().includes("hungry"))) {
        response = "😋 Already hungry? Maybe grab a bigger meal this time!";
      } else {
        response = arr[Math.floor(Math.random() * arr.length)];
      }
    } else {
      // Random casual gisting
      response = gistReplies[Math.floor(Math.random() * gistReplies.length)];
    }

    await m.send(response);
  }
);