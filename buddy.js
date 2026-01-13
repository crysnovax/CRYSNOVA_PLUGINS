const { kord } = require(process.cwd() + "/core");
const fs = require("fs");
const path = process.cwd() + "/memory_probuddy_all.json";

// Load memory
let memory = {};
if (fs.existsSync(path)) memory = JSON.parse(fs.readFileSync(path));
else fs.writeFileSync(path, JSON.stringify(memory, null, 2));

function saveMemory() {
  fs.writeFileSync(path, JSON.stringify(memory, null, 2));
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function parseTime(time) {
  if (!time) return null;
  const match = time.match(/^(\d+)(s|m)$/);
  if (!match) return null;
  const value = parseInt(match[1]);
  return match[2] === "s" ? value * 1000 : value * 60000;
}

const trivia = [
  { q: "Capital of France?", a: "paris" },
  { q: "2 + 2 * 2?", a: "6" },
  { q: "The largest planet?", a: "jupiter" },
];

kord(
  {
    cmd: "buddy",
    desc: "Ultimate Pro Buddy Max plugin - chat, games, reminders, XP, mood, and upgrades",
    fromMe: false,
    type: "fun"
  },
  async (m, text) => {
    const userId = m.sender;
    if (!memory[userId]) memory[userId] = {
      name: null,
      favorite: null,
      hobbies: [],
      lastMessage: null,
      mood: "neutral",
      xp: 0,
      level: 1,
      reminders: [],
      game: {}
    };

    if (!text) return m.send("🙂 Hey! I’m your Pro Buddy Max. Use `.buddy help` for commands.");

    const msg = text.toLowerCase();
    const user = memory[userId];

    // Add XP
    user.xp += 10;
    const newLevel = Math.floor(user.xp / 100) + 1;
    if (newLevel > user.level) {
      user.level = newLevel;
      m.send(`🎉 Congrats ${user.name || ""}, you leveled up to Level ${user.level}!`);
    }

    // ---- COMMANDS ----
    if (msg === "help") {
      return m.send(`📜 Buddy Pro Max Commands:
1️⃣ .buddy name <name>
2️⃣ .buddy favorite <thing>
3️⃣ .buddy hobby <thing>
4️⃣ .buddy info
5️⃣ .buddy mood <happy/sad/angry> / .buddy mood
6️⃣ .buddy remind <10s/5m> <task>
7️⃣ .buddy reminders
8️⃣ .buddy delreminder <number>
9️⃣ .buddy joke
🔟 .buddy advice
1️⃣1️⃣ .buddy rps <rock/paper/scissors>
1️⃣2️⃣ .buddy coin
1️⃣3️⃣ .buddy guess <1-20>
1️⃣4️⃣ .buddy trivia
1️⃣5️⃣ .buddy answer <text>
1️⃣6️⃣ .buddy stats
1️⃣7️⃣ .buddy features`);
    }

    // Name
    if (msg.startsWith("name ")) {
      user.name = text.slice(5).trim();
      saveMemory();
      return m.send(`✅ Got it! I’ll call you ${user.name}`);
    }

    // Favorite
    if (msg.startsWith("favorite ")) {
      user.favorite = text.slice(9).trim();
      saveMemory();
      return m.send(`🎉 I’ll remember your favorite: ${user.favorite}`);
    }

    // Hobby
    if (msg.startsWith("hobby ")) {
      const hobby = text.slice(6).trim();
      user.hobbies.push(hobby);
      saveMemory();
      return m.send(`✅ Added hobby: ${hobby}`);
    }

    // Info
    if (msg === "info") {
      return m.send(`📋 Your info:
Name: ${user.name || "N/A"}
Favorite: ${user.favorite || "N/A"}
Hobbies: ${user.hobbies.join(", ") || "N/A"}
Mood: ${user.mood || "neutral"}
Level: ${user.level}
XP: ${user.xp}`);
    }

    // Mood
    if (msg.startsWith("mood ")) {
      user.mood = text.slice(5).trim();
      saveMemory();
      return m.send(`🙂 Mood set to "${user.mood}"`);
    }
    if (msg === "mood") return m.send(`🙂 Last mood: "${user.mood}"`);

    // Reminders
    if (msg.startsWith("remind ")) {
      const parts = text.slice(7).trim().split(" ");
      const delay = parseTime(parts[0]);
      const task = parts.slice(1).join(" ");
      if (!delay || !task) return m.send("❌ Usage: .buddy remind 10s Drink water");
      const reminder = { task, time: Date.now() + delay };
      user.reminders.push(reminder);
      saveMemory();
      setTimeout(async () => {
        try {
          await m.send(`🔔 Reminder: "${task}"`);
          user.reminders = user.reminders.filter(r => r !== reminder);
          saveMemory();
        } catch (e) {}
      }, delay);
      return m.send(`⏳ Reminder set: "${task}" in ${parts[0]}`);
    }

    if (msg === "reminders") {
      if (!user.reminders.length) return m.send("📭 No active reminders");
      let list = "⏳ Your reminders:\n";
      user.reminders.forEach((r, i) => {
        const remaining = Math.max(0, Math.round((r.time - Date.now()) / 1000));
        list += `${i + 1}. ${r.task} - ${remaining}s left\n`;
      });
      return m.send(list);
    }

    if (msg.startsWith("delreminder ")) {
      const num = parseInt(msg.split(" ")[1]);
      if (isNaN(num) || num < 1 || num > user.reminders.length)
        return m.send("❌ Invalid reminder number");
      const removed = user.reminders.splice(num - 1, 1);
      saveMemory();
      return m.send(`✅ Removed reminder: ${removed[0].task}`);
    }

    // Jokes
    if (msg.includes("joke")) {
      const jokes = [
        "😂 Why did the phone go to school? To improve its class.",
        "🤣 I tried coding without bugs… then I woke up.",
        "😆 Why do programmers love dark mode? Because light attracts bugs!"
      ];
      return m.send(randomItem(jokes));
    }

    // Advice
    if (msg.includes("advice")) {
      const advices = [
        "💡 Keep learning every day!",
        "💪 Don’t give up, even if it’s tough.",
        "🌟 Focus on small wins, they add up.",
        "🧘‍♂️ Take breaks, mental health is key."
      ];
      return m.send(randomItem(advices));
    }

    // Mini-games
    if (msg.startsWith("rps ")) {
      const choice = msg.split(" ")[1];
      const valid = ["rock", "paper", "scissors"];
      if (!valid.includes(choice)) return m.send("❌ Choose rock, paper, or scissors");
      const botChoice = randomItem(valid);
      let result = "";
      if (choice === botChoice) result = "🤝 Tie!";
      else if (
        (choice === "rock" && botChoice === "scissors") ||
        (choice === "paper" && botChoice === "rock") ||
        (choice === "scissors" && botChoice === "paper")
      ) result = "🎉 You win!";
      else result = "😢 You lose!";
      return m.send(`You: ${choice}\nMe: ${botChoice}\n${result}`);
    }

    if (msg === "coin") return m.send(`🪙 Coin flip: ${Math.random() < 0.5 ? "Heads" : "Tails"}`);

    // Guess number
    if (msg.startsWith("guess ")) {
      const guess = parseInt(msg.split(" ")[1]);
      if (isNaN(guess) || guess < 1 || guess > 20) return m.send("❌ Number must be 1-20");
      const number = Math.floor(Math.random() * 20) + 1;
      if (guess === number) {
        user.xp += 15;
        saveMemory();
        return m.send(`🎉 Correct! Number was ${number}. You earned 15 XP`);
      } else if (guess < number) return m.send("📈 Too low! Try again");
      else return m.send("📉 Too high! Try again");
    }

    // Trivia
    if (msg === "trivia") {
      const q = randomItem(trivia);
      user.game.triviaAnswer = q.a;
      saveMemory();
      return m.send(`❓ Trivia: ${q.q} (reply with .buddy answer <your answer>)`);
    }

    if (msg.startsWith("answer ")) {
      const answer = text.slice(7).trim().toLowerCase();
      if (!user.game.triviaAnswer) return m.send("❌ No active trivia question");
      if (answer === user.game.triviaAnswer) {
        user.xp += 20;
        user.game.triviaAnswer = null;
        saveMemory();
        return m.send("🎉 Correct! You earned 20 XP");
      } else {
        user.game.triviaAnswer = null;
        saveMemory();
        return m.send("❌ Wrong! Better luck next time");
      }
    }

    // Stats
    if (msg === "stats") {
      return m.send(`📊 Stats:
XP: ${user.xp}
Level: ${user.level}
Mood: ${user.mood || "neutral"}
Hobbies: ${user.hobbies.join(", ") || "N/A"}
Favorite: ${user.favorite || "N/A"}`);
    }

    // Features command
    if (msg === "features") {
      const featureList = `
📜 **Buddy Pro Max Features & Commands**

1️⃣ Personalized Chat
2️⃣ Mood System
3️⃣ XP & Level System
4️⃣ Reminders
5️⃣ Mini-Games
6️⃣ Fun Commands
7️⃣ Feature Tracker & Upcoming Upgrades

🚀 Upcoming Upgrades:
- Daily XP & streaks
- Custom buddy personalities
- Mood-aware mini-games
- Leaderboards for all users
- Recurring reminders
`;
      return m.send(featureList);
    }

    // Personalized fallback
    let reply = `🙂 I’m listening${user.name ? ", " + user.name : ""}…`;
    if (user.favorite && msg.includes("what do you think")) reply = `😎 I know you love ${user.favorite}, so that’s awesome!`;
    if (user.mood === "sad") reply += " 😔 Stay strong, I’m with you!";
    if (user.mood === "happy") reply += " 😄 I love your energy!";
    if (user.mood === "angry") reply += " 😌 Take a deep breath… I got you";

    user.lastMessage = text;
    saveMemory();

    return m.send(reply);
  }
);