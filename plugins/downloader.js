const { cmd } = require("../command");
const yts = require("yt-search");

// 🔍 Advanced & Safe YouTube Helper Function
async function getYoutube(query) {
  try {
    let cleanedQuery = query.trim();
    const isUrl = /(youtube\.com|youtu\.be)/i.test(cleanedQuery);
    if (isUrl) {
      const match = cleanedQuery.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
      if (match && match[1]) {
        const info = await yts({ videoId: match[1] });
        return info;
      }
    }

    const search = await yts(cleanedQuery);
    if (!search || !search.videos || search.videos.length === 0) return null;
    return search.videos[0];
  } catch (e) {
    console.log("YouTube Search Error:", e);
    return null;
  }
}

// ==========================================
// 1. YOUTUBE MP3 DOWNLOADER
// ==========================================
cmd(
  {
    pattern: "ytmp3",
    alias: ["yta", "song"],
    react: "🎵",
    desc: "Download YouTube MP3 by name or link",
    category: "download",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("⚠️ *Please provide a Song Name or YouTube Link!*");

      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      const video = await getYoutube(q);
      if (!video) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *No results found on YouTube!*");
      }

      // 🎨 SACHIYA-MD AUDIO CARD
      const caption = `╭━━━〔 *YOUTUBE AUDIO* 〕━━━\n` +
                      `┃\n` +
                      `┃ 🎵 *Title:* ${video.title}\n` +
                      `┃ 👤 *Channel:* ${video.author?.name || "Unknown"}\n` +
                      `┃ ⏱ *Duration:* ${video.timestamp || "N/A"}\n` +
                      `┃ 👀 *Views:* ${(video.views || 0).toLocaleString()}\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                      `> Powered by SACHIYA MD 💫`;

      await sachiya.sendMessage(
        from,
        {
          image: { url: video.thumbnail },
          caption,
        },
        { quoted: mek }
      );

      // Fetch MP3 Download Link (Using Native Fetch & Multiple Fallbacks)
      let downloadUrl = null;
      try {
        const apiRes = await fetch(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(video.url)}`);
        const res = await apiRes.json();
        if (res.status && res.data?.dl) downloadUrl = res.data.dl;
      } catch (err) {}

      if (!downloadUrl) {
        try {
          const fallbackRes = await fetch(`https://deliriussapi-oficial.vercel.app/download/ytmp3?url=${encodeURIComponent(video.url)}`);
          const fbData = await fallbackRes.json();
          if (fbData.status && fbData.data?.downloadUrl) downloadUrl = fbData.data.downloadUrl;
        } catch (err) {}
      }

      if (!downloadUrl) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to download MP3 from servers!*");
      }

      await sachiya.sendMessage(
        from,
        {
          audio: { url: downloadUrl },
          mimetype: "audio/mpeg",
          fileName: `${video.title.replace(/[^\w\s]/gi, '')}.mp3`
        },
        { quoted: mek }
      );

      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.log("YTMP3 ERROR:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply("❌ *Error while downloading MP3!*");
    }
  }
);

// ==========================================
// 2. YOUTUBE MP4 DOWNLOADER
// ==========================================
cmd(
  {
    pattern: "ytmp4",
    alias: ["ytv", "video"],
    react: "🎬",
    desc: "Download YouTube MP4 by name or link",
    category: "download",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("⚠️ *Please provide a Video Name or YouTube Link!*");

      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      const video = await getYoutube(q);
      if (!video) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *No results found on YouTube!*");
      }

      // 🎨 SACHIYA-MD VIDEO CARD
      const caption = `╭━━━〔 *YOUTUBE VIDEO* 〕━━━\n` +
                      `┃\n` +
                      `┃ 🎬 *Title:* ${video.title}\n` +
                      `┃ 👤 *Channel:* ${video.author?.name || "Unknown"}\n` +
                      `┃ ⏱ *Duration:* ${video.timestamp || "N/A"}\n` +
                      `┃ 👀 *Views:* ${(video.views || 0).toLocaleString()}\n` +
                      `┃ 📅 *Uploaded:* ${video.ago || "N/A"}\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                      `> Powered by SACHIYA MD 💫`;

      await sachiya.sendMessage(
        from,
        {
          image: { url: video.thumbnail },
          caption,
        },
        { quoted: mek }
      );

      let videoUrl = null;
      try {
        const apiRes = await fetch(`https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(video.url)}`);
        const res = await apiRes.json();
        if (res.status && res.data?.dl) videoUrl = res.data.dl;
      } catch (err) {}

      if (!videoUrl) {
        try {
          const fallbackRes = await fetch(`https://deliriussapi-oficial.vercel.app/download/ytmp4?url=${encodeURIComponent(video.url)}`);
          const fbData = await fallbackRes.json();
          if (fbData.status && fbData.data?.downloadUrl) videoUrl = fbData.data.downloadUrl;
        } catch (err) {}
      }

      if (!videoUrl) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to download video from servers!*");
      }

      await sachiya.sendMessage(
        from,
        {
          video: { url: videoUrl },
          mimetype: "video/mp4",
          fileName: `${video.title.replace(/[^\w\s]/gi, '')}.mp4`,
          caption: `🎬 *${video.title}*\n\n> Powered by SACHIYA MD`,
          gifPlayback: false,
        },
        { quoted: mek }
      );

      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.log("YTMP4 ERROR:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply("❌ *Error while downloading video!*");
    }
  }
);

// ==========================================
// 3. TIKTOK DOWNLOADER
// ==========================================
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

      let videoUrl = null;
      let ttData = {};
      try {
        const apiRes = await fetch(`https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(q)}`);
        const res = await apiRes.json();
        if (res.status && res.data) {
          ttData = res.data;
          videoUrl = ttData.no_watermark || ttData.url || ttData.download;
        }
      } catch (err) {}

      if (!videoUrl) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to download TikTok video! Make sure link is public.*");
      }

      // 🎨 SACHIYA-MD TIKTOK CARD
      const caption = `╭━━━〔 *TIKTOK DOWNLOADER* 〕━━━\n` +
                      `┃\n` +
                      `┃ 🎵 *Title:* ${ttData.title || "TikTok Video"}\n` +
                      `┃ 👤 *Author:* ${ttData.author || "Unknown"}\n` +
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
