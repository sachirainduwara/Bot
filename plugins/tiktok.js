const { cmd } = require("../command");
const axios = require("axios");

cmd(
  {
    pattern: "tiktok",
    alias: ["tt", "ttdl"],
    react: "📱",
    desc: "Download TikTok video without watermark",
    category: "download",
    use: ".tiktok <TikTok URL>",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply }) => {
    try {
      // 1. URL Check
      if (!q) {
        return await sachiya.sendMessage(from, {
          text: `╭━━━〔 *✨ SACHIYA-MD TIKTOK ✨* 〕━━━\n` +
                `┃\n` +
                `┃ ⚠️ *Please provide a valid TikTok link!*\n` +
                `┃ 📌 *Example:* \`.tiktok https://vt.tiktok.com/ZS2xxxxxx/\`\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `> *⚡ Powered by SACHIYA-MD 💫*`
        }, { quoted: mek });
      }

      // 2. TikTok URL Validation Patterns
      const tiktokPatterns = [
        /https?:\/\/(?:www\.)?tiktok\.com\//,
        /https?:\/\/(?:vm\.)?tiktok\.com\//,
        /https?:\/\/(?:vt\.)?tiktok\.com\//,
        /https?:\/\/(?:www\.)?tiktok\.com\/@/,
        /https?:\/\/(?:www\.)?tiktok\.com\/t\//
      ];

      const isValidUrl = tiktokPatterns.some(pattern => pattern.test(q));
      if (!isValidUrl && !q.startsWith("http")) {
        return reply("❌ *That is not a valid TikTok link. Please provide a valid TikTok video link.* 🚫");
      }

      await sachiya.sendMessage(from, { react: { text: "🔄", key: mek.key } });
      reply("*⏳ Downloading TikTok video... Please wait!* 🔄");

      let videoUrl = null;
      let title = "TikTok Video";
      let author = "Unknown";

      // 3. TikWM API Request
      const response = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(q)}`, { 
        timeout: 15000,
        headers: {
          'accept': '*/*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.data && response.data.code === 0) {
        const d = response.data.data;
        if (d) {
          videoUrl = d.play || d.hdplay;
          title = d.title || "TikTok Video";
          author = d.author?.nickname || d.author?.unique_id || "Unknown";
        }
      }

      if (!videoUrl) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("*❌ Failed to extract video URL! Make sure the link is public.* ⚠️");
      }

      // 4. SACHIYA-MD TIKTOK UI CARD
      const caption = `╭━━━〔 *🎬 TIKTOK DOWNLOADER 🎵* 〕━━━\n` +
                      `┃\n` +
                      `┃ 📌 *Title:* ${title.length > 50 ? title.substring(0, 47) + '...' : title}\n` +
                      `┃ 👤 *Author:* ${author}\n` +
                      `┃ 📥 *Status:* Successfully Downloaded! ✅\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                      `> *⚡ Powered by SACHIYA-MD 💫*`;

      // 5. Send Video
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
      console.error("TIKTOK ERROR:", e.message || e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply("*❌ An error occurred while downloading the TikTok video!* ⚠️");
    }
  }
);
