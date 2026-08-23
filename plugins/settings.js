const { cmd } = require('../command');
const mongoose = require('mongoose');

// Mongoose Models matching your plugin schemas
const AntiCallModel = mongoose.models.AntiCall || mongoose.model('AntiCall', new mongoose.Schema({ _id: { type: String, required: true }, status: { type: Boolean, default: false } }));
const AntideleteModel = mongoose.models.Antidelete || mongoose.model('Antidelete', new mongoose.Schema({ _id: { type: String, required: true, default: 'sachiyamd_antidelete_status' }, enabled: { type: Boolean, default: false } }));
const AutoReactModel = mongoose.models.AutoReact || mongoose.model('AutoReact', new mongoose.Schema({ _id: { type: String, required: true }, ireact: { type: Boolean, default: true }, greact: { type: Boolean, default: true } }));
const AutoReadModel = mongoose.models.AutoRead || mongoose.model('AutoRead', new mongoose.Schema({ _id: { type: String, required: true, default: 'autoread_config' }, enabled: { type: Boolean, default: false } }));
const AutoStatusModel = mongoose.models.AutoStatus || mongoose.model('AutoStatus', new mongoose.Schema({ _id: { type: String, required: true }, status: { type: Boolean, default: false } }));

// Temporary session store for 30 minutes reply tracking
const activeSettingsSessions = new Map();

cmd({
    pattern: "settings",
    desc: "Manage bot settings interactively",
    category: "owner",
    react: "⚙️",
    filename: __filename
}, async (conn, mek, m, { from, isOwner, reply, sender }) => {
    try {
        if (!isOwner) {
            return await reply("*❌ This command is only for the Bot Owner! 💫*");
        }

        await conn.sendMessage(from, { react: { text: "💫", key: mek.key } });

        // Fetch latest data directly from MongoDB models
        let callDoc = await AntiCallModel.findOne({ _id: 'sachiyamd_anticall_status' });
        let deleteDoc = await AntideleteModel.findOne({ _id: '_id: 'sachiyamd_antidelete_status' }) || await AntideleteModel.findOne({ _id: 'sachiyamd_antidelete_status' });
        let reactDoc = await AutoReactModel.findOne({ _id: 'sachiyamd_autoreact_settings' });
        let readDoc = await AutoReadModel.findOne({ _id: 'autoread_config' });
        let statusDoc = await AutoStatusModel.findOne({ _id: 'sachiyamd_autostatus_settings' });

        let anticall = callDoc ? callDoc.status : false;
        let antidelete = deleteDoc ? deleteDoc.enabled : false;
        let ireact = reactDoc ? reactDoc.ireact : true;
        let autostatus = statusDoc ? statusDoc.status : false;
        let autoread = readDoc ? readDoc.enabled : false;

        let settingsState = {
            1: { name: "Anti-Call", key: "anticall", status: anticall, model: AntiCallModel, idQuery: { _id: 'sachiyamd_anticall_status' }, field: 'status' },
            2: { name: "Anti-Delete", key: "antidelete", status: antidelete, model: AntideleteModel, idQuery: { _id: 'sachiyamd_antidelete_status' }, field: 'enabled' },
            3: { name: "Inbox Auto-React", key: "ireact", status: ireact, model: AutoReactModel, idQuery: { _id: 'sachiyamd_autoreact_settings' }, field: 'ireact' },
            4: { name: "Auto-Read", key: "autoread", status: autoread, model: AutoReadModel, idQuery: { _id: 'autoread_config' }, field: 'enabled' },
            5: { name: "Auto-Status", key: "autostatus", status: autostatus, model: AutoStatusModel, idQuery: { _id: 'sachiyamd_autostatus_settings' }, field: 'status' }
        };

        // Constructing the UI Box Layout as requested from your screenshot
        let menuText = `╭━━━〔 ⚙️ SACHIYA-MD MASTER SETTINGS 〕━━━\n`;
        menuText += `┃\n`;

        for (let num in settingsState) {
            let item = settingsState[num];
            let emojiIcon = item.status ? "🟢" : "🔴";
            let stateText = item.status ? "Enabled" : "Disabled";
            
            let iconSymbol = num === '1' ? '📞' : num === '2' ? '🛡️' : num === '3' ? '💬' : num === '4' ? '👁️' : '💚';
            menuText += `┃ ${num}. ${iconSymbol} *${item.name}:* ${emojiIcon} ${stateText}\n`;
        }

        menuText += `┃\n`;
        menuText += `┣━━━〔 HOW TO CHANGE 〕━━━\n`;
        menuText += `┃ • Reply to this message\n`;
        menuText += `┃ with: [Number] [on/off]\n`;
        menuText += `┃ • Example: 1 on or 4 off\n`;
        menuText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        menuText += `> ⚡ Powered by SACHIYA-MD 💫`;

        let aliveImage = 'https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true';

        let sentMsg = await conn.sendMessage(from, {
            image: { url: aliveImage },
            caption: menuText
        }, { quoted: mek });

        // Save session for 30 minutes
        activeSettingsSessions.set(sentMsg.key.id, {
            sender,
            settingsState
        });

        setTimeout(() => {
            activeSettingsSessions.delete(sentMsg.key.id);
        }, 30 * 60 * 1000);

    } catch (e) {
        console.log("Settings Menu Error: ", e);
        return await reply(`*❌ Error:* ${e.message}`);
    }
});

// Listener for Reply Handling & MongoDB Update
cmd({
    on: "text"
}, async (conn, mek, m, { from, body, isOwner, reply, quoted }) => {
    try {
        if (!isOwner) return;
        if (!quoted) return;

        let session = activeSettingsSessions.get(quoted.id);
        if (!session) return;

        let args = body.trim().toLowerCase().split(" ");
        let targetNum = args[0];
        let action = args[1];

        if (!session.settingsState[targetNum]) {
            return await reply("*❌ Invalid number! Please reply with a valid number from 1 to 5.*");
        }

        if (action !== "on" && action !== "off") {
            return await reply("*❌ Invalid action! Please type 'on' or 'off' (Example: `1 on`)*");
        }

        let newState = action === "on";
        let targetItem = session.settingsState[targetNum];

        // Update database directly based on model definition
        let updateQuery = {};
        updateQuery[targetItem.field] = newState;

        await targetItem.model.findOneAndUpdate(
            targetItem.idQuery,
            { $set: updateQuery },
            { upsert: true, new: true }
        );

        // Success UI Response matching your exact design style
        let successText = `╭━━━〔 ✨ SETTINGS UPDATED 〕━━━\n` +
                          `┃\n` +
                          `┃ 📌 *Feature:* ${targetItem.name}\n` +
                          `┃ ⚡ *New Status:* ${newState ? '🟢 ENABLED' : '🔴 DISABLED'}\n` +
                          `┃ 💾 *Database:* Saved to MongoDB Atlas ✅\n` +
                          `┃\n` +
                          `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                          `> ⚡ Powered by SACHIYA-MD 💫`;

        await reply(successText);

    } catch (e) {
        console.log("Settings Response Error: ", e);
    }
});
