const { cmd } = require('../command');
const mongoose = require('mongoose');

// Mongoose Models matching your exact plugin schemas
const AntiCallModel = mongoose.models.AntiCall || mongoose.model('AntiCall', new mongoose.Schema({ _id: { type: String, required: true }, status: { type: Boolean, default: false } }));
const AntideleteModel = mongoose.models.Antidelete || mongoose.model('Antidelete', new mongoose.Schema({ _id: { type: String, required: true, default: 'sachiyamd_antidelete_status' }, enabled: { type: Boolean, default: false } }));
const AutoReactModel = mongoose.models.AutoReact || mongoose.model('AutoReact', new mongoose.Schema({ _id: { type: String, required: true }, ireact: { type: Boolean, default: true }, greact: { type: Boolean, default: true } }));
const AutoReadModel = mongoose.models.AutoRead || mongoose.model('AutoRead', new mongoose.Schema({ _id: { type: String, required: true, default: 'autoread_config' }, enabled: { type: Boolean, default: false } }));
const AutoStatusModel = mongoose.models.AutoStatus || mongoose.model('AutoStatus', new mongoose.Schema({ _id: { type: String, required: true }, status: { type: Boolean, default: false } }));

// Global Session Map to track active settings menu per chat
const activeSettingsSessions = new Map();

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

        // Fetch / Initialize data from MongoDB
        let callDoc = await AntiCallModel.findOne({ _id: 'sachiyamd_anticall_status' }) || await AntiCallModel.create({ _id: 'sachiyamd_anticall_status', status: false });
        let deleteDoc = await AntideleteModel.findOne({ _id: 'sachiyamd_antidelete_status' }) || await AntideleteModel.create({ _id: 'sachiyamd_antidelete_status', enabled: false });
        let reactDoc = await AutoReactModel.findOne({ _id: 'sachiyamd_autoreact_settings' }) || await AutoReactModel.create({ _id: 'sachiyamd_autoreact_settings', ireact: true, greact: true });
        let readDoc = await AutoReadModel.findOne({ _id: 'autoread_config' }) || await AutoReadModel.create({ _id: 'autoread_config', enabled: false });
        let statusDoc = await AutoStatusModel.findOne({ _id: 'sachiyamd_autostatus_settings' }) || await AutoStatusModel.create({ _id: 'sachiyamd_autostatus_settings', status: false });

        let settingsState = {
            "1": { name: "Anti-Call", status: callDoc.status, model: AntiCallModel, idQuery: { _id: 'sachiyamd_anticall_status' }, field: 'status' },
            "2": { name: "Anti-Delete", status: deleteDoc.enabled, model: AntideleteModel, idQuery: { _id: 'sachiyamd_antidelete_status' }, field: 'enabled' },
            "3": { name: "Inbox Auto-React", status: reactDoc.ireact, model: AutoReactModel, idQuery: { _id: 'sachiyamd_autoreact_settings' }, field: 'ireact' },
            "4": { name: "Group Auto-React", status: reactDoc.greact, model: AutoReactModel, idQuery: { _id: 'sachiyamd_autoreact_settings' }, field: 'greact' },
            "5": { name: "Auto-Read", status: readDoc.enabled, model: AutoReadModel, idQuery: { _id: 'autoread_config' }, field: 'enabled' },
            "6": { name: "Auto-Status", status: statusDoc.status, model: AutoStatusModel, idQuery: { _id: 'sachiyamd_autostatus_settings' }, field: 'status' }
        };

        // UI Box Layout
        let menuText = `╭━━━〔 ⚙️ SACHIYA-MD MASTER SETTINGS 〕━━━\n`;
        menuText += `┃\n`;

        for (let num in settingsState) {
            let item = settingsState[num];
            let emojiIcon = item.status ? "🟢" : "🔴";
            let stateText = item.status ? "Enabled" : "Disabled";
            let iconSymbol = num === '1' ? '📞' : num === '2' ? '🛡️' : num === '3' ? '💬' : num === '4' ? '👥' : num === '5' ? '👁️' : '💚';
            menuText += `┃ ${num}. ${iconSymbol} *${item.name}:* ${emojiIcon} ${stateText}\n`;
        }

        menuText += `┃\n`;
        menuText += `┣━━━〔 HOW TO CHANGE 〕━━━\n`;
        menuText += `┃ • Reply to this message\n`;
        menuText += `┃ with: [Number] [on/off]\n`;
        menuText += `┃ • Example: 1 off or 6 on\n`;
        menuText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        menuText += `> ⚡ Powered by SACHIYA-MD 💫`;

        let aliveImage = 'https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true';

        let sentMsg = await conn.sendMessage(from, {
            image: { url: aliveImage },
            caption: menuText
        }, { quoted: mek });

        // Save session state to chat JID tracker
        activeSettingsSessions.set(from, {
            msgId: sentMsg.key.id,
            settingsState
        });

        // Expire session after 30 minutes
        setTimeout(() => {
            if (activeSettingsSessions.get(from)?.msgId === sentMsg.key.id) {
                activeSettingsSessions.delete(from);
            }
        }, 30 * 60 * 1000);

    } catch (e) {
        console.log("Settings Menu Error: ", e);
        return await reply(`*❌ Error:* ${e.message}`);
    }
});

// 2. Text Listener to catch replies like "1 off" or "6 on" precisely matching keys
cmd({
    on: "text"
}, async (conn, mek, m, { from, body, reply, quoted }) => {
    try {
        let session = activeSettingsSessions.get(from);
        if (!session) return;

        // Verify user is replying to the settings message
        let isQuotedSettings = quoted && (quoted.id === session.msgId || quoted.fromMe);
        if (!isQuotedSettings) return;

        let args = body.trim().toLowerCase().split(/\s+/);
        let targetNum = args[0];
        let action = args[1];

        if (!session.settingsState[targetNum]) {
            return await reply("*❌ Invalid number! Please reply with a valid number from 1 to 6.*");
        }

        if (action !== "on" && action !== "off") {
            return await reply("*❌ Invalid action! Please type 'on' or 'off' after the number (Example: `1 off` or `6 on`).*");
        }

        let newState = action === "on";
        let targetItem = session.settingsState[targetNum];

        // Update MongoDB Database directly
        let updateData = {};
        updateData[targetItem.field] = newState;

        await targetItem.model.findOneAndUpdate(
            targetItem.idQuery,
            { $set: updateData },
            { upsert: true, new: true }
        );

        // Update local session status
        targetItem.status = newState;

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
        console.log("Settings Response Error: ", e);
    }
});
