const { cmd } = require("../command");
const math = require("mathjs");

cmd(
  {
    pattern: "calc",
    alias: ["calculate", "math"],
    react: "🧮",
    desc: "Evaluate math expressions (supports sin, sqrt, log, etc.)",
    category: "tools",
    filename: __filename,
  },
  async (sachiya, mek, m, { q, reply }) => {
    try {
      if (!q) {
        return reply(
          `╭━━━〔 *✨ SACHIYA-MD CALCULATOR ✨* 〕━━━\n` +
          `┃\n` +
          `┃ 📌 *Please enter a math expression to evaluate.* 🧮\n` +
          `┃\n` +
          `┃ *Examples:*\n` +
          `┃ • .calc 5 + 3\n` +
          `┃ • .calc sqrt(25)\n` +
          `┃ • .calc sin(30 deg)\n` +
          `┃ • .calc 3^3 + log(100)\n` +
          `┃\n` +
          `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `> *⚡ Powered by SACHIYA-MD 💫*`
        );
      }

      const expression = q
        .replace(/(\d+)\s*deg/g, "($1 deg)") 
        .replace(/π/g, "pi") 
        .trim();

      const scope = {
        deg: math.unit("1 deg"),
        pi: math.pi,
        e: math.e,
      };

      let result;
      try {
        result = math.evaluate(expression, scope);

        if (typeof result === "object" && result.format) {
          result = result.toString();
        }
      } catch (err) {
        return reply(
          `╭━━━〔 *⚠️ CALC ERROR ⚠️* 〕━━━\n` +
          `┃\n` +
          `┃ ❌ *Invalid Expression:*\n` +
          `┃ \`\`\`${err.message}\`\`\`\n` +
          `┃\n` +
          `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `> *⚡ SACHIYA-MD 💫*`
        );
      }

      return reply(
        `╭━━━〔 *✨ SACHIYA-MD CALCULATOR ✨* 〕━━━\n` +
        `┃\n` +
        `┃ 🧮 *Result:*\n` +
        `┃ \`\`\`${q} = ${result}\`\`\`\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `> *⚡ Powered by SACHIYA-MD 💫*`
      );
    } catch (e) {
      console.error(e);
      reply(
        `╭━━━〔 *⚠️ UNEXPECTED ERROR ⚠️* 〕━━━\n` +
        `┃\n` +
        `┃ ❌ *Error:*\n` +
        `┃ \`\`\`${e.message}\`\`\`\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `> *⚡ SACHIYA-MD 💫*`
      );
    }
  }
);
