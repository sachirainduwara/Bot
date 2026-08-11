const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { writeFile } = require('fs/promises');

const messageStore = new Map();
const CONFIG_PATH = path.join(__dirname, '../data_antidelete.json');
const TEMP_MEDIA_DIR = path.join(__dirname, '../tmp');

if (!fs.existsSync(TEMP_MEDIA_DIR)) {
    fs.mkdirSync(TEMP_MEDIA_DIR, { recursive: true });
}

// Load config
function loadAntideleteConfig() {
    try {
        if (!fs.existsSync(CONFIG_PATH)) return { enabled: false };
        return JSON.parse(fs.readFileSync(CONFIG_PATH));
    } catch {
        return { enabled: false };
    }
}

// Save config
function saveAntideleteConfig(config) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (err) {}
}

// Store incoming messages
async function storeMessage(sock, message) {
    try {
        const config = loadAntideleteConfig();
        if (!config.enabled) return;
        if (!message.key?.id) return;

        const messageId = message.key.id;
        let content = '';
        let mediaType = '';
        let mediaPath = '';
        let isViewOnce = false;
        const sender = message.key.participant || message.key.remoteJid;
        const remoteJid = message.key.remoteJid;

        const viewOnceContainer = message.message?.viewOnceMessageV2?.message || message.message?.viewOnceMessage?.message;
        if (viewOnceContainer) {
            if (viewOnceContainer.imageMessage) {
                mediaType = 'image';
                content = viewOnceContainer.imageMessage.caption || '';
                const buffer = await downloadContentFromMessage(viewOnceContainer.imageMessage, 'image');
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
                await writeFile(mediaPath, buffer);
                isViewOnce = true;
            } else if (viewOnceContainer.videoMessage) {
                mediaType = 'video';
                content = viewOnceContainer.videoMessage.caption || '';
                const buffer = await downloadContentFromMessage(viewOnceContainer.videoMessage, 'video');
                mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
                await writeFile(mediaPath, buffer);
                isViewOnce = true;
            }
        } else if (message.message?.conversation) {
            content = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            content = message.message.extendedTextMessage.text;
        } else if (message.message?.imageMessage) {
            mediaType = 'image';
            content = message.message.imageMessage.caption || '';
            const buffer = await downloadContentFromMessage(message.message.imageMessage, 'image');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.videoMessage) {
            mediaType = 'video';
            content = message.message.videoMessage.caption || '';
            const buffer = await downloadContentFromMessage(message.message.videoMessage, 'video');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.audioMessage) {
            mediaType = 'audio';
            const buffer = await downloadContentFromMessage(message.message.audioMessage, 'audio');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp3`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.stickerMessage) {
            mediaType = 'sticker';
            const buffer = await downloadContentFromMessage(message.message.stickerMessage, 'sticker');
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.webp`);
            await writeFile(mediaPath, buffer);
        }

        messageStore.set(messageId, {
            content,
            mediaType,
            mediaPath,
            sender,
            remoteJid,
            timestamp: new Date().toISOString()
        });

        // Anti-ViewOnce: Send directly to the same chat where it was sent
        if (isViewOnce && mediaType && fs.existsSync(mediaPath)) {
            try {
                const senderName = sender.split('@')[0];
                const voCaption = `╭━━━〔 *🛡️ SACHIYA-MD VIEW ONCE* 〕━━━\n` +
                                  `┃\n` +
                                  `┃ 📸 *Type:* ${mediaType.toUpperCase()}\n` +
                                  `┃ 👤 *Sender:* @${senderName}\n` +
                                  `┃\n` +
                                  `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                                  `> *⚡ Powered by SACHIYA-MD 💫*`;

                if (mediaType === 'image') {
                    await sock.sendMessage(remoteJid, { image: { url: mediaPath }, caption: voCaption, mentions: [sender] });
                } else if (mediaType === 'video') {
                    await sock.sendMessage(remoteJid, { video: { url: mediaPath }, caption: voCaption, mentions: [sender] });
                }
                try { fs.unlinkSync(mediaPath); } catch {}
            } catch (e) {}
        }

    } catch (err) {
        console.error('storeMessage error:', err);
    }
}

// Handle message deletion (Antidelete in the same chat)
async function handleMessageRevocation(sock, revocationMessage) {
    try {
        const config = loadAntideleteConfig();
        if (!config.enabled) return;

        const messageId = revocationMessage.message.protocolMessage.key.id;
        const deletedBy = revocationMessage.participant || revocationMessage.key.participant || revocationMessage.key.remoteJid;
        const remoteJid = revocationMessage.key.remoteJid;

        if (deletedBy.includes(sock.user.id)) return;

        const original = messageStore.get(messageId);
        if (!original) return;

        const sender = original.sender;
        const senderName = sender.split('@')[0];
        const deleterName = deletedBy.split('@')[0];

        const time = new Date().toLocaleString('en-US', {
            timeZone: 'Asia/Colombo',
            hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit',
            day: '2-digit', month: '2-digit', year: 'numeric'
        });

        let text = `╭━━━〔 *🗑️ SACHIYA-MD ANTIDELETE* 〕━━━\n` +
                   `┃\n` +
                   `┃ ❌ *Deleted By:* @${deleterName}\n` +
                   `┃ 👤 *Sender:* @${senderName}\n` +
                   `┃ 🕒 *Time:* ${time}\n` +
                   `┃\n`;

        if (original.content) {
            text += `┣ *💬 Deleted Message:*\n` +
                    `┃ ${original.content}\n` +
                    `┃\n`;
        }

        text += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `> *⚡ Powered by SACHIYA-MD 💫*`;

        // Send text report to the SAME chat (Group or Inbox)
        await sock.sendMessage(remoteJid, {
            text,
            mentions: [deletedBy, sender]
        });

        // Send media to the SAME chat if available
        if (original.mediaType && fs.existsSync(original.mediaPath)) {
            const mediaCaption = `╭━━━〔 *📁 DELETED ${original.mediaType.toUpperCase()}* 〕━━━\n` +
                                 `┃\n` +
                                 `┃ 👤 *Sender:* @${senderName}\n` +
                                 `┃\n` +
                                 `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                                 `> *⚡ Powered by SACHIYA-MD 💫*`;

            try {
                switch (original.mediaType) {
                    case 'image':
                        await sock.sendMessage(remoteJid, { image: { url: original.mediaPath }, caption: mediaCaption, mentions: [sender] });
                        break;
                    case 'sticker':
                        await sock.sendMessage(remoteJid, { sticker: { url: original.mediaPath } });
                        break;
                    case 'video':
                        await sock.sendMessage(remoteJid, { video: { url: original.mediaPath }, caption: mediaCaption, mentions: [sender] });
                        break;
                    case 'audio':
                        await sock.sendMessage(remoteJid, { audio: { url: original.mediaPath }, mimetype: 'audio/mpeg', ptt: false });
                        break;
                }
            } catch (err) {}

            try { fs.unlinkSync(original.mediaPath); } catch {}
        }

        messageStore.delete(messageId);

    } catch (err) {
        console.error('handleMessageRevocation error:', err);
    }
}

// Command handler for setting up Antidelete
const { commands } = require('../command');
commands.push({
    pattern: 'antidelete',
    alias: ['antidel'],
    desc: 'Enable or disable antidelete system',
    category: 'owner',
    react: '🛡️',
    function: async (sock, mek, m, { q, reply, isOwner }) => {
        if (!isOwner) return reply('⚠️ *මෙම විධානය භාවිතා කළ හැක්කේ බොට් හිමිකරුට (Owner) පමණි!*');

        const config = loadAntideleteConfig();
        if (!q) {
            return reply(
                `╭━━━〔 *✨ SACHIYA-MD ANTIDELETE ✨* 〕━━━\n` +
                `┃\n` +
                `┃ ⚙️ *Current Status:* ${config.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
                `┃\n` +
                `┃ *Available Commands:*\n` +
                `┃ • \`.antidelete on\` - Enable Antidelete 🟢\n` +
                `┃ • \`.antidelete off\` - Disable Antidelete 🔴\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `> *⚡ Powered by SACHIYA-MD 💫*`
            );
        }

        if (q.toLowerCase() === 'on') {
            config.enabled = true;
        } else if (q.toLowerCase() === 'off') {
            config.enabled = false;
        } else {
            return reply('⚠️ *වැරදි විධානයකි! භාවිතය සඳහා .antidelete ලෙස යොදන්න.*');
        }

        saveAntideleteConfig(config);
        return reply(`✨ *Antidelete System successfully ${q.toLowerCase() === 'on' ? 'Enabled 🟢' : 'Disabled 🔴'}!*`);
    }
});

module.exports = {
    storeMessage,
    handleMessageRevocation
};
