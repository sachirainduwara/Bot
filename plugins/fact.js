const { cmd } = require("../command");
const axios = require("axios");

cmd(
  {
    pattern: "fact",
    alias: ["didyouknow"],
    react: "🧠",
    desc: "Get a random fun fact",
    category: "fun",
    filename: __filename,
  },
  async (sachiya, mek, m, { reply }) => {
    try {
      const res = await axios.get("https://uselessfacts.jsph.pl/random.json?language=en");
      reply(
        `╭━━━〔 *✨ SACHIYA-MD FACT ✨* 〕━━━\n` +
        `┃\n` +
        `┃ 💡 *Did you know?*\n` +
        `┃ ${res.data.text}\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `> *⚡ Powered by SACHIYA-MD 💫*`
      );
    } catch {
      reply("*❌ Unable to fetch a fact right now. Please try again later!* ⚠️");
    }
  }
);
