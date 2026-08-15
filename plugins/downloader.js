const { cmd } = require("../command");
const { ytmp3, ytmp4, tiktok } = require("sadaslk-dlcore");
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

      let data;
      try {
        data = await ytmp3(video.url);
      } catch (err) {
        data = null;
      }

      let audioUrl = data?.url || data?.dl || data?.audio || (typeof data === 'string' ? data : null);

      if (!audioUrl) {
        try {
          const fallbackRes = await fetch(`https://api.siputzx.my.id/api/d/ytmp3?url=${encodeURIComponent(video.url)}`);
          const res = await fallbackRes.json();
          if (res.status && res.data?.dl) audioUrl = res.data.dl;
        } catch (err) {}
      }

      if (!audioUrl) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to download MP3 from core server!*");
      }

      await sachiya.sendMessage(
        from,
        {
          audio: { url: audioUrl },
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

      let data;
      try {
        data = await ytmp4(video.url, {
          format: "mp4",
          videoQuality: "720",
        });
      } catch (err) {
        data = null;
      }

      let videoUrl = data?.url || data?.dl || data?.video;

      if (!videoUrl) {
        try {
          const fallbackRes = await fetch(`https://api.siputzx.my.id/api/d/ytmp4?url=${encodeURIComponent(video.url)}`);
          const res = await fallbackRes.json();
          if (res.status && res.data?.dl) videoUrl = res.data.dl;
        } catch (err) {}
      }

      if (!videoUrl) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to download video from core server!*");
      }

      await sachiya.sendMessage(
        from,
        {
          video: { url: videoUrl },
          mimetype: "video/mp4",
          fileName: data?.filename || `${video.title.replace(/[^\w\s]/gi, '')}.mp4`,
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

      let data;
      try {
        data = await tiktok(q);
      } catch (err) {
        data = null;
      }

      if (!data || (!data.no_watermark && !data.url && !data.download)) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to download TikTok video! Make sure link is public.*");
      }

      const videoUrl = data.no_watermark || data.url || data.download;

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
