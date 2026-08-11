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

function loadAntideleteConfig() {
    try {
        if (!fs.existsSync(CONFIG_PATH)) return { enabled: false };
        return JSON.parse(fs.readFileSync(CONFIG_PATH));
    } catch {
        return { enabled: false };
    }
}

function saveAntideleteConfig(config) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (err) {}
}

// Store incoming messages (Supports Photos, Videos, Audios, Stickers & Text)
async function storeMessage(sock, message) {
    try {
        const config = loadAntideleteConfig();
        if (!config.enabled) return;
        if (!message.key?.id) return;

        const messageId = message.key.id;
        let content = '';
        let mediaType = '';
        let mediaPath = '';
        const sender = message.key.participant || message.key.remoteJid;
        const remoteJid = message.key.remoteJid;

        if (message.message?.conversation) {
            content = message.message.conversation;
        } else if (message.message?.extendedTextMessage?.text) {
            content = message.message.extendedTextMessage.text;
        } else if (message.message?.imageMessage) {
            mediaType = 'image';
            content = message.message.imageMessage.caption || '';
            const stream = await downloadContentFromMessage(message.message.imageMessage, 'image');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.jpg`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.videoMessage) {
            mediaType = 'video';
            content = message.message.videoMessage.caption || '';
            const stream = await downloadContentFromMessage(message.message.videoMessage, 'video');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp4`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.audioMessage) {
            mediaType = 'audio';
            const stream = await downloadContentFromMessage(message.message.audioMessage, 'audio');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            mediaPath = path.join(TEMP_MEDIA_DIR, `${messageId}.mp3`);
            await writeFile(mediaPath, buffer);
        } else if (message.message?.stickerMessage) {
            mediaType = 'sticker';
            const stream = await downloadContentFromMessage(message.message.stickerMessage, 'sticker');
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
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

    } catch (err) {
        console.error('storeMessage error:', err);
    }
}

// Handle message deletion (Antidelete)
async function handleMessageRevocation(sock, revocationMessage) {
    try {
        const config = loadAntideleteConfig();
        if (!config.enabled) return;

        const protocolMsg = revocationMessage.message?.protocolMessage;
        if (!protocolMsg || protocolMsg.type !== 0) return;

        const messageId = protocolMsg.key?.id;
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

        // Send Text Report
        let text = `╭━━━〔 *🗑️ SACHIYA-MD ANTIDELETE* 〕━━━\n` +
                   `┃\n` +
                   `┃ ❌ *Deleted By:* @${deleterName}\n` +
                   `┃ 👤 *Sender:* @${senderName}\n` +
                   `┃ 🕒 *Time & Date:* ${time}\n` +
                   `┃\n`;

        if (original.content) {
            text += `┣ *💬 Deleted Message:*\n` +
                    `┃ ${original.content}\n` +
                    `┃\n`;
        }

        text += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `> *⚡ Powered by SACHIYA-MD 💫*`;

        await sock.sendMessage(remoteJid, {
            text,
            mentions: [deletedBy, sender]
        });

        // Send Media (Photos, Videos, Audios, Stickers) Separately with Clean Captions
        if (original.mediaType && fs.existsSync(original.mediaPath)) {
            const mediaCaption = `╭━━━〔 *📁 DELETED ${original.mediaType.toUpperCase()}* 〕━━━\n` +
                                 `┃\n` +
                                 `┃ 👤 *Sender:* @${senderName}\n` +
                                 `┃ 🕒 *Time:* ${time}\n` +
                                 `┃\n` +
                                 `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                                 `> *⚡ Powered by SACHIYA-MD 💫*`;

            try {
                if (original.mediaType === 'image') {
                    await sock.sendMessage(remoteJid, { 
                        image: { url: original.mediaPath }, 
                        caption: mediaCaption, 
                        mentions: [sender] 
                    });
                } else if (original.mediaType === 'video') {
                    await sock.sendMessage(remoteJid, { 
                        video: { url: original.mediaPath }, 
                        caption: mediaCaption, 
                        mentions: [sender] 
                    });
                } else if (original.mediaType === 'audio') {
                    await sock.sendMessage(remoteJid, { 
                        audio: { url: original.mediaPath }, 
                        mimetype: 'audio/mpeg', 
                        ptt: false 
                    });
                } else if (original.mediaType === 'sticker') {
                    await sock.sendMessage(remoteJid, { 
                        sticker: { url: original.mediaPath } 
                    });
                }
            } catch (err) {
                console.error('Media send error:', err);
            }

            try { fs.unlinkSync(original.mediaPath); } catch {}
        }

        messageStore.delete(messageId);

    } catch (err) {
        console.error('handleMessageRevocation error:', err);
    }
}

// Command handler (.antidelete on/off)
const { commands } = require('../command');
commands.push({
    pattern: 'antidelete',
    alias: ['antidel'],
    desc: 'Enable or disable antidelete system',
    category: 'owner',
    react: '🛡️',
    function: async (sock, mek, m, { q, reply, isOwner, senderNumber, from }) => {
        const botNumber = sock.user.id.split(':')[0];
        const isSelfChat = from === sock.user.id || senderNumber === botNumber;

        if (!isOwner && !isSelfChat && !mek.key.fromMe) {
            return reply('⚠️ *මෙම විධානය භාවිතා කළ හැක්කේ බොට් හිමිකරුට (Owner) පමණි!*');
        }

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
