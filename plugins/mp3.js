const { cmd } = require("../command");
const { toAudio } = require("../lib/converter");
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
      // Check if quoted message exists
      if (!quoted) {
        return reply("⚠️ *Please reply to a Video, Audio, or Document Media file with* `.toaudio` *or* `.mp3` *to convert it!*");
      }

      // Check media types safely (supports video, audio, and documents containing video/audio)
      const mime = quoted.mimetype || quoted.msg?.mimetype || "";
      const isVideo = quoted.mtype === "videoMessage" || mime.includes("video");
      const isAudio = quoted.mtype === "audioMessage" || mime.includes("audio");
      const isDoc = quoted.mtype === "documentMessage" && (mime.includes("video") || mime.includes("audio"));

      if (!isVideo && !isAudio && !isDoc) {
        return reply("❌ *The replied file is not a valid Video or Audio media! Please reply to a media file.*");
      }

      const userName = pushname || m.pushName || mek.pushName || 'User';
      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      // Download the media buffer from quoted message
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

      // Determine extension for converter
      const ext = isVideo || (isDoc && mime.includes("video")) ? "mp4" : "mp3";

      // Convert to MP3 Audio
      let audioBuffer;
      try {
        audioBuffer = await toAudio(mediaBuffer, ext);
      } catch (err) {
        console.error("FFmpeg Conversion Error:", err);
      }

      if (!audioBuffer) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Conversion failed! FFmpeg error or unsupported file format.*");
      }

      const captionMsg = `╭━━━〔 *🎵 MP3 CONVERTER* 〕━━━\n` +
                         `┃\n` +
                         `┃ 📊 *Format:* High Quality MP3\n` +
                         `┃ 👤 *Requested by:* ${userName}\n` +
                         `┃ ⚡ *Status:* Successfully Converted!\n` +
                         `┃\n` +
                         `╰━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                         `> *Powered by SACHIYA MD 💫*`;

      // Send the converted MP3 file
      await sachiya.sendMessage(
        from,
        {
          audio: audioBuffer,
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
