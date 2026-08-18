const { cmd } = require("../command");
const axios = require("axios");
const config = require("../config");

cmd(
  {
    pattern: "tiktok",
    alias: ["tt", "tik", "tiktokdl"],
    react: "🎵",
    desc: "Download TikTok Video without Watermark",
    category: "download",
    filename: __filename,
  },
  async (
    sachiya,
    mek,
    m,
    {
      from,
      quoted,
      body,
      isCmd,
      command,
      args,
      q,
      isGroup,
      sender,
      senderNumber,
      pushname,
      reply,
    }
  ) => {
    try {
      if (!q) return reply("⚠️ *Please provide a valid TikTok video URL!*");

      const ttRegex = /(https?:\/\/)?(www\.)?(tiktok\.com|vm\.tiktok\.com|vt\.tiktok\.com)\/.+/;
      if (!ttRegex.test(q)) {
        return reply("❌ *Invalid TikTok URL! Please check and try again.*");
      }

      const userName = pushname || m.pushName || mek.pushName || 'User';

      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      // Using a highly stable and powerful API for TikTok downloads
      const apiUrl = `https://apis.davidcyriltech.my.id/download/tiktok?url=${encodeURIComponent(q)}`;
      const response = await axios.get(apiUrl).catch(() => null);

      if (!response || !response.data || !response.data.success) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to download TikTok video. Please check the URL or try again later!*");
      }

      const data = response.data.result;
      const videoUrl = data.videoUrl || data.hd || data.sd;
      const title = data.title || "TikTok Video";
      const author = data.author || "Unknown";

      const captionMsg = `╭━━━〔 *TIKTOK DOWNLOADER* 〕━━━\n` +
                         `┃\n` +
                         `┃ 🎵 *Title:* ${title}\n` +
                         `┃ 👤 *Author:* ${author}\n` +
                         `┃ 👤 *User:* ${userName}\n` +
                         `┃\n` +
                         `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                         `> Powered by SACHIYA MD 💫`;

      // 1. Send Preview Image with Info
      await sachiya.sendMessage(
        from,
        {
          image: {
            url: config.ALIVE_IMG || "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true",
          },
          caption: captionMsg,
        },
        { quoted: mek }
      );

      // 2. Send the High-Quality Video without Watermark
      await sachiya.sendMessage(
        from,
        {
          video: { url: videoUrl },
          mimetype: "video/mp4",
          caption: `📥 *TikTok Video Downloaded Successfully (HD)*\n\n> Powered by SACHIYA MD 💫`,
        },
        { quoted: mek }
      );

      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.error("TikTok Downloader Error:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply(`❌ *Error:* ${e.message || "An unexpected error occurred!"}`);
    }
  }
);
