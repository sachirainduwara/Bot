const { cmd } = require('../command');

cmd({
    pattern: "base64",
    alias: ["b64"],
    desc: "Encode or Decode text using Base64",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, q, args, reply }) => {
    try {
        if (!q || args.length < 2) {
            return reply("⚠️ භාවිත කරන ආකාරය:\nඋදා: `.base64 encode hello` හෝ `.base64 decode aGVsbG8=`");
        }

        let type = args[0].toLowerCase();
        let text = args.slice(1).join(" ");
        let result = "";

        if (type === "encode") {
            result = Buffer.from(text).toString('base64');
        } else if (type === "decode") {
            result = Buffer.from(text, 'base64').toString('ascii');
        } else {
            return reply("❌ කරුණාකර `encode` හෝ `decode` ලෙස නිවැරදිව සඳහන් කරන්න!");
        }

        const msg = `╭━━━〔 *BASE64 CONVERTER* 〕━━━\n` +
                    `┃\n` +
                    `┃ ⚙️ *Action:* ${type.toUpperCase()}\n` +
                    `┃ 📥 *Input:* ${text}\n` +
                    `┃ 📤 *Output:* ${result}\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `> *⚡ Powered by SACHIYA-MD 💫*`;

        reply(msg);
    } catch (e) {
        reply("❌ පරිවර්තනය කිරීමේදී දෝෂයක් ඇති විය!");
    }
});
