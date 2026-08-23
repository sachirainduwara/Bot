const { cmd } = require('../command');
const mongoose = require('mongoose');

// Mongoose Schemas & Models (Standardized with default values for real backend integration)
const AntiCallSchema = new mongoose.Schema({ _id: { type: String, required: true, default: 'anticall_config' }, status: { type: Boolean, default: false } });
const AntiCallModel = mongoose.models.AntiCall || mongoose.model('AntiCall', AntiCallSchema);

const AntideleteSchema = new mongoose.Schema({ _id: { type: String, required: true, default: 'antidelete_config' }, enabled: { type: Boolean, default: false } });
const AntideleteModel = mongoose.models.Antidelete || mongoose.model('Antidelete', AntideleteSchema);

const AutoReactSchema = new mongoose.Schema({ _id: { type: String, required: true, default: 'autoreact_config' }, ireact: { type: Boolean, default: false }, greact: { type: Boolean, default: false } });
const AutoReactModel = mongoose.models.AutoReact || mongoose.model('AutoReact', AutoReactSchema);

const AutoReadSchema = new mongoose.Schema({ _id: { type: String, required: true, default: 'autoread_config' }, enabled: { type: Boolean, default: false } });
const AutoReadModel = mongoose.models.AutoRead || mongoose.model('AutoRead', AutoReadSchema);

const AutoStatusSchema = new mongoose.Schema({ _id: { type: String, required: true, default: 'autostatus_config' }, status: { type: Boolean, default: false } });
const AutoStatusModel = mongoose.models.AutoStatus || mongoose.model('AutoStatus', AutoStatusSchema);

cmd({
    pattern: "settings",
    desc: "Manage and toggle bot master settings interactively",
    category: "owner",
    react: "⚙️",
    filename: __filename
}, async (conn, mek, m, { from, reply }) => {
    try {
        await conn.sendMessage(from, { react: { text: "💫", key: mek.key } });

        // Fetch real status from MongoDB database (using standard IDs)
        let callDoc = await AntiCallModel.findOne({ _id: 'anticall_config' }) || await AntiCallModel.create({ _id: 'anticall_config', status: false });
        let deleteDoc = await AntideleteModel.findOne({ _id: 'antidelete_config' }) || await AntideleteModel.create({ _id: 'antidelete_config', enabled: false });
        let reactDoc = await AutoReactModel.findOne({ _id: 'autoreact_config' }) || await AutoReactModel.create({ _id: 'autoreact_config', ireact: false, greact: false });
        let readDoc = await AutoReadModel.findOne({ _id: 'autoread_config' }) || await AutoReadModel.create({ _id: 'autoread_config', enabled: false });
        let statusDoc = await AutoStatusModel.findOne({ _id: 'autostatus_config' }) || await AutoStatusModel.create({ _id: 'autostatus_config', status: false });

        // Build interactive UI text box
        let menuText = `╭━━━〔 ⚙️ SACHIYA-MD MASTER SETTINGS 〕━━━\n` +
                       `┃\n` +
                       `┃ 1. 📞 *Anti-Call:* ${callDoc.status ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                       `┃ 2. 🛡️ *Anti-Delete:* ${deleteDoc.enabled ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                       `┃ 3. 💬 *Inbox Auto-React:* ${reactDoc.ireact ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                       `┃ 4. 👥 *Group Auto-React:* ${reactDoc.greact ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                       `┃ 5. 👁️ *Auto-Read:* ${readDoc.enabled ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                       `┃ 6. 💚 *Auto-Status:* ${statusDoc.status ? "🟢 Enabled" : "🔴 Disabled"}\n` +
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

        // Real event listener to capture direct replies cleanly and execute database writes
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

                    // Database Map configuration mapping to real models and properties
                    const modelsMap = {
                        "1": { name: "Anti-Call", field: 'status', model: AntiCallModel, query: { _id: 'anticall_config' } },
                        "2": { name: "Anti-Delete", field: 'enabled', model: AntideleteModel, query: { _id: 'antidelete_config' } },
                        "3": { name: "Inbox Auto-React", field: 'ireact', model: AutoReactModel, query: { _id: 'autoreact_config' } },
                        "4": { name: "Group Auto-React", field: 'greact', model: AutoReactModel, query: { _id: 'autoreact_config' } },
                        "5": { name: "Auto-Read", field: 'enabled', model: AutoReadModel, query: { _id: 'autoread_config' } },
                        "6": { name: "Auto-Status", field: 'status', model: AutoStatusModel, query: { _id: 'autostatus_config' } }
                    };

                    if (!modelsMap[targetNum]) {
                        await conn.sendMessage(from, { text: "*❌ Invalid number! Reply with 1 to 6 (Example: `6 off`).*" }, { quoted: mekResponse });
                        return;
                    }

                    if (action !== "on" && action !== "off") {
                        await conn.sendMessage(from, { text: "*❌ Invalid action! Type 'on' or 'off' after number (Example: `6 off`).*" }, { quoted: mekResponse });
                        return;
                    }

                    let newState = action === "on";
                    let targetItem = modelsMap[targetNum];

                    // Execute strict MongoDB atomic update with upsert true
                    let updateObject = {};
                    updateObject[targetItem.field] = newState;

                    let updatedDoc = await targetItem.model.findOneAndUpdate(
                        targetItem.query,
                        { $set: updateObject },
                        { upsert: true, new: true }
                    );

                    if (updatedDoc) {
                        let successText = `${targetItem.name} ${action} success ✅`;
                        await conn.sendMessage(from, { text: successText }, { quoted: mekResponse });
                        await conn.sendMessage(from, { react: { text: "✅", key: mekResponse.key } });
                    } else {
                        await conn.sendMessage(from, { text: `*❌ Database update failed for ${targetItem.name}!*` }, { quoted: mekResponse });
                    }
                }
            } catch (innerErr) {
                console.log("Settings Upsert Inner Error: ", innerErr);
            }
        };

        // Attach listener securely
        conn.ev.on("messages.upsert", upsertListener);

    } catch (e) {
        console.log("Settings Menu Error: ", e);
        return await reply(`*❌ Error:* ${e.message}`);
    }
});
