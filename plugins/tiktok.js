const { cmd } = require("../command");
const axios = require("axios");

cmd(
  {
    pattern: "tiktok",
    alias: ["tt", "ttdl"],
    react: "📱",
    desc: "Download TikTok video securely",
    category: "download",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply }) => {
    try {
      if (!q || !q.includes("tiktok.com")) return reply("⚠️ *Please provide a valid TikTok Link!*");

      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      // TikWM Public API (Direct & Stable)
      let res = await axios.post("https://www.tikwm.com/api/", { url: q }, {
        headers: {
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          "user-agent": "Mozilla/5.0"
        }
      });

      let videoUrl = res.data?.data?.play || res.data?.data?.hdplay;

      if (!videoUrl) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to download TikTok video! Make sure the link is public.*");
      }

      let caption = `╭━━━〔 *TIKTOK DOWNLOADER* 〕━━━\n` +
                    `┃\n` +
                    `┃ 📱 *Status:* Successfully Downloaded\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                    `> *Powered by SACHIYA MD 💫*`;

      await sachiya.sendMessage(
        from,
        {
          video: { url: videoUrl },
          mimetype: "video/mp4",
          caption
        },
        { quoted: mek }
      );

      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.log("TIKTOK ERROR:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply("❌ *Error while processing your request!*");
    }
  }
);
