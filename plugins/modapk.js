const axios = require('axios');
const { cmd } = require('../command'); // මෙතැන command වෙනුවට cmd පාවිච්චි කර ඇත

cmd({
    pattern: "modapk",
    alias: ["mod", "apkdl"],
    desc: "Search and download Mod APKs using Zanta Mini API.",
    category: "download",
    react: "📦",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) {
            return await reply("❌ කරුණාකර ඩවුන්ඩෝන කිරීමට අවශ්‍ය ඇප් එකේ නමක් ලබා දෙන්න!\n\n*උදාහරණ:* `.modapk hill climb racing`");
        }

        await reply("🔍 ඇප් එක සොයමින් පවතී, කරුණාකර මොහොතක් රැඳී සිටින්න... ⏳");

        // API URL එක සකස් කරගැනීම
        const apiKey = "zanta_WdA26szT535TnL0TeeL0g6o9";
        const encodedQuery = encodeURIComponent(q);
        const apiUrl = `https://api.zanta-mini.store/api/modapk/dl?apiKey=${apiKey}&url=${encodedQuery}`;

        // API එකට ඉල්ලීමක් යැවීම
        const response = await axios.get(apiUrl);
        const resData = response.data;

        if (!resData || (!resData.status && !resData.result && !resData.data)) {
            return await reply("❌ අදාළ නමින් කිසිදු Mod APK එකක් හමු නොවීය. කරුණාකර නම වෙනස් කර නැවත උත්සාහ කරන්න.");
        }

        const data = resData.result || resData.data || resData;

        const appName = data.title || data.name || q;
        const appSize = data.size || "Unknown";
        const appVersion = data.version || "Latest";
        const appPackage = data.package || "N/A";
        const downloadLink = data.download_link || data.link || data.dl_url;
        const appImage = data.image || data.icon || "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true";

        if (!downloadLink) {
            return await reply("❌ මෙම ඇප් එක සඳහා ඩවුන්ඩෝන ලින්ක් එකක් සොයාගත නොහැකි විය.");
        }

        let msgCaption = `╭━━━〔 *SACHIYA MOD APK DL* 〕━━━\n` +
                         `┃\n` +
                         `┃ 📱 *App Name:* ${appName}\n` +
                         `┃ 📦 *Version:* ${appVersion}\n` +
                         `┃ 💾 *File Size:* ${appSize}\n` +
                         `┃ 🔠 *Package:* ${appPackage}\n` +
                         `┃\n` +
                         `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                         `⬇️ *Download Link:* \n${downloadLink}\n\n` +
                         `> *⚡ Powered by SACHIYA-MD 💫*`;

        try {
            await conn.sendMessage(from, {
                image: { url: appImage },
                caption: msgCaption
            }, { quoted: mek });
        } catch (imgErr) {
            await conn.sendMessage(from, { text: msgCaption }, { quoted: mek });
        }

    } catch (error) {
        console.error("ModAPK Plugin Error:", error);
        await reply("❌ සමාවන්න, ඇප් එක ඩවුන්ඩෝන කිරීමේදී දෝෂයක් ඇති විය. කරුණාකර පසුව උත්සාහ කරන්න.");
    }
});
