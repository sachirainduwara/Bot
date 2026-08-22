const { cmd } = require('../command');
const mongoose = require('mongoose');

// 1. MongoDB Schema for Auto Status View & Native Like
const autoStatusSchema = new mongoose.Schema({
    id: { type: String, default: 'sachiya_autostatus' },
    statusview: { type: Boolean, default: false } // Default Disabled
});

const AutoStatusSetting = mongoose.models.AutoStatusSetting || mongoose.model('AutoStatusSetting', autoStatusSchema);

async function getStatusSettings() {
    let settings = await AutoStatusSetting.findOne({ id: 'sachiya_autostatus' });
    if (!settings) {
        settings = new AutoStatusSetting();
        await settings.save();
    }
    return settings;
}

// 2. Settings Panel (.autostatus)
cmd({
    pattern: "autostatus",
    alias: ["statusview", "autoview"],
    desc: "Manage Auto Status View & Like System",
    category: "owner",
    react: "🔄",
    filename: __filename
}, async (conn, mek, m, { args, reply, isOwner }) => {
    try {
        if (!isOwner) return await reply("❌ This command is only for the Owner!");

        let botConfig = await getStatusSettings();
        let query = args[0] ? args[0].toLowerCase() : "";

        if (query === "on") {
            botConfig.statusview = true;
            await botConfig.save();
            return await reply("✨ *Auto Status View & Like System successfully Enabled 🟢 !*");
        } 
        else if (query === "off") {
            botConfig.statusview = false;
            await botConfig.save();
            return await reply("✨ *Auto Status View & Like System successfully Disabled 🔴 !*");
        }

        let statusText = botConfig.statusview ? "🟢 Enabled" : "❌ Disabled";

        let menu = `╭─── 〔 ✨ SACHIYA-MD \nAUTOSTATUS & LIKE 💫 〕 ───╮
│
│ ⚙️ *Current Status:* ${statusText}
│
│ *Available Commands:*
│ • \`.autostatus on\` - Enable Auto View & Like 🟢
│ • \`.autostatus off\` - Disable Auto View & Like 🔴
│
╰──────────────────────────╯

│ ⚡ *Powered by SACHIYA-MD 💫*`;

        return await reply(menu);

    } catch (e) {
        console.log("AutoStatus Command Error:", e);
        return await reply(`❌ Error: ${e.message}`);
    }
});

// 3. Background Handler for Auto View & Button Click (Native Like)
cmd({ on: "status" }, async (conn, mek, m) => {
    try {
        let botConfig = await getStatusSettings();
        
        // Settings OFF නම් මුකුත් කරන්නේ නැත
        if (!botConfig.statusview) return;

        let participant = mek.key.participant || mek.participant || m.key.remoteJid;

        // 1. Status එක View කිරීම
        await conn.readMessages([mek.key]);

        // 2. හරියටම අර Green Heart Button එක Click කිරීම (Reaction Method)
        try {
            await conn.sendMessage(
                'status@broadcast',
                {
                    react: {
                        text: '💚', // මේකෙන් මැසේජ් එකක් යන්නේ නෑ, අර බටන් එක කොළ පාට වෙනවා.
                        key: mek.key
                    }
                },
                { statusJidList: [participant] }
            );
        } catch (err) {
            console.log("Native Status Like Error:", err);
        }

    } catch (e) {
        console.log("Auto Status Handler Error:", e);
    }
});
