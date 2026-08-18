const { cmd } = require("../command");
const fs = require('fs');
const path = require('path');
const config = require("../config"); // config.js එකෙන් mongoDB සහ owner number ගැනීමට

// MongoDB හෝ JSON ෆයිල් එක මඟින් සෙටින්ග්ස් ස්ථිරව තබාගැනීම
const settingsPath = path.join(__dirname, '../status_settings.json');

function getSettings() {
    try {
        if (fs.existsSync(settingsPath)) {
            return JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        }
    } catch (e) {}
    return { autoread: true };
}

function saveSettings(settings) {
    try {
        fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } catch (e) {}
}

// 1. Auto Status Read ලොජික් එක (කිසිදු මැසේජ් එකක් යැවීමෙන් තොරව ස්ටේටස් පමනක් Read කරයි)
cmd({
    on: "status"
}, async (sachiya, mek, m) => {
    try {
        const settings = getSettings();
        if (settings.autoread) {
            await sachiya.readMessages([mek.key]);
        }
    } catch (e) {
        console.error("Auto Status Read Error: ", e);
    }
});

// 2. ඔයාට පමණක් (Owner) On / Off කළ හැකි කමාන්ඩ් එක
cmd(
    {
        pattern: "autostatus",
        alias: ["statusread", "autoreadstatus"],
        desc: "Turn on or off auto status reading",
        category: "owner",
        filename: __filename,
    },
    async (sachiya, mek, m, { reply, q }) => {
        try {
            // බොට්ගේ ඕනර් නම්බර් එක හෝ සෙන්ඩර් චෙක් කිරීම (Owner විතරක් වැඩ කිරීමට)
            const senderNumber = m.sender.replace(/[^0-9]/g, "");
            const ownerNumber = (config.OWNER_NUMBER || "").replace(/[^0-9]/g, "");
            
            // සෙන්ඩර් සහ ඕනර් සමාන නැත්නම් සහ බොට්ගේ ඩිවලොපර් නොවේ නම් රිප්ලය් කිරීම නතර කරයි
            if (ownerNumber && senderNumber !== ownerNumber && !m.key.fromMe) {
                return reply("❌ *This command is only for the Bot Owner!*");
            }

            let settings = getSettings();
            const args = q ? q.trim().toLowerCase() : "";

            if (args === "on") {
                settings.autoread = true;
                saveSettings(settings);
                return reply("✨ *Auto Status Read System successfully Enabled* 🟢!");
            } else if (args === "off") {
                settings.autoread = false;
                saveSettings(settings);
                return reply("✨ *Auto Status Read System successfully Disabled* 🔴!");
            }

            // ස්ටේටස් පැනල් මෙනුව
            let statusText = `╭━━━〔 ✨ *SACHIYA-MD* 〕━━━\n`;
            statusText += `┃\n`;
            statusText += `┃ ⚙️ *Current Status:* ${settings.autoread ? "✅ Enabled" : "❌ Disabled"}\n`;
            statusText += `┃\n`;
            statusText += `┃ *Available Commands:*\n`;
            statusText += `┃ ┃ • \`.autostatus on\` - Enable Status Read 🟢\n`;
            statusText += `┃ ┃ • \`.autostatus off\` - Disable Status Read 🔴\n`;
            statusText += `┃\n`;
            statusText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            statusText += `> *⚡ Powered by SACHIYA-MD 💫*`;

            return reply(statusText);

        } catch (e) {
            console.error(e);
            return reply("❌ *An error occurred while executing the command!*");
        }
    }
);
