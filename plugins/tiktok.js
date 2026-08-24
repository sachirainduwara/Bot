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
      // 1. URL Validation
      if (!q || !q.startsWith("http")) {
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

      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });
      reply("*⏳ Downloading TikTok video... Please wait!* 🔄");

      // 2. API Request (ඔයාගේ API එකට ලින්ක් එක යවන තැන)
      // (මෙතන "YOUR_API_ENDPOINT_HERE" වෙනුවට ඔයා පාවිච්චි කරන සැබෑ API ලින්ක් එක දාන්න)
      const apiEndpoint = `https://api.ominisave.store/api/tiktok?url=${encodeURIComponent(q)}`; // හෝ ඔයාගේ API ලින්ක් එක
      
      const apiRes = await axios.get(apiEndpoint);
      const resData = apiRes.data;

      // 3. Validation based on your JSON structure
      if (!resData || !resData.status || !resData.downloads || !resData.downloads.video) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("*❌ Failed to fetch TikTok video from API! Please check the link.* 🚫");
      }

      const videoUrl = resData.downloads.video;
      const title = resData.title || "TikTok Video";
      const author = resData.author || "Unknown";
      
      const views = resData.stats?.views || 0;
      const likes = resData.stats?.likes || 0;
      const shares = resData.stats?.shares || 0;

      // 4. SACHIYA-MD TIKTOK UI CARD
      const caption = `╭━━━〔 *🎬 TIKTOK DOWNLOADER 🎵* 〕━━━\n` +
                      `┃\n` +
                      `┃ 📌 *Title:* ${title.length > 50 ? title.substring(0, 47) + '...' : title}\n` +
                      `┃ 👤 *Author:* @${author}\n` +
                      `┃ 👀 *Views:* ${views.toLocaleString()}\n` +
                      `┃ ❤️ *Likes:* ${likes.toLocaleString()}\n` +
                      `┃ 🔄 *Shares:* ${shares.toLocaleString()}\n` +
                      `┃ 📥 *Status:* Successfully Downloaded! ✅\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                      `> *⚡ Powered by SACHIYA-MD 💫*`;

      // 5. Send Video (No Watermark)
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
      console.error("❌ TIKTOK ERROR:", e.message || e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply("*❌ An error occurred while downloading the TikTok video! Please try again.* ⚠️");
    }
  }
);
