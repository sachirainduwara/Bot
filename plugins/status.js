const { downloadContentFromMessage } = require('@whiskeysockets/baileys');
const { writeFile } = require('fs/promises');
const path = require('path');
const fs = require('fs');

const TEMP_DIR = path.join(__dirname, '../tmp');
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

const { commands } = require('../command');

commands.push({
    pattern: 'save',
    alias: ['statusave', 's'],
    desc: 'Download and save WhatsApp status',
    category: 'owner',
    react: '📥',
    function: async (sock, mek, m, { q, reply, quoted, isOwner, senderNumber, from }) => {
        const botNumber = sock.user.id.split(':')[0];
        const isSelfChat = from === sock.user.id || senderNumber === botNumber;

        if (!isOwner && !isSelfChat && !mek.key.fromMe) {
            return reply('⚠️ *මෙම විධානය භාවිතා කළ හැක්කේ බොට් හිමිකරුට පමණි!*');
        }

        if (!quoted) {
            return reply('⚠️ *దయவுකර සේව් කිරීමට අවශ්‍ය ස්ටේටස් එකකට හෝ මැසේජ් එකකට .save ලෙස රිප්ලයි කරන්න!*');
        }

        try {
            let mediaType = '';
            let mediaMessage = null;

            if (quoted.imageMessage) {
                mediaType = 'image';
                mediaMessage = quoted.imageMessage;
            } else if (quoted.videoMessage) {
                mediaType = 'video';
                mediaMessage = quoted.videoMessage;
            } else if (quoted.audioMessage) {
                mediaType = 'audio';
                mediaMessage = quoted.audioMessage;
            } else if (quoted.documentMessage) {
                mediaType = 'document';
                mediaMessage = quoted.documentMessage;
            } else {
                return reply('⚠️ *මෙය සේව් කළ හැකි මාධ්‍ය (Media) අඩංගු ස්ටේටස් එකක් හෝ මැසේජ් එකක් නොවේ!*');
            }

            // Correctly identify target chat for status broadcasts
            let targetChat = quoted.participant || quoted.sender || from;
            if (targetChat === 'status@broadcast') {
                targetChat = quoted.key?.participant || from;
            }

            const timeString = new Date().toLocaleString('en-US', {
                timeZone: 'Asia/Colombo',
                hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
            const dateString = new Date().toLocaleDateString('en-GB', {
                timeZone: 'Asia/Colombo'
            });

            const captionText = `╭━━━〔 *📥 ✅ SACHIYA-MD STATUS* 〕━━━\n` +
                                `┃\n` +
                                `┃ 📥 ✅ *Status Download Success!*\n` +
                                `┃ ⏰ *Time:* ${timeString}\n` +
                                `┃ 📅 *Date:* ${dateString}\n` +
                                `┃\n` +
                                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                                `> *⚡ Powered by SACHIYA-MD 💫*`;

            const stream = await downloadContentFromMessage(mediaMessage, mediaType);
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const ext = mediaType === 'image' ? 'jpg' : mediaType === 'video' ? 'mp4' : mediaType === 'audio' ? 'mp3' : 'bin';
            const filePath = path.join(TEMP_DIR, `status_${Date.now()}.${ext}`);
            await writeFile(filePath, buffer);

            // Send to target inbox with 📥 ✅ indicators
            if (mediaType === 'image') {
                await sock.sendMessage(targetChat, {
                    image: { url: filePath },
                    caption: captionText
                });
            } else if (mediaType === 'video') {
                await sock.sendMessage(targetChat, {
                    video: { url: filePath },
                    caption: captionText
                });
            } else if (mediaType === 'audio') {
                await sock.sendMessage(targetChat, { text: captionText });
                await sock.sendMessage(targetChat, {
                    audio: { url: filePath },
                    mimetype: 'audio/mp4',
                    ptt: false
                });
            }

            // React to user command with check mark
            await sock.sendMessage(from, { react: { text: '✅', key: mek.key } }).catch(() => {});

            // Cleanup temp file
            try { fs.unlinkSync(filePath); } catch {}

        } catch (err) {
            console.error('Status Save Error:', err);
            return reply(`⚠️ *ට්‍රයි කරද්දී දෝෂයක් මතු විය: ${err.message}*`);
        }
    }
});
