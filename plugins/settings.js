const { cmd } = require('../command');
const mongoose = require('mongoose');

// Standard Mongoose Models
const AntiCallModel = mongoose.models.AntiCall || mongoose.model('AntiCall', new mongoose.Schema({ _id: { type: String, required: true }, status: { type: Boolean, default: false } }));
const AntideleteModel = mongoose.models.Antidelete || mongoose.model('Antidelete', new mongoose.Schema({ _id: { type: String, required: true }, enabled: { type: Boolean, default: false } }));
const AutoReactModel = mongoose.models.AutoReact || mongoose.model('AutoReact', new mongoose.Schema({ _id: { type: String, required: true }, ireact: { type: Boolean, default: true }, greact: { type: Boolean, default: true } }));
const AutoReadModel = mongoose.models.AutoRead || mongoose.model('AutoRead', new mongoose.Schema({ _id: { type: String, required: true }, enabled: { type: Boolean, default: false } }));
const AutoStatusModel = mongoose.models.AutoStatus || mongoose.model('AutoStatus', new mongoose.Schema({ _id: { type: String, required: true }, status: { type: Boolean, default: false } }));

// Initialize Global Runtime Cache so other files can access instantly without restarting
global.sachiyaSettings = global.sachiyaSettings || {
    anticall: false,
    antidelete: false,
    inboxReact: true,
    groupReact: true,
    autoread: false,
    autostatus: false
};

cmd({
    pattern: "settings",
    desc: "Manage bot settings interactively",
    category: "owner",
    react: "⚙️",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, { react: { text: "💫", key: mek.key } });

        // Fetch Data and Sync to Global Cache
        let callDoc = await AntiCallModel.findOne({ _id: 'sachiyamd_anticall_status' }) || await AntiCallModel.create({ _id: 'sachiyamd_anticall_status', status: false });
        let deleteDoc = await AntideleteModel.findOne({ _id: 'sachiyamd_antidelete_status' }) || await AntideleteModel.create({ _id: 'sachiyamd_antidelete_status', enabled: false });
        let reactDoc = await AutoReactModel.findOne({ _id: 'sachiyamd_autoreact_settings' }) || await AutoReactModel.create({ _id: 'sachiyamd_autoreact_settings', ireact: true, greact: true });
        let readDoc = await AutoReadModel.findOne({ _id: 'autoread_config' }) || await AutoReadModel.create({ _id: 'autoread_config', enabled: false });
        let statusDoc = await AutoStatusModel.findOne({ _id: 'sachiyamd_autostatus_settings' }) || await AutoStatusModel.create({ _id: 'sachiyamd_autostatus_settings', status: false });

        // Update global memory cache live
        global.sachiyaSettings.anticall = callDoc.status;
        global.sachiyaSettings.antidelete = deleteDoc.enabled;
        global.sachiyaSettings.inboxReact = reactDoc.ireact;
        global.sachiyaSettings.groupReact = reactDoc.greact;
        global.sachiyaSettings.autoread = readDoc.enabled;
        global.sachiyaSettings.autostatus = statusDoc.status;

        let menuText = `╭━━━〔 ⚙️ SACHIYA-MD MASTER SETTINGS 〕━━━\n` +
                       `┃\n` +
                       `┃ 1. 📞 *Anti-Call:* ${global.sachiyaSettings.anticall ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                       `┃ 2. 🛡️ *Anti-Delete:* ${global.sachiyaSettings.antidelete ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                       `┃ 3. 💬 *Inbox Auto-React:* ${global.sachiyaSettings.inboxReact ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                       `┃ 4. 👥 *Group Auto-React:* ${global.sachiyaSettings.groupReact ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                       `┃ 5. 👁️ *Auto-Read:* ${global.sachiyaSettings.autoread ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                       `┃ 6. 💚 *Auto-Status:* ${global.sachiyaSettings.autostatus ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                       `┃\n` +
                       `┣━━━〔 HOW TO CHANGE 〕━━━\n` +
                       `┃ • Reply to this message\n` +
                       `┃ with: [Number] [on/off]\n` +
                       `┃ • Example: 1 on or 6 off\n` +
                       `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                       `> ⚡ Powered by SACHIYA-MD 💫`;

        let aliveImage = 'https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true';

        let sentMsg = await conn.sendMessage(from, {
            image: { url: aliveImage },
            caption: menuText
        }, { quoted: mek });

        const messageID = sentMsg.key.id;

        const upsertListener = async (chatUpdate) => {
            try {
                const mekResponse = chatUpdate.messages[0];
                if (!mekResponse || !mekResponse.message) return;

                const responseMessage = mekResponse.message.conversation || mekResponse.message.extendedTextMessage?.text;
                const senderID = mekResponse.key.remoteJid;
                const isReplyToSent = mekResponse.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

                if (isReplyToSent && senderID === from && responseMessage) {
                    await conn.sendMessage(from, { react: { text: "⏳", key: mekResponse.key } });

                    let args = responseMessage.trim().toLowerCase().split(/\s+/);
                    let targetNum = args[0];
                    let action = args[1];

                    const modelsMap = {
                        "1": { name: "Anti-Call", field: 'status', model: AntiCallModel, query: { _id: 'sachiyamd_anticall_status' }, cacheKey: 'anticall' },
                        "2": { name: "Anti-Delete", field: 'enabled', model: AntideleteModel, query: { _id: 'sachiyamd_antidelete_status' }, cacheKey: 'antidelete' },
                        "3": { name: "Inbox Auto-React", field: 'ireact', model: AutoReactModel, query: { _id: 'sachiyamd_autoreact_settings' }, cacheKey: 'inboxReact' },
                        "4": { name: "Group Auto-React", field: 'greact', model: AutoReactModel, query: { _id: 'sachiyamd_autoreact_settings' }, cacheKey: 'groupReact' },
                        "5": { name: "Auto-Read", field: 'enabled', model: AutoReadModel, query: { _id: 'autoread_config' }, cacheKey: 'autoread' },
                        "6": { name: "Auto-Status", field: 'status', model: AutoStatusModel, query: { _id: 'sachiyamd_autostatus_settings' }, cacheKey: 'autostatus' }
                    };

                    if (!modelsMap[targetNum]) {
                        await conn.sendMessage(from, { text: "*❌ Invalid number! Reply with 1 to 6 (Example: `6 off`).*" }, { quoted: mekResponse });
                        return;
                    }

                    if (action !== "on" && action !== "off") {
                        await conn.sendMessage(from, { text: "*❌ Invalid action! Type 'on' or 'off' (Example: `6 off`).*" }, { quoted: mekResponse });
                        return;
                    }

                    let newState = action === "on";
                    let targetItem = modelsMap[targetNum];

                    let updateObject = {};
                    updateObject[targetItem.field] = newState;

                    let updatedDoc = await targetItem.model.findOneAndUpdate(
                        targetItem.query,
                        { $set: updateObject },
                        { upsert: true, new: true }
                    );

                    if (updatedDoc) {
                        // UPDATE GLOBAL RUNTIME CACHE INSTANTLY (No restart needed!)
                        global.sachiyaSettings[targetItem.cacheKey] = newState;

                        let successText = `${targetItem.name} ${action} success ✅`;
                        await conn.sendMessage(from, { text: successText }, { quoted: mekResponse });
                        await conn.sendMessage(from, { react: { text: "✅", key: mekResponse.key } });
                    } else {
                        await conn.sendMessage(from, { text: `*❌ Failed to update ${targetItem.name}!*` }, { quoted: mekResponse });
                    }

                    conn.ev.off("messages.upsert", upsertListener);
                }
            } catch (err) {
                console.log("Settings Listener Error: ", err);
            }
        };

        conn.ev.on("messages.upsert", upsertListener);

    } catch (e) {
        console.log("Settings Menu Error: ", e);
        return await reply(`*❌ Error:* ${e.message}`);
    }
});
