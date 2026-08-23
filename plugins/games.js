const { cmd } = require("../command");
const fetch = require("node-fetch");

// Store game sessions per user
const pendingGame = {};

// ──────────────── Rock Paper Scissors ────────────────
cmd(
  {
    pattern: "rps",
    react: "✊",
    desc: "Play Rock Paper Scissors",
    category: "fun",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, sender }) => {
    pendingGame[sender] = { type: "rps" };
    await sachiya.sendMessage(
      from,
      { 
        text: `╭━━━〔 *✨ SACHIYA-MD RPS ✨* 〕━━━\n` +
              `┃\n` +
              `┃ ✊ *Rock Paper Scissors*\n` +
              `┃\n` +
              `┃ *Reply with one:*\n` +
              `┃ • rock\n` +
              `┃ • paper\n` +
              `┃ • scissors\n` +
              `┃\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `> *⚡ Powered by SACHIYA-MD 💫*` 
      },
      { quoted: mek }
    );
  }
);

// ──────────────── Math Quiz ────────────────
cmd(
  {
    pattern: "quiz",
    react: "🧮",
    desc: "Answer a random math quiz",
    category: "fun",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, sender }) => {
    const num1 = Math.floor(Math.random() * 20) + 1;
    const num2 = Math.floor(Math.random() * 20) + 1;
    const answer = num1 + num2;

    pendingGame[sender] = { type: "quiz", answer };

    await sachiya.sendMessage(
      from,
      { 
        text: `╭━━━〔 *✨ SACHIYA-MD MATH QUIZ ✨* 〕━━━\n` +
              `┃\n` +
              `┃ 🧮 *What is:* ${num1} + ${num2} ?\n` +
              `┃ 💡 *Reply with your answer.* ✍️\n` +
              `┃\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `> *⚡ Powered by SACHIYA-MD 💫*` 
      },
      { quoted: mek }
    );
  }
);

// ──────────────── Hangman ────────────────
const words = ["apple", "banana", "dragon", "whatsapp", "sachiya", "coding", "plugin"];

cmd(
  {
    pattern: "hangman",
    react: "🎯",
    desc: "Guess the hidden word",
    category: "fun",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, sender }) => {
    const word = words[Math.floor(Math.random() * words.length)];
    const hidden = word.replace(/./g, "_ ");
    pendingGame[sender] = { type: "hangman", word, progress: Array(word.length).fill("_"), attempts: 6 };

    await sachiya.sendMessage(
      from,
      { 
        text: `╭━━━〔 *✨ SACHIYA-MD HANGMAN ✨* 〕━━━\n` +
              `┃\n` +
              `┃ 🎯 *Hangman Game Started!* 🎮\n` +
              `┃ 📝 *Word:* ${hidden}\n` +
              `┃ ❤️ *Attempts left:* 6\n` +
              `┃ 💡 *Reply with one letter.* 🔤\n` +
              `┃\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `> *⚡ Powered by SACHIYA-MD 💫*` 
      },
      { quoted: mek }
    );
  }
);

// ──────────────── Trivia ────────────────
cmd(
  {
    pattern: "trivia",
    react: "📚",
    desc: "Answer a random trivia question",
    category: "fun",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, sender, reply }) => {
    try {
      const res = await fetch("https://opentdb.com/api.php?amount=1&type=multiple");
      const data = await res.json();
      const q = data.results[0];
      const options = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);

      pendingGame[sender] = { type: "trivia", answer: q.correct_answer };

      let optionsText = "";
      options.forEach((o, i) => (optionsText += `┃ ${i + 1}. ${o}\n`));

      const text = `╭━━━〔 *✨ SACHIYA-MD TRIVIA ✨* 〕━━━\n` +
                   `┃\n` +
                   `┃ 📚 *Trivia Time!* 🤔\n` +
                   `┃\n` +
                   `┃ ${q.question}\n` +
                   `┃\n` +
                   `${optionsText}` +
                   `┃ 💡 *Reply with the correct option or answer.* ✍️\n` +
                   `┃\n` +
                   `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                   `> *⚡ Powered by SACHIYA-MD 💫*`;

      await sachiya.sendMessage(from, { text }, { quoted: mek });
    } catch {
      reply("*❌ Trivia API error occurred right now!* ⚠️");
    }
  }
);

// ──────────────── Fast Typing ────────────────
cmd(
  {
    pattern: "fast",
    react: "⌨️",
    desc: "Typing speed challenge",
    category: "fun",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, sender }) => {
    const fastWords = ["whatsapp", "sachiya", "coding", "banana", "developer", "friendship"];
    const word = fastWords[Math.floor(Math.random() * fastWords.length)];

    pendingGame[sender] = { type: "fast", word, start: Date.now() };

    await sachiya.sendMessage(
      from,
      { 
        text: `╭━━━〔 *✨ SACHIYA-MD TYPING ✨* 〕━━━\n` +
              `┃\n` +
              `┃ ⌨️ *Fast Typing Challenge!* ⏱️\n` +
              `┃ ⏳ Type this word within 15s:\n` +
              `┃ 👉 *${word}*\n` +
              `┃\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `> *⚡ Powered by SACHIYA-MD 💫*` 
      },
      { quoted: mek }
    );
  }
);

// ──────────────── Who Am I ────────────────
const whoamiList = [
  { clue: "I am the founder of Microsoft.", answer: "bill gates" },
  { clue: "I am Iron Man in the Marvel movies.", answer: "tony stark" },
  { clue: "I am the founder of Facebook.", answer: "mark zuckerberg" },
  { clue: "I am the king of the jungle.", answer: "lion" },
];

cmd(
  {
    pattern: "whoami",
    react: "🕵️",
    desc: "Guess the person/character",
    category: "fun",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, sender }) => {
    const item = whoamiList[Math.floor(Math.random() * whoamiList.length)];
    pendingGame[sender] = { type: "whoami", answer: item.answer };

    await sachiya.sendMessage(
      from,
      { 
        text: `╭━━━〔 *✨ SACHIYA-MD WHOAMI ✨* 〕━━━\n` +
              `┃\n` +
              `┃ 🕵️ *Who Am I?* 🤔\n` +
              `┃ 🧩 *Clue:* ${item.clue}\n` +
              `┃ 💡 *Reply with your guess.* ✍️\n` +
              `┃\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `> *⚡ Powered by SACHIYA-MD 💫*` 
      },
      { quoted: mek }
    );
  }
);

// ──────────────── Emoji Quiz ────────────────
const emojiQuiz = [
  { clue: "🎬🧙‍♂️💍", answer: "lord of the rings" },
  { clue: "👸❄️⛄", answer: "frozen" },
  { clue: "🦁👑", answer: "lion king" },
  { clue: "🚗💨🏎️", answer: "fast and furious" },
];

cmd(
  {
    pattern: "emojiquiz",
    react: "🤔",
    desc: "Guess movie/song from emojis",
    category: "fun",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, sender }) => {
    const item = emojiQuiz[Math.floor(Math.random() * emojiQuiz.length)];
    pendingGame[sender] = { type: "emojiquiz", answer: item.answer };

    await sachiya.sendMessage(
      from,
      { 
        text: `╭━━━〔 *✨ SACHIYA-MD EMOJI QUIZ ✨* 〕━━━\n` +
              `┃\n` +
              `┃ 🤔 *Emoji Quiz* 🎬\n` +
              `┃ 🧩 *Clue:* ${item.clue}\n` +
              `┃ 💡 *Reply with your guess.* ✍️\n` +
              `┃\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `> *⚡ Powered by SACHIYA-MD 💫*` 
      },
      { quoted: mek }
    );
  }
);

// ──────────────── Tic Tac Toe ────────────────
const renderBoard = (board) =>
  board.map((row) => row.map((c) => (c ? c : "⬜")).join(" ")).join("\n");

cmd(
  {
    pattern: "ttt",
    react: "❌",
    desc: "Play Tic Tac Toe with sachiya",
    category: "fun",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, sender }) => {
    const board = [
      ["", "", ""],
      ["", "", ""],
      ["", "", ""],
    ];
    pendingGame[sender] = { type: "ttt", board };

    await sachiya.sendMessage(
      from,
      { 
        text: `╭━━━〔 *✨ SACHIYA-MD TTT ✨* 〕━━━\n` +
              `┃\n` +
              `┃ ❌⭕ *Tic Tac Toe* 🎮\n` +
              `┃ 📌 You are X. Reply with row,col (1-3).\n` +
              `┃\n` +
              `${renderBoard(board).split("\n").map(l => `┃ ${l}`).join("\n")}\n` +
              `┃\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `> *⚡ Powered by SACHIYA-MD 💫*` 
      },
      { quoted: mek }
    );
  }
);

// ──────────────── Reply Handler ────────────────
cmd(
  {
    on: "text",
  },
  async (sachiya, mek, m, { from, sender, body, reply }) => {
    if (!pendingGame[sender]) return;
    const game = pendingGame[sender];
    const input = body.trim().toLowerCase();

    // RPS
    if (game.type === "rps") {
      const choices = ["rock", "paper", "scissors"];
      if (!choices.includes(input)) return;
      const sachiyaChoice = choices[Math.floor(Math.random() * choices.length)];

      let result = "🤝 It's a draw!";
      if (
        (input === "rock" && sachiyaChoice === "scissors") ||
        (input === "paper" && sachiyaChoice === "rock") ||
        (input === "scissors" && sachiyaChoice === "paper")
      ) {
        result = "🎉 You win! 🏆";
      } else if (input !== sachiyaChoice) {
        result = "😢 You lose! ❌";
      }

      await sachiya.sendMessage(
        from, 
        { 
          text: `╭━━━〔 *✨ SACHIYA-MD RPS ✨* 〕━━━\n` +
                `┃\n` +
                `┃ ✊ *You:* ${input}\n` +
                `┃ 🤖 *SACHIYA-MD:* ${sachiyaChoice}\n` +
                `┃\n` +
                `┃ ${result}\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `> *⚡ Powered by SACHIYA-MD 💫*` 
        }, 
        { quoted: mek }
      );
      delete pendingGame[sender];
    }

    // Math Quiz
    else if (game.type === "quiz") {
      const guess = parseInt(input);
      if (isNaN(guess)) return reply("*❌ Please reply with a valid number!* ⚠️");
      if (guess === game.answer) {
        await sachiya.sendMessage(
          from, 
          { 
            text: `╭━━━〔 *✨ SACHIYA-MD QUIZ ✨* 〕━━━\n` +
                  `┃\n` +
                  `┃ 🎉 *Correct!* The answer was ${game.answer} ✅\n` +
                  `┃\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `> *⚡ Powered by SACHIYA-MD 💫*` 
          }, 
          { quoted: mek }
        );
      } else {
        await sachiya.sendMessage(
          from, 
          { 
            text: `╭━━━〔 *✨ SACHIYA-MD QUIZ ✨* 〕━━━\n` +
                  `┃\n` +
                  `┃ 😢 *Wrong!* The correct answer was ${game.answer} ❌\n` +
                  `┃\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `> *⚡ Powered by SACHIYA-MD 💫*` 
          }, 
          { quoted: mek }
        );
      }
      delete pendingGame[sender];
    }

    // Hangman
    else if (game.type === "hangman") {
      if (!/^[a-z]$/.test(input)) return reply("*❌ Please reply with a single English letter!* ⚠️");
      let found = false;

      game.word.split("").forEach((ch, i) => {
        if (ch === input && game.progress[i] === "_") {
          game.progress[i] = ch;
          found = true;
        }
      });

      if (!found) game.attempts--;

      if (!game.progress.includes("_")) {
        await sachiya.sendMessage(
          from, 
          { 
            text: `╭━━━〔 *✨ SACHIYA-MD HANGMAN ✨* 〕━━━\n` +
                  `┃\n` +
                  `┃ 🎉 *You guessed it!* Word was: *${game.word}* ✅\n` +
                  `┃\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `> *⚡ Powered by SACHIYA-MD 💫*` 
          }, 
          { quoted: mek }
        );
        delete pendingGame[sender];
      } else if (game.attempts <= 0) {
        await sachiya.sendMessage(
          from, 
          { 
            text: `╭━━━〔 *✨ SACHIYA-MD HANGMAN ✨* 〕━━━\n` +
                  `┃\n` +
                  `┃ 💀 *Game over!* The word was: *${game.word}* ❌\n` +
                  `┃\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `> *⚡ Powered by SACHIYA-MD 💫*` 
          }, 
          { quoted: mek }
        );
        delete pendingGame[sender];
      } else {
        await sachiya.sendMessage(
          from,
          { 
            text: `╭━━━〔 *✨ SACHIYA-MD HANGMAN ✨* 〕━━━\n` +
                  `┃\n` +
                  `┃ 🎯 *Word:* ${game.progress.join(" ")}\n` +
                  `┃ ❤️ *Attempts left:* ${game.attempts}\n` +
                  `┃\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `> *⚡ Powered by SACHIYA-MD 💫*` 
          },
          { quoted: mek }
        );
      }
    }

    // Trivia
    else if (game.type === "trivia") {
      if (input.includes(game.answer.toLowerCase())) {
        await sachiya.sendMessage(
          from, 
          { 
            text: `╭━━━〔 *✨ SACHIYA-MD TRIVIA ✨* 〕━━━\n` +
                  `┃\n` +
                  `┃ ✅ *Correct!* Answer: *${game.answer}* 🎉\n` +
                  `┃\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `> *⚡ Powered by SACHIYA-MD 💫*` 
          }, 
          { quoted: mek }
        );
      } else {
        await sachiya.sendMessage(
          from, 
          { 
            text: `╭━━━〔 *✨ SACHIYA-MD TRIVIA ✨* 〕━━━\n` +
                  `┃\n` +
                  `┃ ❌ *Wrong!* Correct answer: *${game.answer}* ⚠️\n` +
                  `┃\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `> *⚡ Powered by SACHIYA-MD 💫*` 
          }, 
          { quoted: mek }
        );
      }
      delete pendingGame[sender];
    }

    // Fast Typing
    else if (game.type === "fast") {
      const now = Date.now();
      const diff = (now - game.start) / 1000;
      if (input === game.word) {
        if (diff <= 15) {
          await sachiya.sendMessage(
            from, 
            { 
              text: `╭━━━〔 *✨ SACHIYA-MD TYPING ✨* 〕━━━\n` +
                    `┃\n` +
                    `┃ ⚡ *Fast!* You typed correctly in ${diff.toFixed(1)}s 🎉\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `> *⚡ Powered by SACHIYA-MD 💫*` 
            }, 
            { quoted: mek }
          );
        } else {
          await sachiya.sendMessage(
            from, 
            { 
              text: `╭━━━〔 *✨ SACHIYA-MD TYPING ✨* 〕━━━\n` +
                    `┃\n` +
                    `┃ ⏱️ *Too late!* You took ${diff.toFixed(1)}s ⚠️\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `> *⚡ Powered by SACHIYA-MD 💫*` 
            }, 
            { quoted: mek }
          );
        }
      } else {
        await sachiya.sendMessage(
          from, 
          { 
            text: `╭━━━〔 *✨ SACHIYA-MD TYPING ✨* 〕━━━\n` +
                  `┃\n` +
                  `┃ ❌ *Wrong word!* The correct word was: *${game.word}* ⚠️\n` +
                  `┃\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `> *⚡ Powered by SACHIYA-MD 💫*` 
          }, 
          { quoted: mek }
        );
      }
      delete pendingGame[sender];
    }

    // Who Am I
    else if (game.type === "whoami") {
      if (input.includes(game.answer)) {
        await sachiya.sendMessage(
          from, 
          { 
            text: `╭━━━〔 *✨ SACHIYA-MD WHOAMI ✨* 〕━━━\n` +
                  `┃\n` +
                  `┃ 🎉 *Correct!* I am *${game.answer}* ✅\n` +
                  `┃\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `> *⚡ Powered by SACHIYA-MD 💫*` 
          }, 
          { quoted: mek }
        );
      } else {
        await sachiya.sendMessage(
          from, 
          { 
            text: `╭━━━〔 *✨ SACHIYA-MD WHOAMI ✨* 〕━━━\n` +
                  `┃\n` +
                  `┃ ❌ *Wrong!* The answer was: *${game.answer}* ⚠️\n` +
                  `┃\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `> *⚡ Powered by SACHIYA-MD 💫*` 
          }, 
          { quoted: mek }
        );
      }
      delete pendingGame[sender];
    }

    // Emoji Quiz
    else if (game.type === "emojiquiz") {
      if (input.includes(game.answer)) {
        await sachiya.sendMessage(
          from, 
          { 
            text: `╭━━━〔 *✨ SACHIYA-MD EMOJI QUIZ ✨* 〕━━━\n` +
                  `┃\n` +
                  `┃ 🎬 *Correct!* It was *${game.answer}* 🎉\n` +
                  `┃\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `> *⚡ Powered by SACHIYA-MD 💫*` 
          }, 
          { quoted: mek }
        );
      } else {
        await sachiya.sendMessage(
          from, 
          { 
            text: `╭━━━〔 *✨ SACHIYA-MD EMOJI QUIZ ✨* 〕━━━\n` +
                  `┃\n` +
                  `┃ ❌ *Wrong!* Correct answer was: *${game.answer}* ⚠️\n` +
                  `┃\n` +
                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                  `> *⚡ Powered by SACHIYA-MD 💫*` 
          }, 
          { quoted: mek }
        );
      }
      delete pendingGame[sender];
    }

    // Tic Tac Toe
    else if (game.type === "ttt") {
      const [r, c] = input.split(",").map((n) => parseInt(n) - 1);
      if (isNaN(r) || isNaN(c) || r < 0 || r > 2 || c < 0 || c > 2) return reply("*❌ Invalid move. Use row,col (1-3).* ⚠️");
      if (game.board[r][c]) return reply("*❌ Spot already taken!* ⚠️");

      game.board[r][c] = "X";

      // sachiya move
      const empty = [];
      game.board.forEach((row, i) =>
        row.forEach((cell, j) => {
          if (!cell) empty.push([i, j]);
        })
      );
      if (empty.length > 0) {
        const [br, bc] = empty[Math.floor(Math.random() * empty.length)];
        game.board[br][bc] = "O";
      }

      await sachiya.sendMessage(
        from, 
        { 
          text: `╭━━━〔 *✨ SACHIYA-MD TTT ✨* 〕━━━\n` +
                `┃\n` +
                `┃ ❌⭕ *Tic Tac Toe* 🎮\n` +
                `┃\n` +
                `${renderBoard(game.board).split("\n").map(l => `┃ ${l}`).join("\n")}\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `> *⚡ Powered by SACHIYA-MD 💫*` 
        }, 
        { quoted: mek }
      );
    }
  }
);
