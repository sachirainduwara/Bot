const { cmd } = require('../command');
const mongoose = require('mongoose');

const AntiCallModel = mongoose.models.AntiCall || mongoose.model('AntiCall', new mongoose.Schema({ _id: { type: String, required: true }, status: { type: Boolean, default: false } }));
const AntideleteModel = mongoose.models.Antidelete || mongoose.model('Antidelete', new mongoose.Schema({ _id: { type: String, required: true, default: 'sachiyamd_antidelete_status' }, enabled: { type: Boolean, default: false } }));
const AutoReactModel = mongoose.models.AutoReact || mongoose.model('AutoReact', new mongoose.Schema({ _id: { type: String, required: true }, ireact: { type: Boolean, default: true }, greact: { type: Boolean, default: true } }));
const AutoReadModel = mongoose.models.AutoRead || mongoose.model('AutoRead', new mongoose.Schema({ _id: { type: String, required: true, default: 'autoread_config' }, enabled: { type: Boolean, default: false } }));
const AutoStatusModel = mongoose.models.AutoStatus || mongoose.model('AutoStatus', new mongoose.Schema({ _id: { type: String, required: true }, status: { type: Boolean, default: false } }));

// 1. Settings Menu Command (.settings)
cmd({
    pattern: "settings",
    desc: "Manage bot settings interactively",
    category: "owner",
    react: "⚙️",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, { react: { text: "💫", key: mek.key } });

        let callDoc = await AntiCallModel.findOne({ _id: 'sachiyamd_anticall_status' }) || await AntiCallModel.create({ _id: 'sachiyamd_anticall_status', status: false });
        let deleteDoc = await AntideleteModel.findOne({ _id: 'sachiyamd_antidelete_status' }) || await AntideleteModel.create({ _id: 'sachiyamd_antidelete_status', enabled: false });
        let reactDoc = await AutoReactModel.findOne({ _id: 'sachiyamd_autoreact_settings' }) || await AutoReactModel.create({ _id: 'sachiyamd_autoreact_settings', ireact: true, greact: true });
        let readDoc = await AutoReadModel.findOne({ _id: 'autoread_config' }) || await AutoReadModel.create({ _id: 'autoread_config', enabled: false });
        let statusDoc = await AutoStatusModel.findOne({ _id: 'sachiyamd_autostatus_settings' }) || await AutoStatusModel.create({ _id: 'sachiyamd_autostatus_settings', status: false });

        let menuText = `╭━━━〔 ⚙️ SACHIYA-MD MASTER SETTINGS 〕━━━\n`;
        menuText += `┃\n`;
        menuText += `┃ 1. 📞 *Anti-Call:* ${callDoc.status ? "🟢 Enabled" : "🔴 Disabled"}\n`;
        menuText += `┃ 2. 🛡️ *Anti-Delete:* ${deleteDoc.enabled ? "🟢 Enabled" : "🔴 Disabled"}\n`;
        menuText += `┃ 3. 💬 *Inbox Auto-React:* ${reactDoc.ireact ? "🟢 Enabled" : "🔴 Disabled"}\n`;
        menuText += `┃ 4. 👁️ *Auto-Read:* ${readDoc.enabled ? "🟢 Enabled" : "🔴 Disabled"}\n`;
        menuText += `┃ 5. 💚 *Auto-Status:* ${statusDoc.status ? "🟢 Enabled" : "🔴 Disabled"}\n`;
        menuText += `┃\n`;
        menuText += `┣━━━〔 HOW TO CHANGE 〕━━━\n`;
        menuText += `┃ Use commands directly:\n`;
        menuText + `┃ • .set 1 on  or  .set 1 off\n`;
        menuText += `┃ • .set 2 on  or  .set 2 off\n`;
        menuText += `┃ (Numbers: 1 to 5)\n`;
        menuText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        menuText += `> ⚡ Powered by SACHIYA-MD 💫`;

        let aliveImage = 'https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true';

        return await conn.sendMessage(from, {
            image: { url: aliveImage },
            caption: menuText
        }, { quoted: mek });

    } catch (e) {
        console.log("Settings Menu Error: ", e);
        return await reply(`*❌ Error:* ${e.message}`);
    }
});

// 2. Direct Control Command (.set [number] [on/off])
cmd({
    pattern: "set",
    desc: "Change individual bot settings",
    category: "owner",
    react: "🔄",
    filename: __filename
}, async (conn, mek, m, { from, args, reply }) => {
    try {
        let targetNum = args[0];
        let action = args[1] ? args[1].toLowerCase() : "";

        let settingsMap = {
            "1": { name: "Anti-Call", model: AntiCallModel, query: { _id: 'sachiyamd_anticall_status' }, field: 'status' },
            "2": { name: "Anti-Delete", model: AntideleteModel, query: { _id: 'sachiyamd_antidelete_status' }, field: 'enabled' },
            "3": { name: "Inbox Auto-React", model: AutoReactModel, query: { _id: 'sachiyamd_autoreact_settings' }, field: 'ireact' },
            "4": { name: "Auto-Read", model: AutoReadModel, query: { _id: 'autoread_config' }, field: 'enabled' },
            "5": { name: "Auto-Status", model: AutoStatusModel, query: { _id: 'sachiyamd_autostatus_settings' }, field: 'status' }
        };

        if (!settingsMap[targetNum]) {
            return await reply("*❌ Invalid format!\n👉 Example use: `.set 1 on` or `.set 2 off`*");
        }

        if (action !== "on" && action !== "off") {
            return await reply("*❌ Invalid action! Please use 'on' or 'off'.\n👉 Example: `.set 1 on`*");
        }

        let newState = action === "on";
        let targetItem = settingsMap[targetNum];

        let updateData = {};
        updateData[targetItem.field] = newState;

        await targetItem.model.findOneAndUpdate(
            targetItem.query,
            { $set: updateData },
            { upsert: true, new: true }
        );

        let successText = `╭━━━〔 ✨ SETTINGS UPDATED 〕━━━\n` +
                          `┃\n` +
                          `┃ 📌 *Feature:* ${targetItem.name}\n` +
                          `┃ ⚡ *New Status:* ${newState ? '🟢 ENABLED' : '🔴 DISABLED'}\n` +
                          `┃ 💾 *Database:* Saved to MongoDB Atlas ✅\n` +
                          `┃\n` +
                          `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                          `> ⚡ Powered by SACHIYA-MD 💫`;

        return await reply(successText);

    } catch (e) {
        console.log("Settings Update Error: ", e);
        return await reply(`*❌ Error:* ${e.message}`);
    }
});
