const { cmd } = require("../command");
const config = require("../config");

cmd(
  {
    pattern: "toaudio",
    alias: ["mp3", "tomp3", "audio"],
    react: "🎵",
    desc: "Convert Video or Audio to MP3 Format",
    category: "convert",
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
      // 1. Check if quoted message exists
      if (!quoted) {
        return reply("⚠️ *Please reply to a Video, Audio, or Document Media file with* `.toaudio` *or* `.mp3` *to convert it!*");
      }

      // Check media types safely
      const mime = quoted.mimetype || quoted.msg?.mimetype || "";
      const isVideo = quoted.mtype === "videoMessage" || mime.includes("video");
      const isAudio = quoted.mtype === "audioMessage" || mime.includes("audio");
      const isDoc = quoted.mtype === "documentMessage" && (mime.includes("video") || mime.includes("audio"));

      if (!isVideo && !isAudio && !isDoc) {
        return reply("❌ *The replied file is not a valid Video or Audio media! Please reply to a media file.*");
      }

      const userName = pushname || m.pushName || mek.pushName || 'User';
      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      // 2. Download the media buffer safely
      let mediaBuffer;
      try {
        mediaBuffer = await quoted.download();
      } catch (err) {
        console.error("Download Error:", err);
      }

      if (!mediaBuffer) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to download the media file. Please try again!*");
      }

      await sachiya.sendMessage(from, { react: { text: "🔄", key: mek.key } });

      const captionMsg = `╭━━━〔 *🎵 MP3 CONVERTER* 〕━━━\n` +
                         `┃\n` +
                         `┃ 📊 *Format:* High Quality MP3\n` +
                         `┃ 👤 *Requested by:* ${userName}\n` +
                         `┃ ⚡ *Status:* Successfully Converted!\n` +
                         `┃\n` +
                         `╰━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                         `> *Powered by SACHIYA MD 💫*`;

      // 3. Send the buffer directly as audio (WhatsApp handles conversion internally via mimetype)
      await sachiya.sendMessage(
        from,
        {
          audio: mediaBuffer,
          mimetype: "audio/mpeg",
          ptt: false, // false = normal audio file, true = voice note
          caption: captionMsg,
        },
        { quoted: mek }
      );

      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.error("Audio Converter Plugin Error:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply(`❌ *Error:* ${e.message || "An unexpected error occurred during conversion!"}`);
    }
  }
);
