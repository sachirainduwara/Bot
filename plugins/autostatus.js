const { cmd } = require("../command");
const fs = require('fs');
const path = require('path');

// සටහන් තබාගැනීමේ ෆයිල් එක
const settingsPath = path.join(__dirname, '../status_settings.json');

// ඩිෆෝල්ට් සෙටින්ග්ස්
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

// 1. Auto Status Read ලොජික් එක (කිසිදු රියැක්ට් එකක් හෝ මැසේජ් යැවීමක් සිදු නොකරයි)
cmd({
    on: "status"
}, async (sachiya, mek, m) => {
    try {
        const settings = getSettings();
        if (settings.autoread) {
            // ස්ටේටස් එක ස්වයංක්‍රීයව බැලීම (Read වීම) පමණක් සිදු කරයි
            await sachiya.readMessages([mek.key]);
        }
    } catch (e) {
        console.error("Auto Status Read Error: ", e);
    }
});

// 2. On / Off කිරීමට කමාන්ඩ් එක (Owner චෙක් කිරීම සම්පූර්ණයෙන්ම ඉවත් කර ඇත)
cmd(
    {
        pattern: "autostatus",
        alias: ["statusread", "autoreadstatus"],
        desc: "Turn on or off auto status reading",
        category: "owner",
        filename: __filename,
    },
    async (sachiya, mek, m, { reply, q }) => {
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
        statusText += `┃ ┃ • \`${prefix}autostatus on\` - Enable Status Read 🟢\n`;
        statusText += `┃ ┃ • \`${prefix}autostatus off\` - Disable Status Read 🔴\n`;
        statusText += `┃\n`;
        statusText += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        statusText += `> *⚡ Powered by SACHIYA-MD 💫*`;

        return reply(statusText);
    }
);
