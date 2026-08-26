const { cmd } = require('../command');
const mongoose = require('mongoose');
const config = require('../config');

// Mongoose Models
const AntiCallModel = mongoose.models.AntiCall || mongoose.model('AntiCall', new mongoose.Schema({ _id: { type: String, required: true }, status: { type: Boolean, default: false } }));
const AntideleteModel = mongoose.models.Antidelete || mongoose.model('Antidelete', new mongoose.Schema({ _id: { type: String, required: true }, enabled: { type: Boolean, default: false } }));
const AutoReactModel = mongoose.models.AutoReact || mongoose.model('AutoReact', new mongoose.Schema({ _id: { type: String, required: true }, ireact: { type: Boolean, default: true }, greact: { type: Boolean, default: true } }));
const AutoReadModel = mongoose.models.AutoRead || mongoose.model('AutoRead', new mongoose.Schema({ _id: { type: String, required: true }, enabled: { type: Boolean, default: false } }));
const AutoStatusModel = mongoose.models.AutoStatus || mongoose.model('AutoStatus', new mongoose.Schema({ _id: { type: String, required: true }, status: { type: Boolean, default: false } }));

// Global Runtime State Management
global.SACHIYA_SETTINGS = global.SACHIYA_SETTINGS || {
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
}, async (conn, mek, m, { from, reply, sender, senderNumber }) => {
    try {
        // 🔒 100% Accurate Owner Verification (Handles Self-Chat & Group/Inbox correctly)
        const ownerNumConfig = (config.OWNER_NUM || '94760579211').replace(/[^0-9]/g, '');
        const currentSenderClean = (senderNumber || sender || '').replace(/[^0-9]/g, '');
        
        const botJidNormalized = conn.user ? conn.user.id.split('@')[0].split(':')[0] : '';
        
        const isActuallyOwner = currentSenderClean.includes(ownerNumConfig) || 
                                ownerNumConfig.includes(currentSenderClean) || 
                                mek.key.fromMe || 
                                currentSenderClean === botJidNormalized;

        if (!isActuallyOwner) {
            return reply("*❌ This command is only for the Owner!*");
        }

        await conn.sendMessage(from, { react: { text: "⚙️", key: mek.key } });

        // Fetch / Initialize database states and sync to global runtime instantly
        let callDoc = await AntiCallModel.findOne({ _id: 'sachiyamd_anticall_status' }) || await AntiCallModel.create({ _id: 'sachiyamd_anticall_status', status: false });
        let deleteDoc = await AntideleteModel.findOne({ _id: 'sachiyamd_antidelete_status' }) || await AntideleteModel.create({ _id: 'sachiyamd_antidelete_status', enabled: false });
        let reactDoc = await AutoReactModel.findOne({ _id: 'sachiyamd_autoreact_settings' }) || await AutoReactModel.create({ _id: 'sachiyamd_autoreact_settings', ireact: true, greact: true });
        let readDoc = await AutoReadModel.findOne({ _id: 'autoread_config' }) || await AutoReadModel.create({ _id: 'autoread_config', enabled: false });
        let statusDoc = await AutoStatusModel.findOne({ _id: 'sachiyamd_autostatus_settings' }) || await AutoStatusModel.create({ _id: 'sachiyamd_autostatus_settings', status: false });

        global.SACHIYA_SETTINGS.anticall = callDoc.status;
        global.SACHIYA_SETTINGS.antidelete = deleteDoc.enabled;
        global.SACHIYA_SETTINGS.inboxReact = reactDoc.ireact;
        global.SACHIYA_SETTINGS.groupReact = reactDoc.greact;
        global.SACHIYA_SETTINGS.autoread = readDoc.enabled;
        global.SACHIYA_SETTINGS.autostatus = statusDoc.status;

        let menuText = `╭━━━〔  *SACHIYA-MD SETTINGS* 〕━━━\n` +
                       `┃\n` +
                       `┃ 1. 📞 *Call:* ${global.SACHIYA_SETTINGS.anticall ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                       `┃ 2. 🛡️ *Delete:* ${global.SACHIYA_SETTINGS.antidelete ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                       `┃ 3. 💬 *Inbox React:* ${global.SACHIYA_SETTINGS.inboxReact ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                       `┃ 4. 👥 *Group React:* ${global.SACHIYA_SETTINGS.groupReact ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                       `┃ 5. 👁️ *Read:* ${global.SACHIYA_SETTINGS.autoread ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                       `┃ 6. 💚 *Status:* ${global.SACHIYA_SETTINGS.autostatus ? "🟢 Enabled" : "🔴 Disabled"}\n` +
                       `┃\n` +
                       `┃ *Reply [Number] [on/off]*\n` +
                       `┃ *(Valid for 30 Minutes)*\n` +
                       `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                       ` > *Powered by SACHIYA-MD 💫*`;

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
                    // Reply karana kenath owner da kiyala balanna check eka
                    const repSender = mekResponse.key.participant || mekResponse.key.remoteJid;
                    const repSenderClean = (repSender || '').replace(/[^0-9]/g, '');
                    const isRepOwner = repSenderClean.includes(ownerNumConfig) || 
                                       ownerNumConfig.includes(repSenderClean) || 
                                       mekResponse.key.fromMe || 
                                       repSenderClean === botJidNormalized;

                    if (!isRepOwner) {
                        await conn.sendMessage(from, { text: "*❌ Only the owner can change these settings!*" }, { quoted: mekResponse });
                        return;
                    }

                    await conn.sendMessage(from, { react: { text: "⏳", key: mekResponse.key } });

                    let args = responseMessage.trim().toLowerCase().split(/\s+/);
                    let targetNum = args[0];
                    let action = args[1];

                    if (!["1", "2", "3", "4", "5", "6"].includes(targetNum)) {
                        await conn.sendMessage(from, { text: "*❌ Invalid number! Reply with 1 to 6 (Example: `3 off`).*" }, { quoted: mekResponse });
                        return;
                    }

                    if (action !== "on" && action !== "off") {
                        await conn.sendMessage(from, { text: "*❌ Invalid action! Type 'on' or 'off' (Example: `3 off`).*" }, { quoted: mekResponse });
                        return;
                    }

                    let newState = action === "on";
                    let updatedDoc = null;
                    let featureName = "";

                    if (targetNum === "1") {
                        updatedDoc = await AntiCallModel.findOneAndUpdate({ _id: 'sachiyamd_anticall_status' }, { status: newState }, { upsert: true, new: true });
                        global.SACHIYA_SETTINGS.anticall = newState;
                        featureName = "Anti-Call";
                    } else if (targetNum === "2") {
                        updatedDoc = await AntideleteModel.findOneAndUpdate({ _id: 'sachiyamd_antidelete_status' }, { enabled: newState }, { upsert: true, new: true });
                        global.SACHIYA_SETTINGS.antidelete = newState;
                        featureName = "Anti-Delete";
                    } else if (targetNum === "3") {
                        let currentReact = await AutoReactModel.findOne({ _id: 'sachiyamd_autoreact_settings' }) || { ireact: true, greact: true };
                        updatedDoc = await AutoReactModel.findOneAndUpdate(
                            { _id: 'sachiyamd_autoreact_settings' }, 
                            { ireact: newState, greact: currentReact.greact }, 
                            { upsert: true, new: true }
                        );
                        global.SACHIYA_SETTINGS.inboxReact = newState;
                        featureName = "Inbox Auto-React";
                    } else if (targetNum === "4") {
                        let currentReact = await AutoReactModel.findOne({ _id: 'sachiyamd_autoreact_settings' }) || { ireact: true, greact: true };
                        updatedDoc = await AutoReactModel.findOneAndUpdate(
                            { _id: 'sachiyamd_autoreact_settings' }, 
                            { ireact: currentReact.ireact, greact: newState }, 
                            { upsert: true, new: true }
                        );
                        global.SACHIYA_SETTINGS.groupReact = newState;
                        featureName = "Group Auto-React";
                    } else if (targetNum === "5") {
                        updatedDoc = await AutoReadModel.findOneAndUpdate({ _id: 'autoread_config' }, { enabled: newState, updatedAt: new Date() }, { upsert: true, new: true });
                        global.SACHIYA_SETTINGS.autoread = newState;
                        featureName = "Auto-Read";
                    } else if (targetNum === "6") {
                        updatedDoc = await AutoStatusModel.findOneAndUpdate({ _id: 'sachiyamd_autostatus_settings' }, { status: newState }, { upsert: true, new: true });
                        global.SACHIYA_SETTINGS.autostatus = newState;
                        featureName = "Auto-Status";
                    }

                    if (updatedDoc) {
                        let successText = `${featureName} ${action} success ✅`;
                        await conn.sendMessage(from, { text: successText }, { quoted: mekResponse });
                        await conn.sendMessage(from, { react: { text: "✅", key: mekResponse.key } });
                    } else {
                        await conn.sendMessage(from, { text: `*❌ Database sync failed for ${featureName}!*` }, { quoted: mekResponse });
                    }
                }
            } catch (err) {
                console.log("Settings Upsert Error: ", err);
            }
        };

        conn.ev.on("messages.upsert", upsertListener);

        // Auto remove listener after 30 minutes to save memory
        setTimeout(() => {
            conn.ev.off("messages.upsert", upsertListener);
        }, 30 * 60 * 1000);

    } catch (e) {
        console.log("Settings Menu Error: ", e);
        return reply(`*❌ Error:* ${e.message}`);
    }
});
