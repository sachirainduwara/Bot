const { cmd } = require("../command");
const { tiktok } = require("sadaslk-dlcore");

cmd(
  {
    pattern: "tiktok",
    alias: ["tt", "ttdl"],
    react: "📱",
    desc: "Download TikTok video without external APIs",
    category: "download",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply }) => {
    try {
      if (!q || !q.includes("tiktok.com")) return reply("⚠️ *Please provide a valid TikTok Link!*");

      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      let res = await tiktok(q);
      let videoUrl = res?.no_watermark || res?.url || res?.nowatermark;

      if (!videoUrl) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to download TikTok video!*");
      }

      let caption = `╭━━━〔 *TIKTOK DOWNLOADER* 〕━━━\n` +
                    `┃\n` +
                    `┃ 📱 *Status:* Successfully Downloaded\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                    `> *Powered by SACHIYA MD 💫*`;

      await sachiya.sendMessage(from, { video: { url: videoUrl }, mimetype: "video/mp4", caption }, { quoted: mek });
      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.log("TIKTOK ERROR:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply("❌ *Error while processing your request!*");
    }
  }
);
