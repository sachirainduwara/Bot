const { cmd } = require("../command");
const fetch = require("node-fetch");

async function getJSON(url) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (e) {
    console.error("API Fetch Error:", e);
    return null;
  }
}

cmd(
  {
    pattern: "pickup",
    react: "💘",
    desc: "Get a cheesy pickup line",
    category: "fun",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, reply }) => {
    const data = await getJSON("https://vinuxd.vercel.app/api/pickup");
    if (!data || !data.pickup) return reply("*❌ No pickup line found right now!* ⚠️");
    await sachiya.sendMessage(
      from, 
      { 
        text: `╭━━━〔 *✨ SACHIYA-MD PICKUP ✨* 〕━━━\n` +
              `┃\n` +
              `┃ 💘 *Pickup Line:*\n` +
              `┃ ${data.pickup}\n` +
              `┃\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `> *⚡ Powered by SACHIYA-MD 💫*` 
      }, 
      { quoted: mek }
    );
  }
);

cmd(
  {
    pattern: "dare",
    react: "🔥",
    desc: "Get a random dare challenge",
    category: "fun",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, reply }) => {
    const dares = await getJSON("https://api.truthordarebot.xyz/v1/dare");
    if (!dares || !dares.question) return reply("*❌ Could not get a dare challenge right now!* ⚠️");
    await sachiya.sendMessage(
      from, 
      { 
        text: `╭━━━〔 *✨ SACHIYA-MD DARE ✨* 〕━━━\n` +
              `┃\n` +
              `┃ 🔥 *Dare Challenge:*\n` +
              `┃ ${dares.question}\n` +
              `┃\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `> *⚡ Powered by SACHIYA-MD 💫*` 
      }, 
      { quoted: mek }
    );
  }
);

cmd(
  {
    pattern: "wyr",
    react: "⚖️",
    desc: "Would You Rather question",
    category: "fun",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, reply }) => {
    const data = await getJSON("https://api.truthordarebot.xyz/v1/wyr");
    if (!data || !data.question) return reply("*❌ Could not get a WYR question right now!* ⚠️");
    await sachiya.sendMessage(
      from, 
      { 
        text: `╭━━━〔 *✨ SACHIYA-MD WYR ✨* 〕━━━\n` +
              `┃\n` +
              `┃ ⚖️ *Would You Rather:*\n` +
              `┃ ${data.question}\n` +
              `┃\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `> *⚡ Powered by SACHIYA-MD 💫*` 
      }, 
      { quoted: mek }
    );
  }
);

cmd(
  {
    pattern: "roast",
    react: "🔥",
    desc: "Get roasted!",
    category: "fun",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, reply }) => {
    const data = await getJSON("https://insult.mattbas.org/api/insult.json");
    if (!data || !data.insult) return reply("*❌ Could not fetch roast right now!* ⚠️");
    await sachiya.sendMessage(
      from, 
      { 
        text: `╭━━━〔 *✨ SACHIYA-MD ROAST ✨* 〕━━━\n` +
              `┃\n` +
              `┃ 🔥 *Roast:*\n` +
              `┃ ${data.insult}\n` +
              `┃\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `> *⚡ Powered by SACHIYA-MD 💫*` 
      }, 
      { quoted: mek }
    );
  }
);

cmd(
  {
    pattern: "insult",
    react: "😈",
    desc: "Funny insult",
    category: "fun",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, reply }) => {
    const data = await getJSON("https://evilinsult.com/generate_insult.php?lang=en&type=json");
    if (!data || !data.insult) return reply("*❌ Could not fetch insult right now!* ⚠️");
    await sachiya.sendMessage(
      from, 
      { 
        text: `╭━━━〔 *✨ SACHIYA-MD INSULT ✨* 〕━━━\n` +
              `┃\n` +
              `┃ 😈 *Insult:*\n` +
              `┃ ${data.insult}\n` +
              `┃\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `> *⚡ Powered by SACHIYA-MD 💫*` 
      }, 
      { quoted: mek }
    );
  }
);

cmd(
  {
    pattern: "compliment",
    react: "😊",
    desc: "Send a compliment",
    category: "fun",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, reply }) => {
    const data = await getJSON("https://complimentr.com/api");
    if (!data || !data.compliment) return reply("*❌ Could not fetch compliment right now!* ⚠️");
    await sachiya.sendMessage(
      from, 
      { 
        text: `╭━━━〔 *✨ SACHIYA-MD COMPLIMENT ✨* 〕━━━\n` +
              `┃\n` +
              `┃ 😊 *Compliment:*\n` +
              `┃ ${data.compliment}\n` +
              `┃\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `> *⚡ Powered by SACHIYA-MD 💫*` 
      }, 
      { quoted: mek }
    );
  }
);

cmd(
  {
    pattern: "8ball",
    react: "🎱",
    desc: "Magic 8Ball answer",
    category: "fun",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply }) => {
    if (!q) {
      return reply(
        `╭━━━〔 *✨ SACHIYA-MD 8BALL ✨* 〕━━━\n` +
        `┃\n` +
        `┃ 🎱 *Ask me a question!* \n` +
        `┃ *Example:* \`.8ball Will I be rich?\`\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `> *⚡ Powered by SACHIYA-MD 💫*`
      );
    }
    const answers = [
      "Yes, definitely!",
      "Nope, never.",
      "It’s possible, keep believing!",
      "Ask again later.",
      "Outlook not so good.",
    ];
    const ans = answers[Math.floor(Math.random() * answers.length)];
    await sachiya.sendMessage(
      from, 
      { 
        text: `╭━━━〔 *✨ SACHIYA-MD 8BALL ✨* 〕━━━\n` +
              `┃\n` +
              `┃ 🎱 *Answer:* ${ans}\n` +
              `┃\n` +
              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
              `> *⚡ Powered by SACHIYA-MD 💫*` 
      }, 
      { quoted: mek }
    );
  }
);
