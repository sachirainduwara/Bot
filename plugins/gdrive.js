const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "gdrive",
    alias: ["googledrive"],
    desc: "Download files from Google Drive correctly",
    category: "download",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ *කරුණාකර Google Drive ලින්ක් එක ලබා දෙන්න!*");

        // ලින්ක් එකෙන් ID එක ගන්නා නිවැරදිම Regex එක
        const match = q.match(/[-\w]{25,}/);
        if (!match) return reply("❌ *ලින්ක් එකේ File ID එක සොයාගත නොහැක.*");

        const fileId = match[0];
        await reply("⏳ *ෆයිල් එක සකසමින් පවතී...*");

        // වැදගත්: ගූගල් ඩ්‍රයිව් ලින්ක් එක ඩිරෙක්ට් ඩවුන්ලෝඩ් එකක් බවට හැරවීම
        const downloadUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;

        // මෙන්න මෙතනදී තමයි වැරැද්ද වෙන්නේ - අපි කෙලින්ම ෆයිල් එක යවන්නේ නැතුව, 
        // WhatsApp එකටම ඒ ලින්ක් එක හරහා බාගන්න ඉඩ දෙනවා.
        
        await conn.sendMessage(from, { 
            document: { url: downloadUrl }, 
            fileName: "Google_Drive_File.bin", 
            caption: "*📂 GOOGLE DRIVE DOWNLOADER*\n\n> *⚡ SACHIYA-MD 💫*",
            mimetype: "application/octet-stream"
        }, { quoted: mek });

    } catch (e) {
        console.error(e);
        reply("❌ *ඩවුන්ලෝඩ් කිරීමේදී දෝෂයක් ඇති විය. කරුණාකර ලින්ක් එක 'Anyone with the link' ලෙස Public කර ඇත්දැයි බලන්න.*");
    }
});
