const { cmd } = require('../command');
const figlet = require('figlet');

cmd({
    pattern: "ascii",
    alias: ["banner"],
    desc: "Make ASCII art banner",
    category: "fun",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ වචනයක් ලබා දෙන්න!\nඋදා: `.ascii SACHIYA`");

        figlet(q, function(err, data) {
            if (err) return reply("❌ දෝෂයක් ඇති විය!");
            reply(`\`\`\`${data}\`\`\``);
        });
    } catch (e) {
        reply("❌ දෝෂයක් ඇති විය!");
    }
});
