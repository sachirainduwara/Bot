const { cmd } = require('../command');
const mongoose = require('mongoose');

// Mongoose Models matching your exact plugin schemas
const AntiCallModel = mongoose.models.AntiCall || mongoose.model('AntiCall', new mongoose.Schema({ _id: { type: String, required: true }, status: { type: Boolean, default: false } }));
const AntideleteModel = mongoose.models.Antidelete || mongoose.model('Antidelete', new mongoose.Schema({ _id: { type: String, required: true, default: 'sachiyamd_antidelete_status' }, enabled: { type: Boolean, default: false } }));
const AutoReactModel = mongoose.models.AutoReact || mongoose.model('AutoReact', new mongoose.Schema({ _id: { type: String, required: true }, ireact: { type: Boolean, default: true }, greact: { type: Boolean, default: true } }));
const AutoReadModel = mongoose.models.AutoRead || mongoose.model('AutoRead', new mongoose.Schema({ _id: { type: String, required: true, default: 'autoread_config' }, enabled: { type: Boolean, default: false } }));
const AutoStatusModel = mongoose.models.AutoStatus || mongoose.model('AutoStatus', new mongoose.Schema({ _id: { type: String, required: true }, status: { type: Boolean, default: false } }));

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

        // UI Box Layout
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
                       `┃ • Example: 1 off or 6 on\n` +
                       `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                       `> ⚡ Powered by SACHIYA-MD 💫`;

        let aliveImage = 'https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true';

        let sentMsg = await conn.sendMessage(from, {
            image: { url: aliveImage },
            caption: menuText
        }, { quoted: mek });

        // Get the sent message ID for reply tracking
        const messageID = sentMsg.key.id;

        // Event listener using your exact preferred format
        conn.ev.on("messages.upsert", async (chatUpdate) => {
            const mekResponse = chatUpdate.messages[0];
            if (!mekResponse.message) return;

            const responseMessage = mekResponse.message.conversation || mekResponse.message.extendedTextMessage?.text;
            const senderID = mekResponse.key.remoteJid;
            const isReplyToSent = mekResponse.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

            if (isReplyToSent && senderID === from && responseMessage) {
                await conn.sendMessage(from, { react: { text: "📥", key: mekResponse.key } });

                let args = responseMessage.trim().toLowerCase().split(/\s+/);
                let targetNum = args[0];
                let action = args[1];

                const modelsMap = {
                    "1": { name: "Anti-Call", field: 'status', model: AntiCallModel, idQuery: { _id: 'sachiyamd_anticall_status' } },
                    "2": { name: "Anti-Delete", field: 'enabled', model: AntideleteModel, idQuery: { _id: 'sachiyamd_antidelete_status' } },
                    "3": { name: "Inbox Auto-React", field: 'ireact', model: AutoReactModel, idQuery: { _id: 'sachiyamd_autoreact_settings' } },
                    "4": { name: "Group Auto-React", field: 'greact', model: AutoReactModel, idQuery: { _id: 'sachiyamd_autoreact_settings' } },
                    "5": { name: "Auto-Read", field: 'enabled', model: AutoReadModel, idQuery: { _id: 'autoread_config' } },
                    "6": { name: "Auto-Status", field: 'status', model: AutoStatusModel, idQuery: { _id: 'sachiyamd_autostatus_settings' } }
                };

                if (!modelsMap[targetNum]) {
                    await conn.sendMessage(from, { text: "*❌ Invalid number! Reply with a number from 1 to 6 (Example: `6 off`).*" }, { quoted: mekResponse });
                    return;
                }

                if (action !== "on" && action !== "off") {
                    await conn.sendMessage(from, { text: "*❌ Invalid action! Type 'on' or 'off' after the number (Example: `6 off`).*" }, { quoted: mekResponse });
                    return;
                }

                let newState = action === "on";
                let targetItem = modelsMap[targetNum];

                let updateData = {};
                updateData[targetItem.field] = newState;

                await targetItem.model.findOneAndUpdate(
                    targetItem.idQuery,
                    { $set: updateData },
                    { upsert: true, new: true }
                );

                let successText = `${targetItem.name} ${action} success ✅`;
                await conn.sendMessage(from, { text: successText }, { quoted: mekResponse });
                await conn.sendMessage(from, { react: { text: "✅", key: mekResponse.key } });
            }
        });

    } catch (e) {
        console.log("Settings Menu Error: ", e);
        return await reply(`*❌ Error:* ${e.message}`);
    }
});
