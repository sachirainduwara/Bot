const { cmd } = require('../command');
const config = require('../config');

cmd({
    pattern: "owner",
    alias: ["creator", "admin"],
    desc: "Displays bot owner contact card",
    category: "main",
    react: "👑",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, { react: { text: "👤", key: mek.key } });

        // Owner details (Config eken hari wena widihata ganna puluwan)
        const ownerNumber = config.OWNER_NUM || '94760579211';
        const ownerName = config.OWNER_NAME || 'Sachiya Induwara';
        const botName = config.BOT_NAME || 'SACHIYA-MD';

        // vCard data format with wa.me link so when clicked it opens chat with pre-filled text
        const vcard = 'BEGIN:VCARD\n' +
                      'VERSION:3.0\n' +
                      'FN:' + ownerName + '\n' +
                      'ORG:Developer of ' + botName + ';\n' +
                      'TEL;type=CELL;type=VOICE;waid=' + ownerNumber + ':+' + ownerNumber + '\n' +
                      'X-WA-BIZ-DESCRIPTION:Developer / Owner of ' + botName + '\n' +
                      'X-WA-BIZ-NAME:' + ownerName + '\n' +
                      'URL:https://wa.me/' + ownerNumber + '?text=Hello%20Sachiya%20👋\n' +
                      'END:VCARD';

        // Send contact vCard
        await conn.sendMessage(from, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            }
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
        console.log("Owner Command Error: ", e);
        return reply(`*❌ Error:* ${e.message}`);
    }
});
