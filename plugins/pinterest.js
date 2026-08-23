const { cmd } = require("../command");
const axios = require("axios");
const cheerio = require("cheerio");

cmd(
  {
    pattern: "pinterest",
    react: "📌",
    desc: "Download images or videos from Pinterest",
    category: "download",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("*❌ Please provide a Pinterest link!*\n\n*Example:* `.pinterest https://www.pinterest.com/pin/1234567890` ❓");

      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      const { data: html } = await axios.get(q, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        },
      });

      const $ = cheerio.load(html);

      let scriptData = null;
      $("script[type='application/ld+json']").each((i, el) => {
        const jsonText = $(el).html();
        if (jsonText.includes("image")) {
          scriptData = JSON.parse(jsonText);
        }
      });

      if (!scriptData) return reply("*❌ Failed to extract media from Pinterest link!* ⚠️");

      const mediaUrl = Array.isArray(scriptData.image) ? scriptData.image[0] : scriptData.image;
      
      const caption = `╭━━━〔 *✨ SACHIYA-MD PINTEREST ✨* 〕━━━\n` +
                      `┃\n` +
                      `┃ 📝 *Title:* ${scriptData.name || "Unknown"}\n` +
                      `┃ 🔗 *Source:* ${q}\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                      `> *⚡ Powered by SACHIYA-MD 💫*`;

      await sachiya.sendMessage(
        from,
        {
          image: { url: mediaUrl },
          caption,
        },
        { quoted: mek }
      );

      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });
    } catch (e) {
      console.error("Pinterest Download Error:", e);
      reply("*❌ An error occurred while downloading Pinterest content.* ⚠️");
    }
  }
);
