const { cmd, commands } = require('../command');
const config = require('../config');
const os = require('os');

cmd({
    pattern: "menu",
    alias: ["help", "list", "panel"],
    react: "📜",
    desc: "Get categorized list menu",
    category: "main",
    filename: __filename
},
async(sachiya, mek, m, { from, quoted, pushname, reply }) => {
    try {
        const prefix = config.PREFIX || '.';
        
        // 👤 Fix for User Name (যাতে undefined නොවී නම හරියට වැටේ)
        const userName = pushname || m.pushName || mek.pushName || 'User';
        
        // 💾 RAM Usage Calculations
        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const freeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
        const usedRam = (totalRam - freeRam).toFixed(2);

        // 🗂️ Categories අනුව Commands වෙන් කරගැනීම සඳහා Object එකක් සකස් කිරීම
        const categories = {};

        commands.forEach((command) => {
            if (command.pattern && !command.dontAddCommandList) {
                const cat = command.category ? command.category.toUpperCase() : "GENERAL";
                if (!categories[cat]) {
                    categories[cat] = [];
                }
                categories[cat].push(command.pattern);
            }
        });

        // 🎨 Top Header Structure
        let menuMsg = `╭━━━〔 *SACHIYA-MD MENU* 〕━━━\n` +
                      `┃\n` +
                      `┃ 👤 *User:* _${userName}_\n` +
                      `┃ 🤖 *Prefix:* [ ${prefix} ]\n` +
                      `┃ 📊 *Total Commands:* ${commands.length}\n` +
                      `┃ 💾 *RAM Usage:* ${usedRam} GB / ${totalRam} GB\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━\n\n`;

        // 🌟 Category එකක් පාසා Commands ටික පිළිවෙළට සකස් කිරීම
        Object.keys(categories).sort().forEach((cat) => {
            menuMsg += `╭───〔 *${cat}* 〕───\n`;
            
            // අදාළ කැටගරියට අයත් කමාන්ඩ්ස් අකාරාදී පිළිවෙළට (Alphabetical) සකස් කිරීම
            categories[cat].sort().forEach((cmdName) => {
                menuMsg += `┃ ◈ ✨ ${prefix}${cmdName}\n`;
            });
            
            menuMsg += `╰───────────────────\n\n`;
        });

        menuMsg += `> *Powered by SACHIYA-MINI-BOT 🧬*`;

        // 🖼️ Send Image + Categorized Menu Message
        await sachiya.sendMessage(
            from,
            {
                image: { url: config.ALIVE_IMG || "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true" },
                caption: menuMsg
            },
            { quoted: mek }
        );

    } catch (e) {
        console.error("Menu error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});
