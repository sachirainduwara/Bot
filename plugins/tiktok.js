const { cmd } = require("../command");
const axios = require("axios");

cmd(
  {
    pattern: "tiktok",
    alias: ["tt", "ttdl"],
    react: "📱",
    desc: "Download TikTok video without watermark with multi-API fallback",
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

      // 3. Fallback API System (API 1: Siputzx -> API 2: TikWM)
      
      // Try API 1 (Siputzx)
      try {
        const res1 = await axios.get(`https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(q)}`, { timeout: 10000 });
        if (res1.data && res1.data.status) {
          const d = res1.data.data;
          videoUrl = d?.urls?.[0] || d?.video_url || d?.url || d?.download_url;
          title = d?.metadata?.title || d?.title || "TikTok Video";
          author = d?.metadata?.author || d?.author || "Unknown";
        }
      } catch (err1) {
        console.log("API 1 failed, trying fallback API...");
      }

      // If API 1 failed, Try API 2 (TikWM - Very stable)
      if (!videoUrl) {
        try {
          const res2 = await axios.get(`https://tikwm.com/api/?url=${encodeURIComponent(q)}`, { timeout: 10000 });
          if (res2.data && res2.data.code === 0) {
            const d = res2.data.data;
            videoUrl = d?.play || d?.hdplay;
            title = d?.title || "TikTok Video";
            author = d?.author?.nickname || "Unknown";
          }
        } catch (err2) {
          console.log("API 2 failed as well.");
        }
      }

      // If both APIs fail
      if (!videoUrl) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("*❌ All download servers are currently busy or down (503). Please try again later!* ⚠️");
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
