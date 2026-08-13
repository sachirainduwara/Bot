const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "ip",
    alias: ["ipinfo"],
    desc: "Get information about an IP address",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ කරුණාකර IP ලිපිනයක් ලබා දෙන්න!\nඋදා: `.ip 8.8.8.8`");

        const res = await axios.get(`http://ip-api.com/json/${q}`);
        let data = res.data;

        if (data.status === "fail") {
            return reply("❌ අදාළ IP ලිපිනය වැරදියි හෝ සෙවිය නොහැක!");
        }

        const msg = `╭━━━〔 *IP INFORMATION* 〕━━━\n` +
                    `┃\n` +
                    `┃ 🌐 *IP:* ${data.query}\n` +
                    `┃ 🗺️ *Country:* ${data.country} (${data.countryCode})\n` +
                    `┃ 🏙️ *Region:* ${data.regionName}\n` +
                    `┃ 🏛️ *City:* ${data.city}\n` +
                    `┃ ⚡ *ISP:* ${data.isp}\n` +
                    `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                    `> *⚡ Powered by SACHIYA-MD 💫*`;

        reply(msg);
    } catch (e) {
        reply("❌ තොරතුරු ලබාගැනීමේදී දෝෂයක් ඇති විය!");
    }
});
