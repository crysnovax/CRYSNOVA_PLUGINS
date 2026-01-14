const { Kord } = require("kord"); // Make sure Kord is installed
const bot = new Kord("YOUR_BOT_TOKEN"); // Replace with your bot token

const prefix = ".";

// ---------- GAME STATE ----------
let currentGame = null;

function createGame(channelId) {
    return {
        channel: channelId,
        players: [],
        currentTurn: 0,
        questions: [],
        timer: null,
        started: false
    };
}

// ---------- QUESTION BANK ----------
// 100 hard line-picture questions
const questionsBank = [
    // Example questions — full 100 to be added here
    {
        pic: `
   __
  |  |
  |__|`,
        options: ['Square', 'Triangle', 'Rectangle', 'Circle'],
        answer: 'Square'
    },
    {
        pic: `
   /\\
  /  \\
 /____\\`,
        options: ['Triangle', 'Arrow', 'Mountain', 'Roof'],
        answer: 'Triangle'
    },
    {
        pic: `
   /\\_/\\
  ( o.o )
   > ^ <`,
        options: ['Dog', 'Cat', 'Rabbit', 'Mouse'],
        answer: 'Cat'
    },
    // … add remaining 97 questions here in same format
];

// ---------- UTILS ----------
function shuffleArray(arr) {
    return arr.sort(() => Math.random() - 0.5);
}

// ---------- GAME FUNCTIONS ----------
async function nextTurn() {
    const alivePlayers = currentGame.players.filter(p => p.alive);
    if (alivePlayers.length <= 1) return announceWinner();

    currentGame.currentTurn = (currentGame.currentTurn + 1) % currentGame.players.length;
    let player = currentGame.players[currentGame.currentTurn];
    if (!player.alive) return nextTurn();

    if (currentGame.questions.length === 0) currentGame.questions = shuffleArray([...questionsBank]);
    const q = currentGame.questions.shift();
    const optionsText = ['A','B','C','D'].map((o,i)=>`${o}) ${q.options[i]}`).join('\n');

    await bot.sendMessage(currentGame.channel,
        `🎮 ${player.name}'s turn!\nGuess the object:\n${q.pic}\n${optionsText}\n\nType: .answer <A/B/C/D>\nYou have 30 seconds!`
    );

    // Start turn timer
    currentGame.timer = setTimeout(async () => {
        await bot.sendMessage(currentGame.channel, `⏱ Time's up! ${player.name} did not answer and is eliminated.`);
        player.alive = false;
        checkGameOver();
    }, 30000);
}

function checkGameOver() {
    const alivePlayers = currentGame.players.filter(p => p.alive);
    if (alivePlayers.length <= 1) return announceWinner();
    nextTurn();
}

async function announceWinner() {
    const winner = currentGame.players.find(p => p.alive);
    if (winner) await bot.sendMessage(currentGame.channel, `🏆 Congrats ${winner.name}! You won the 3 Player Line-Picture Quiz!`);
    else await bot.sendMessage(currentGame.channel, 'No winners this time! All players eliminated.');
    currentGame = null;
}

// ---------- EVENT HANDLER ----------
bot.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const channelId = message.channel.id;
    const senderId = message.author.id;

    // Start game
    if (command === "megstart") {
        if (currentGame && currentGame.started) return message.reply("A game is already running!");
        currentGame = createGame(channelId);
        message.reply("🎮 3 Player Guess Game Started! Players type `.join`. Game auto-cancels in 1 minute if not enough players.");

        setTimeout(() => {
            if (!currentGame.started) {
                bot.sendMessage(channelId, "⏱ Game cancelled! Not enough players joined.");
                currentGame = null;
            }
        }, 60000);
    }

    // Player joins
    else if (command === "join") {
        if (!currentGame || currentGame.started) return;
        if (currentGame.players.find(p => p.id === senderId)) return message.reply("You already joined!");

        currentGame.players.push({ id: senderId, name: message.author.username, alive: true });
        message.reply(`${message.author.username} joined the game! (${currentGame.players.length}/3)`);

        if (currentGame.players.length === 3) {
            currentGame.started = true;
            currentGame.questions = shuffleArray([...questionsBank]);
            message.reply("✅ All 3 players joined! Game starting...");
            nextTurn();
        }
    }

    // Player answers
    else if (command === "answer") {
        if (!currentGame || !currentGame.started) return;
        const currentPlayer = currentGame.players[currentGame.currentTurn];
        if (senderId !== currentPlayer.id) return message.reply("⚠️ It's not your turn!");

        const answer = args[0]?.trim();
        if (!answer) return message.reply("Please provide your answer after `.answer` (e.g., `.answer A`)");

        clearTimeout(currentGame.timer);

        const q = currentGame.questions.shift();
        const correctOption = q.answer;
        if (answer.toLowerCase() === correctOption[0].toLowerCase() || answer.toLowerCase() === correctOption.toLowerCase()) {
            message.reply(`✅ Correct! ${currentPlayer.name} survives.`);
            nextTurn();
        } else {
            message.reply(`❌ Wrong! ${currentPlayer.name} is eliminated.`);
            currentPlayer.alive = false;
            checkGameOver();
        }
    }
});