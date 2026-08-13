const { cmd } = require('../command');

cmd({
    pattern: "jid",
    alias: ["getjid"],
    desc: "Get JID of chat or user",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, quoted, reply, isGroup, sender }) => {
    try {
        let targetJid = quoted ? quoted.sender : (isGroup ? from : sender);

        const msg = `╭━━━〔 *SACHIYA-MD JID INFO* 〕━━━\n` +
                    `┃\n` +
                    `┃ 📌 *Chat JID:* ${from}\n` +
                    `┃ 👤 *User JID:* ${targetJid}\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `> *⚡ Powered by SACHIYA-MD 💫*`;

        reply(msg);
    } catch (e) {
        reply("❌ JID ලබාගැනීමේදී දෝෂයක් ඇති විය!");
    }
});
