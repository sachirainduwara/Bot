const { cmd } = require('../command');

cmd({
    pattern: "password",
    alias: ["genpass", "pass"],
    desc: "Generate a secure random password",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        let length = q ? parseInt(q) : 12;
        if (length < 6 || length > 50) length = 12;

        const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*!";
        let password = "";
        for (let i = 0, n = charset.length; i < length; ++i) {
            password += charset.charAt(Math.floor(Math.random() * n));
        }

        const msg = `╭━━━〔 *PASSWORD GENERATOR* 〕━━━\n` +
                    `┃\n` +
                    `┃ 🔐 *Generated Pass:* \`${password}\`\n` +
                    `┃ 📏 *Length:* ${length}\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `> *⚡ Powered by SACHIYA-MD 💫*`;

        reply(msg);
    } catch (e) {
        reply("❌ පාස්වර්ඩ් සෑදීමේදී දෝෂයක් ඇති විය!");
    }
});
