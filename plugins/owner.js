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

        const ownerNumber = config.OWNER_NUM || '94760579211';
        const ownerName = config.OWNER_NAME || 'Sachiya Induwara';
        const botName = config.BOT_NAME || 'SACHIYA-MD';

        // Perfect WhatsApp Business vCard Format
        const vcard = 'BEGIN:VCARD\n' +
                      'VERSION:3.0\n' +
                      `FN:${ownerName}\n` +
                      `ORG:Developer / Owner of ${botName};\n` +
                      `TEL;type=CELL;type=VOICE;waid=${ownerNumber}:+${ownerNumber}\n` +
                      `X-WA-BIZ-NAME:${ownerName}\n` +
                      `X-WA-BIZ-DESCRIPTION:Developer / Owner of ${botName}\n` +
                      'END:VCARD';

        await conn.sendMessage(from, {
            contacts: {
                displayName: ownerName,
                contacts: [{ vcard }]
            }
        }, { quoted: mek });

        await conn.sendMessage(from, { react: { text: "👑", key: mek.key } });

    } catch (e) {
        console.log("Owner Command Error: ", e);
        return reply(`*❌ Error:* ${e.message}`);
    }
});
