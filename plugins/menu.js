const { cmd, commands } = require('../command');
const config = require('../config');
const os = require('os');

cmd({
    pattern: "menu",
    alias: ["help", "list", "panel"],
    react: "📜",
    desc: "Get single list menu",
    category: "main",
    filename: __filename
},
async(sachiya, mek, m, { from, quoted, pushname, reply }) => {
    try {
        const prefix = config.PREFIX || '.';
        
        // 💾 RAM Usage Calculations
        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const freeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
        const usedRam = (totalRam - freeRam).toFixed(2);

        // 🗂️ දැනට තියෙන සහ Upload කරන අලුත් Commands ඔක්කොම එකතු කරගන්න Array එක
        const otherCmds = [];

        commands.forEach((command) => {
            if (command.pattern && !command.dontAddCommandList) {
                // alive සහ menu කියන දෙක වෙනම උඩින් දාන නිසා පහළ List එකෙන් අයින් කරයි
                if (command.pattern !== 'alive' && command.pattern !== 'menu') {
                    otherCmds.push(command.pattern);
                }
            }
        });

        // 🔤 Commands ටික පිළිවෙලට Alphabetical Order එකට Sort කිරීම
        otherCmds.sort();

        // 🎨 Top Box Structure
        let menuMsg = `╭━━━〔 *SACHIYA-MD MENU* 〕━━━\n` +
                      `┃\n` +
                      `┃ 👤 *User:* _${pushname || 'User'}_\n` +
                      `┃ 🤖 *Prefix:* [ ${prefix} ]\n` +
                      `┃ 📊 *Total Commands:* ${commands.length}\n` +
                      `┃ 💾 *RAM Usage:* ${usedRam} GB / ${totalRam} GB\n` +
                      `┃\n` +
                      `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                      `╭━━━〔 *COMMANDS LIST* 〕━━━\n` +
                      `┃\n` +
                      `┃ ◈ ✨ ${prefix}alive\n` +
                      `┃ ◈ ✨ ${prefix}menu\n`;

        // 🌟 දැනට තියෙන + Upload වෙන අනිත් ඕනෑම Command එකක්Auto එකතු වන කොටස
        otherCmds.forEach((cmdName) => {
            menuMsg += `┃ ◈ ✨ ${prefix}${cmdName}\n`;
        });

        menuMsg += `╰━━━━━━━━━━━━━━━━━━━\n\n` +
                   `> *Powered by SACHIYA-MINI-BOT 🧬*`;

        // 🖼️ Send Image + Text Message
        await sachiya.sendMessage(
            from,
            {
                image: { url: config.ALIVE_IMG || "https://github.com/sachirainduwara/Bot/blob/main/Media/SACHIYA%20MD.png" },
                caption: menuMsg
            },
            { quoted: mek }
        );

    } catch (e) {
        console.error("Menu error:", e);
        reply(`❌ Error: ${e.message}`);
    }
});
