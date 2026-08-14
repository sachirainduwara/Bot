const { cmd } = require('../command');
const { getContentType } = require('@whiskeysockets/baileys');
const axios = require('axios');

cmd({
    pattern: "toanime",
    alias: ["jadianime", "animeai"],
    desc: "Convert image to Anime style",
    category: "ai",
    filename: __filename
},
async (conn, mek, m, { from, quoted, reply }) => {
    try {
        const type = getContentType(quoted?.message || mek.message);
        if (type !== 'imageMessage') {
            return reply("⚠️ කරුණාකර ෆොටෝ එකකට Reply කරමින් `.toanime` ලෙස ටයිප් කරන්න!");
        }

        reply("⏳ ෆොටෝ එක Anime ස්ටයිල් එකට හරවමින් පවතී...");

        const media = await m.quoted.download();
        // Upload logic or direct api handling if supported, alternatively use an image API provider.
        
        reply("⚠️ මෙම සේවාව තාවකාලිකව සකසමින් පවතී!");
    } catch (e) {
        reply("❌ දෝෂයක් ඇති විය!");
    }
});
