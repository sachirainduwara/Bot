const { cmd } = require("../command");
const { tiktok } = require("sadaslk-dlcore");

cmd(
  {
    pattern: "tiktok",
    alias: ["tt"],
    react: "📱",
    desc: "Download TikTok video",
    category: "download",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("⚠️ *Please provide a valid TikTok link!*");

      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      const data = await tiktok(q);
      if (!data || (!data.no_watermark && !data.url)) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to download TikTok video! Make sure link is public.*");
      }

      const videoUrl = data.no_watermark || data.url;

      // 🎨 SACHIYA-MD TIKTOK CARD
      const caption = `╭━━━〔 *TIKTOK DOWNLOADER* 〕━━━\n` +
                      `┃\n` +
                      `┃ 🎵 *Title:* ${data.title || "TikTok Video"}\n` +
                      `┃ 👤 *Author:* ${data.author || "Unknown"}\n` +
                      `┃ ⏱ *Duration:* ${data.runtime || "0"}s\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                      `> Powered by SACHIYA MD 💫`;

      await sachiya.sendMessage(
        from,
        {
          video: { url: videoUrl },
          caption,
          mimetype: "video/mp4"
        },
        { quoted: mek }
      );

      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.log("TIKTOK ERROR:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply("❌ *Error while downloading TikTok video!*");
    }
  }
);
