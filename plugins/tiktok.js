const { cmd } = require("../command");
const axios = require("axios");
const config = require("../config");

cmd(
  {
    pattern: "tiktok",
    alias: ["tt", "tik"],
    react: "🎵",
    desc: "Download TikTok Video",
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

      // Using public API for TikTok download
      const apiResponse = await axios.get(`https://api.tikmate.app/api/lookup?url=${encodeURIComponent(q)}`).catch(() => null);
      
      // Fallback or alternative robust fetch if needed, let's use a stable api structure
      const response = await axios.get(`https://deliri-api-ofc.vercel.app/download/tiktok?url=${encodeURIComponent(q)}`).catch(() => null);
      
      if (!response || !response.data || !response.data.status) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to download TikTok video. Please try again later!*");
      }

      const videoData = response.data.data;
      const videoUrl = videoData.play || videoData.wm; // no watermark if available

      const captionMsg = `╭━━━〔 *TIKTOK DOWNLOADER* 〕━━━\n` +
                         `┃\n` +
                         `┃ 🎵 *Title:* ${videoData.title || "TikTok Video"}\n` +
                         `┃ 👤 *Author:* ${videoData.author?.nickname || "Unknown"}\n` +
                         `┃ 👤 *User:* ${userName}\n` +
                         `┃\n` +
                         `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                         `> Powered by SACHIYA MD 💫`;

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

      await sachiya.sendMessage(
        from,
        {
          video: { url: videoUrl },
          caption: `📥 *TikTok Video Downloaded Successfully!*\n\n> Powered by SACHIYA MD 💫`,
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
