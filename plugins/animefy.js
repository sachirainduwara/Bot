const { cmd } = require("../command");
const { getRandom } = require("../lib/functions");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs").promises;
const sharp = require("sharp");
const path = require("path");

cmd({
  pattern: "animefy",
  react: "👾",
  desc: "Apply anime style effect to an image",
  category: "edit",
  filename: __filename,
}, async (sachiya, mek, m, { from, sender, quoted, reply }) => {
  try {
    const isQuotedImage = quoted && quoted.type === "imageMessage";
    const isImage = m.type === "imageMessage";
    const imageMessage = isQuotedImage ? quoted : isImage ? m : null;

    if (!imageMessage) {
      return reply("*🖼️ Please reply to an image or send an image with `.animefy`!* ⚠️");
    }

    reply("*✨ Processing image, please wait a moment...* ⏳");

    const buffer = await downloadMediaMessage(imageMessage, "buffer", {}, sachiya);
    if (!buffer) return reply("*❌ Failed to download media image!* ⚠️");

    const tempFolder = path.join(__dirname, "temp");
    await fs.mkdir(tempFolder, { recursive: true });

    const input = path.join(tempFolder, getRandom(".jpg"));
    const output = path.join(tempFolder, getRandom(".jpg"));

    await fs.writeFile(input, buffer);

    await sharp(input)
      .modulate({ saturation: 2, brightness: 1.2 }) 
      .sharpen() 
      .toFile(output);

    const caption = `╭━━━〔 *✨ SACHIYA-MD ANIMEFY ✨* 〕━━━\n` +
                    `┃\n` +
                    `┃ 👾 *Status:* Effect Applied Successfully! ✅\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `> *⚡ Powered by SACHIYA-MD 💫*`;

    await sachiya.sendMessage(from, {
      image: { url: output },
      caption: caption,
    }, { quoted: mek });

    await fs.unlink(input);
    await fs.unlink(output);
  } catch (err) {
    console.error("[Animefy Plugin Error]", err);
    reply(`*❌ Error:* ${err.message || err}`);
  }
});
