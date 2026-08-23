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
      if (!q) {
        return await sachiya.sendMessage(from, {
          text: `╭━━━〔 *✨ TIKTOK DOWNLOADER ✨* 〕━━━\n` +
                `┃\n` +
                `┃ ⚠️ *Please provide a valid TikTok link!*\n` +
                `┃ 📌 *Example:* \`.tiktok https://vt.tiktok.com/ZS2xxxxxx/\`\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `> *⚡ Powered by SACHIYA-MD 💫*`
        }, { quoted: mek });
      }

      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      const data = await tiktok(q);
      if (!data || (!data.no_watermark && !data.url)) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to download TikTok video! Make sure the link is public.* 🚫");
      }

      const videoUrl = data.no_watermark || data.url;

      // 🎨 SACHIYA-MD TIKTOK UI CARD
      const title = data.title || "TikTok Video";
      const author = data.author || "Unknown";
      const runtime = data.runtime || "0";

      const caption = `╭━━━〔 *🎬 TIKTOK DOWNLOADER 🎵* 〕━━━\n` +
                      `┃\n` +
                      `┃ 📌 *Title:* ${title.length > 60 ? title.substring(0, 57) + '...' : title}\n` +
                      `┃ 👤 *Author:* ${author}\n` +
                      `┃ ⏱️ *Duration:* ${runtime}s\n` +
                      `┃ 📥 *Status:* Successfully Downloaded! ✅\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                      `> *⚡ Powered by SACHIYA-MD 💫*`;

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
      reply("❌ *An error occurred while downloading the TikTok video!* ⚠️");
    }
  }
);
