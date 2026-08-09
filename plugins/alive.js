const { cmd, commands } = require('../command');
const config = require('../config');
const { runtime } = require('../lib/functions');
const os = require('os');

cmd({
    pattern: "alive",
    desc: "Check bot status and details",
    category: "main",
    react: "🤖",
    filename: __filename
},
async(sachiya, mek, m, { from, quoted, pushname, reply }) => {
    try {
        // Fix for User Name
        const userName = pushname || m.pushName || mek.pushName || 'User';

        // System Information
        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const freeRam = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
        const usedRam = (totalRam - freeRam).toFixed(2);

        let aliveMsg = `*─── ｢ SACHIYA MD ALIVE ｣ ───*

👋 *Hii,* _${userName}_

*🤖 BOT STATUS:*
▸ *Status:* Online ✅
▸ *Uptime:* ${runtime(process.uptime())}
▸ *Prefix:* [ ${config.PREFIX || '.'} ]
▸ *Version:* 1.0.0

*📊 SYSTEM INFO:*
▸ *RAM Usage:* ${usedRam} GB / ${totalRam} GB
▸ *Platform:* ${os.platform()}
▸ *Mode:* Public

*👦 Owner Details:*
▸ *Owner:* Sachira Induwara
▸ *Number:* +94760579211
▸ *Age:* 16+

> 💡 *Type .menu to get all commands!*

*────────────────────────*
*Powered by SACHIYA-MD 💫*`;

        // 1. Voice Note (Audio) එක Raw Link එක හරහා යැවීම
        await sachiya.sendMessage(from, {
            audio: { url: 'https://github.com/sachirainduwara/Bot/raw/refs/heads/main/images/Welcome%20To%20SACHIYA%20MD.mp3' },
            mimetype: 'audio/mpeg',
            ptt: true
        }, { quoted: mek });

        // 2. Image එක සමඟ Alive Message එක යැවීම
        await sachiya.sendMessage(from, {
            image: { url: 'https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true' },
            caption: aliveMsg
        }, { quoted: mek });

    } catch (e) {
        console.log(e);
        reply(`❌ Error: ${e.message}`);
    }
});
