const { commands } = require('../command');
const fs = require('fs');
const path = require('path');

const blockedFile = path.join(__dirname, '../blocked_chats.json');

// Helper to get blocked chats
function getBlockedChats() {
    try {
        if (fs.existsSync(blockedFile)) {
            const data = fs.readFileSync(blockedFile, 'utf8');
            return JSON.parse(data);
        }
    } catch (e) {}
    return [];
}

// Helper to save blocked chats
function saveBlockedChats(chats) {
    try {
        fs.writeFileSync(blockedFile, JSON.stringify(chats, null, 2));
    } catch (e) {}
}

commands.push({
    pattern: 'block',
    alias: ['blockchat'],
    desc: 'Block bot from responding in this chat or group',
    category: 'owner',
    react: '🚫',
    function: async (sock, mek, m, { reply, isOwner, senderNumber, from }) => {
        const botNumber = sock.user.id.split(':')[0];
        const isSelfChat = from === sock.user.id || senderNumber === botNumber;
        
        if (!isOwner && !isSelfChat && !mek.key.fromMe) {
            return reply('⚠️ *මෙම විධානය භාවිතා කළ හැක්කේ බොට් හිමිකරුට පමණි!*');
        }

        let blocked = getBlockedChats();
        if (blocked.includes(from)) {
            return reply('⚠️ *මෙම චැට් එක / ගෘප් එක දැනටමත් බ්ලොක් කර ඇත!*');
        }

        blocked.push(from);
        saveBlockedChats(blocked);

        return reply('🚫 *මෙම ගෘප් එකට හෝ චැට් එකට බොට්ගේ ක්‍රියාකාරිත්වය සාර්ථකව අත්හිටුවන ලදී (.block කරන ලදී).*');
    }
});
