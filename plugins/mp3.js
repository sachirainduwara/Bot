const { cmd } = require("../command");
const { toAudio } = require("../lib/converter"); // Bot එකේ converter lib එක (ಸಾමාන්‍යයෙන් Baileys bot වල මේක තියෙනවා)
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
      // 1. Check if a media or quoted media exists
      const isQuotedVideo = quoted && quoted.mtype === "videoMessage";
      const isQuotedAudio = quoted && quoted.mtype === "audioMessage";
      const isMedia = mek.msg?.mtype === "videoMessage" || mek.msg?.mtype === "audioMessage";

      if (!isMedia && !isQuotedVideo && !isQuotedAudio) {
        return reply("⚠️ *Please reply to a Video or Audio file with* `.toaudio` *or* `.mp3` *to convert it!*");
      }

      const userName = pushname || m.pushName || mek.pushName || 'User';
      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      // 2. Download the media file
      const targetMessage = isQuotedVideo || isQuotedAudio ? quoted : mek;
      const mediaBuffer = await targetMessage.download();
      
      if (!mediaBuffer) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to download the media file. Please try again!*");
      }

      await sachiya.sendMessage(from, { react: { text: "🔄", key: mek.key } });

      // 3. Convert to MP3 Audio using converter utility
      let audioBuffer;
      try {
        audioBuffer = await toAudio(mediaBuffer, "mp4"); // Converter handles video/audio streams
      } catch (err) {
        // Fallback or secondary attempt if direct conversion fails
        console.error("Conversion Warning:", err);
      }

      if (!audioBuffer) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Conversion failed! The media might be corrupted or unsupported.*");
      }

      const captionMsg = `╭━━━〔 *🎵 MP3 CONVERTER* 〕━━━\n` +
                         `┃\n` +
                         `┃ 📊 *Format:* MP3 Audio\n` +
                         `┃ 👤 *Requested by:* ${userName}\n` +
                         `┃ ⚡ *Status:* Successfully Converted\n` +
                         `┃\n` +
                         `╰━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                         `> *Powered by SACHIYA MD 💫*`;

      // 4. Send the converted Audio file as a Voice Note or Audio file
      await sachiya.sendMessage(
        from,
        {
          audio: audioBuffer,
          mimetype: "audio/mpeg",
          ptt: false, // true දැමුවොත් Voice Note (PTT) එකක් ලෙස යයි, false දැමුවොත් සාමාන්‍ය Audio song එකක් ලෙස යයි.
          caption: captionMsg,
        },
        { quoted: mek }
      );

      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.error("Audio Converter Error:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply(`❌ *Error:* ${e.message || "An unexpected error occurred during conversion!"}`);
    }
  }
);
