const { cmd, commands } = require("../command");
const axios = require("axios");

cmd(
  {
    pattern: "define",
    alias: ["meaning", "def"],
    react: "📖",
    desc: "Get word definition",
    category: "tools",
    filename: __filename,
  },
  async (
    sachiya,
    mek,
    m,
    {
      from,
      q,
      reply,
    }
  ) => {
    try {
      if (!q) return reply("*❌ Please provide a word to define! Example:* `.define hello` ❓");

      const res = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${q}`);
      const data = res.data[0];

      let definitionBody = "";

      data.meanings.forEach((meaning, i) => {
        definitionBody += `🔹 *Part of Speech:* ${meaning.partOfSpeech}\n`;
        meaning.definitions.slice(0, 2).forEach((def, j) => {
          definitionBody += `   ${j + 1}. ${def.definition}\n`;
          if (def.example) {
            definitionBody += `      _e.g., ${def.example}_\n`;
          }
        });
        definitionBody += `\n`;
      });

      const text = `╭━━━〔 *✨ SACHIYA-MD DICTIONARY ✨* 〕━━━\n` +
                   `┃\n` +
                   `┃ 📚 *Definition of "${data.word}"*\n` +
                   `┃\n` +
                   `${definitionBody}` +
                   `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                   `> *⚡ Powered by SACHIYA-MD 💫*`;

      reply(text.trim());
    } catch (e) {
      console.error(e);
      reply("*❌ Could not find a definition for that word. Please check the spelling.* ⚠️");
    }
  }
);
