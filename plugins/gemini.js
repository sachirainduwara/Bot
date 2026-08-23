const { cmd } = require("../command");
const axios = require("axios");

const API_BASE = "https://ai-proxy-server-smoky.vercel.app/";

cmd(
  {
    pattern: "gemini",
    react: "✨",
    desc: "Chat with Gemini AI",
    category: "ai",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply }) => {
    if (!q) return reply("*❌ Please provide a query or prompt! Example:* `.gemini Hello` ❓");

    try {
      const payload = { query: q };
      const res = await axios.post(`${API_BASE}/gemini`, payload);

      await sachiya.sendMessage(
        from,
        { text: res.data.answer || "*❌ No response received from Gemini!* ⚠️" },
        { quoted: mek }
      );
    } catch (err) {
      console.error("Gemini Error:", err.message);
      reply("*❌ Failed to fetch response from GEMINI.* ⚠️");
    }
  }
);
