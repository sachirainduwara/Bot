const { cmd } = require('../command');
const config = require('../config');
const mongoose = require('mongoose');

// MongoDB Schema for Settings
const settingSchema = new mongoose.Schema({
    id: { type: String, default: 'sachiya_settings' },
    anticall: { type: Boolean, default: false },
    autoread: { type: Boolean, default: false },
    autoreact: { type: Boolean, default: false },
    greact: { type: Boolean, default: false },
    antidelete: { type: Boolean, default: false }
});

const BotSetting = mongoose.models.BotSetting || mongoose.model('BotSetting', settingSchema);

async function getSettings() {
    let settings = await BotSetting.findOne({ id: 'sachiya_settings' });
    if (!settings) {
        settings = new BotSetting();
        await settings.save();
    }
    return settings;
}

// 1. Settings Panel Command
cmd({
    pattern: "settings",
    alias: ["set", "panel"],
    desc: "Bot Settings Panel",
    category: "owner",
    react: "⚙️",
    filename: __filename
}, async (conn, mek, m, { from, sender, reply }) => {
    try {
        // Config එකේ අංකය සහ එන sender / from අංක පිරිසිදු කර සංසන්දනය කිරීම
        const ownerNum = config.OWNER_NUM ? config.OWNER_NUM.replace(/[^0-9]/g, "") : "94760579211";
        
        // මූලාශ්‍ර JID එක සහ Bot connection එක පරීක්ෂා කිරීම
        let senderNum = sender ? sender.replace(/[^0-9]/g, "") : "";
        let chatNum = from ? from.replace(/[^0-9]/g, "") : "";
        let botNumber = conn.user ? conn.user.id.replace(/[^0-9]/g, "") : "";

        // Self-chat හෝ Owner ගේ අංකය දැයි තහවුරු කිරීම
        let isMyNumber = senderNum.includes(ownerNum) || chatNum.includes(ownerNum) || chatNum.includes(botNumber);

        if (!isMyNumber) {
            return await reply("❌ This command is only for the Owner!");
        }

        const botConfig = await getSettings();

        let menu = `╭─── 〔 *SETTINGS* 〕 ───╮
│
│ 1️⃣ *Anti-Call* ➪ ${botConfig.anticall ? '🟢 *ON*' : '🔴 *OFF*'}
│ 2️⃣ *Auto-Read* ➪ ${botConfig.autoread ? '🟢 *ON*' : '🔴 *OFF*'}
│ 3️⃣ *Auto-React* ➪ ${botConfig.autoreact ? '🟢 *ON*' : '🔴 *OFF*'}
│ 4️⃣ *Group-React* ➪ ${botConfig.greact ? '🟢 *ON*' : '🔴 *OFF*'}
│ 5️⃣ *Anti-Delete* ➪ ${botConfig.antidelete ? '🟢 *ON*' : '🔴 *OFF*'}
│
╰─────────────────────╯

> *Reply to this message with number & status*
> *Example:* \`1 on\` or \`2 off\`

⚡ *Powered by SACHIYA-MD 💫*`;

        let imageUrl = config.ALIVE_IMG || "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true";

        return await conn.sendMessage(from, {
            image: { url: imageUrl },
            caption: menu
        }, { quoted: mek });

    } catch (e) {
        console.log("Settings Menu Error:", e);
        return await reply(`❌ Error: ${e.message}`);
    }
});

// 2. Interactive Update Handler
cmd({ on: "body" }, async (conn, mek, m, { from, body, sender, reply, quoted }) => {
    try {
        const ownerNum = config.OWNER_NUM ? config.OWNER_NUM.replace(/[^0-9]/g, "") : "94760579211";
        let senderNum = sender ? sender.replace(/[^0-9]/g, "") : "";
        let chatNum = from ? from.replace(/[^0-9]/g, "") : "";
        let botNumber = conn.user ? conn.user.id.replace(/[^0-9]/g, "") : "";

        let isMyNumber = senderNum.includes(ownerNum) || chatNum.includes(ownerNum) || chatNum.includes(botNumber);
        if (!isMyNumber) return;

        if (!quoted || !quoted.text || !quoted.text.includes("〔 *SETTINGS* 〕")) return;

        let args = body.trim().toLowerCase().split(" ");
        if (args.length !== 2) return;

        let num = args[0];
        let action = args[1];

        if (action !== "on" && action !== "off") {
            return await reply("❌ Invalid action! Please use `on` or `off` (Ex: `1 on`)");
        }

        let botConfig = await getSettings();
        let updatedField = "";
        let state = action === "on";

        switch (num) {
            case "1":
                botConfig.anticall = state;
                updatedField = "Anti-Call";
                break;
            case "2":
                botConfig.autoread = state;
                updatedField = "Auto-Read";
                break;
            case "3":
                botConfig.autoreact = state;
                updatedField = "Auto-React";
                break;
            case "4":
                botConfig.greact = state;
                updatedField = "Group-React";
                break;
            case "5":
                botConfig.antidelete = state;
                updatedField = "Anti-Delete";
                break;
            default:
                return await reply("❌ Invalid number! Choose between 1 and 5.");
        }

        await botConfig.save();

        let successMsg = `╭─── 〔 *UPDATE SUCCESS* 〕 ───╮
│
│ 🛡️ *Feature:* ${updatedField}
│ ⚡ *Status:* ${state ? '🟢 *ENABLED*' : '🔴 *DISABLED*'}
│
╰──────────────────────────╯

✨ *SACHIYA-MD 💫 Settings Updated!*`;

        return await reply(successMsg);

    } catch (e) {
        console.log("Settings Update Error:", e);
    }
});
