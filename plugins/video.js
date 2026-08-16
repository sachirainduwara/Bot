const { cmd } = require("../command");
const ytdl = require("@distube/ytdl-core");
const yts = require("yt-search");

cmd(
  {
    pattern: "video",
    alias: ["ytmp4", "ytv"],
    react: "🎬",
    desc: "Download YouTube video securely",
    category: "download",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("⚠️ *Please provide a Video Name or YouTube Link!*");

      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      let search = await yts(q);
      let data = search.videos[0];
      if (!data) return reply("❌ *No results found on YouTube!*");

      let caption = `╭━━━〔 *SACHIYA-MD VIDEO* 〕━━━\n` +
                    `┃\n` +
                    `┃ 🎬 *Title:* ${data.title}\n` +
                    `┃ 👤 *Channel:* ${data.author.name}\n` +
                    `┃ ⏱ *Duration:* ${data.timestamp}\n` +
                    `┃ 👀 *Views:* ${data.views.toLocaleString()}\n` +
                    `┃ 📅 *Uploaded:* ${data.ago}\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                    `> *Powered by SACHIYA MD 💫*`;

      await sachiya.sendMessage(from, { image: { url: data.thumbnail }, caption }, { quoted: mek });

      let streamUrl = data.url;
      if (!ytdl.validateURL(streamUrl)) {
        return reply("❌ *Invalid YouTube URL!*");
      }

      await sachiya.sendMessage(
        from,
        {
          video: { url: streamUrl },
          mimetype: "video/mp4",
          fileName: `${data.title.replace(/[^\w\s]/gi, '')}.mp4`,
          caption: `🎬 *${data.title}*\n\n> *Powered by SACHIYA MD 💫*`
        },
        { quoted: mek }
      );

      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.log("VIDEO ERROR:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply("❌ *Error while processing your request!*");
    }
  }
);
