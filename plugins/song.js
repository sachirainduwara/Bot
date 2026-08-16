const { cmd } = require("../command");
const ytdl = require("@distube/ytdl-core");
const yts = require("yt-search");

cmd(
  {
    pattern: "song",
    alias: ["ytmp3", "yta"],
    react: "🎵",
    desc: "Download YouTube audio securely",
    category: "download",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, q, reply }) => {
    try {
      if (!q) return reply("⚠️ *Please provide a Song Name or YouTube Link!*");

      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      let search = await yts(q);
      let data = search.videos[0];
      if (!data) return reply("❌ *No results found on YouTube!*");

      let caption = `╭━━━〔 *SACHIYA-MD AUDIO* 〕━━━\n` +
                    `┃\n` +
                    `┃ 🎵 *Title:* ${data.title}\n` +
                    `┃ 👤 *Channel:* ${data.author.name}\n` +
                    `┃ ⏱ *Duration:* ${data.timestamp}\n` +
                    `┃ 👀 *Views:* ${data.views.toLocaleString()}\n` +
                    `┃ 🔗 *Link:* ${data.url}\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                    `> *Powered by SACHIYA MD 💫*`;

      await sachiya.sendMessage(from, { image: { url: data.thumbnail }, caption }, { quoted: mek });

      // Direct stream download using @distube/ytdl-core
      let streamUrl = data.url;
      if (!ytdl.validateURL(streamUrl)) {
        return reply("❌ *Invalid YouTube URL!*");
      }

      // We can pass the video url directly to audio handler or stream
      await sachiya.sendMessage(
        from,
        {
          audio: { url: streamUrl },
          mimetype: "audio/mpeg",
          fileName: `${data.title.replace(/[^\w\s]/gi, '')}.mp3`
        },
        { quoted: mek }
      );

      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.log("SONG ERROR:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply("❌ *Error while processing your request!*");
    }
  }
);
