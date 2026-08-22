const { cmd } = require('../command');
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

// Owner Number Check Helper
const OWNER_NUMBER = "94760579211";

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
        // Clean sender number to match properly
        let senderNum = sender.replace(/[^0-9]/g, "");
        if (!senderNum.includes(OWNER_NUMBER)) {
            return await reply("❌ This command is only for the Owner!");
        }

        const config = await getSettings();

        let menu = `╭─── 〔 *SETTINGS* 〕 ───╮
│
│ 1️⃣ *Anti-Call* ➪ ${config.anticall ? '🟢 *ON*' : '🔴 *OFF*'}
│ 2️⃣ *Auto-Read* ➪ ${config.autoread ? '🟢 *ON*' : '🔴 *OFF*'}
│ 3️⃣ *Auto-React* ➪ ${config.autoreact ? '🟢 *ON*' : '🔴 *OFF*'}
│ 4️⃣ *Group-React* ➪ ${config.greact ? '🟢 *ON*' : '🔴 *OFF*'}
│ 5️⃣ *Anti-Delete* ➪ ${config.antidelete ? '🟢 *ON*' : '🔴 *OFF*'}
│
╰─────────────────────╯

> *Reply to this message with number & status*
> *Example:* \`1 on\` or \`2 off\`

⚡ *Powered by SACHIYA-MD 💫*`;

        let imageUrl = "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true";

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
        let senderNum = sender.replace(/[^0-9]/g, "");
        if (!senderNum.includes(OWNER_NUMBER)) return;
        if (!quoted || !quoted.text || !quoted.text.includes("〔 *SETTINGS* 〕")) return;

        let args = body.trim().toLowerCase().split(" ");
        if (args.length !== 2) return;

        let num = args[0];
        let action = args[1];

        if (action !== "on" && action !== "off") {
            return await reply("❌ Invalid action! Please use `on` or `off` (Ex: `1 on`)");
        }

        let config = await getSettings();
        let updatedField = "";
        let state = action === "on";

        switch (num) {
            case "1":
                config.anticall = state;
                updatedField = "Anti-Call";
                break;
            case "2":
                config.autoread = state;
                updatedField = "Auto-Read";
                break;
            case "3":
                config.autoreact = state;
                updatedField = "Auto-React";
                break;
            case "4":
                config.greact = state;
                updatedField = "Group-React";
                break;
            case "5":
                config.antidelete = state;
                updatedField = "Anti-Delete";
                break;
            default:
                return await reply("❌ Invalid number! Choose between 1 and 5.");
        }

        await config.save();

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
