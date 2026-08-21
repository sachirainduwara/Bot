const { cmd } = require("../command");
const getFbVideoInfo = require("@xaviabot/fb-downloader");
const config = require("../config");

cmd(
  {
    pattern: "fb",
    alias: ["facebook", "fbdl"],
    react: "🎬",
    desc: "Download Facebook Video",
    category: "download",
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
      if (!q) return reply("⚠️ *Please provide a valid Facebook video URL!*\n\n*Example:* `.fb https://fb.watch/...`");

      // 🔍 Enhanced Facebook URL Validation Regex
      const fbRegex = /(https?:\/\/)?(www\.|m\.)?(facebook|fb)\.(com|watch|share|reel)\/.+/;
      if (!fbRegex.test(q)) {
        return reply("❌ *Invalid Facebook URL! Please check and try again.*");
      }

      // Fix for User Name
      const userName = pushname || m.pushName || mek.pushName || 'User';

      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      const result = await getFbVideoInfo(q).catch(() => null);
      if (!result || (!result.sd && !result.hd)) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to download video. Video might be private, deleted, or invalid!*");
      }

      const { title, sd, hd } = result;
      const videoTitle = title || "Facebook Video";

      const captionMsg = `╭━━━〔 *📥 FACEBOOK DOWNLOADER* 〕━━━\n` +
                         `┃\n` +
                         `┃ 🎬 *Title:* ${videoTitle}\n` +
                         `┃ 👤 *Requested by:* ${userName}\n` +
                         `┃\n` +
                         `┃ *Reply with the number you want:*\n` +
                         `┃\n` +
                         `┃ 1️⃣ *->* 🎬 SD Video (Normal Quality)\n` +
                         `┃ 2️⃣ *->* 🎥 HD Video (High Quality)\n` +
                         `┃ 3️⃣ *->* 📁 Document File (File Format)\n` +
                         `┃\n` +
                         `╰━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                         `> *Powered by SACHIYA MD 💫*`;

      // 1. Send Preview Card with Options Menu
      const sentMsg = await sachiya.sendMessage(
        from,
        {
          image: {
            url: config.ALIVE_IMG || "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true",
          },
          caption: captionMsg,
        },
        { quoted: mek }
      );

      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

      // 2. Listen for User Reply (1, 2, or 3)
      const messageID = sentMsg.key.id;
      
      sachiya.ev.on("messages.upsert", async (chatUpdate) => {
        const mekResponse = chatUpdate.messages[0];
        if (!mekResponse.message) return;

        const responseMessage = mekResponse.message.conversation || mekResponse.message.extendedTextMessage?.text;
        const senderID = mekResponse.key.remoteJid;
        const isReplyToSent = mekResponse.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

        if (isReplyToSent && senderID === from) {
          await sachiya.sendMessage(from, { react: { text: "⬇️", key: mekResponse.key } });

          if (responseMessage === "1") {
            if (!sd) return reply("❌ *SD quality is not available for this video!*");
            await sachiya.sendMessage(from, {
              video: { url: sd },
              caption: `╭━━━〔 *SD VIDEO DOWNLOADED* 〕━━━\n┃ 🎬 *Title:* ${videoTitle}\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n> *Powered by SACHIYA MD 💫*`,
            }, { quoted: mekResponse });
            await sachiya.sendMessage(from, { react: { text: "✅", key: mekResponse.key } });

          } else if (responseMessage === "2") {
            const bestHd = hd || sd; // fallback to sd if hd not available
            if (!bestHd) return reply("❌ *HD quality is not available for this video!*");
            await sachiya.sendMessage(from, {
              video: { url: bestHd },
              caption: `╭━━━〔 *HD VIDEO DOWNLOADED* 〕━━━\n┃ 🎬 *Title:* ${videoTitle}\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n> *Powered by SACHIYA MD 💫*`,
            }, { quoted: mekResponse });
            await sachiya.sendMessage(from, { react: { text: "✅", key: mekResponse.key } });

          } else if (responseMessage === "3") {
            const bestDoc = hd || sd;
            if (!bestDoc) return reply("❌ *Document file is not available for this video!*");
            await sachiya.sendMessage(from, {
              document: { url: bestDoc },
              mimetype: "video/mp4",
              fileName: `${videoTitle.replace(/[^a-zA-Z0-9]/g, "_")}.mp4`,
              caption: `╭━━━〔 *DOCUMENT FILE DOWNLOADED* 〕━━━\n┃ 🎬 *Title:* ${videoTitle}\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n> *Powered by SACHIYA MD 💫*`,
            }, { quoted: mekResponse });
            await sachiya.sendMessage(from, { react: { text: "✅", key: mekResponse.key } });
          }
        }
      });

    } catch (e) {
      console.error("FB Downloader Error:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply(`❌ *Error:* ${e.message || "An unexpected error occurred!"}`);
    }
  }
);
