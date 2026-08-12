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
    pattern: 'unblock',
    alias: ['unblockchat'],
    desc: 'Unblock bot to respond in this chat or group',
    category: 'owner',
    react: '✅',
    function: async (sock, mek, m, { reply, isOwner, senderNumber, from }) => {
        const botNumber = sock.user.id.split(':')[0];
        const isSelfChat = from === sock.user.id || senderNumber === botNumber;
        
        if (!isOwner && !isSelfChat && !mek.key.fromMe) {
            return reply('⚠️ *මෙම විධානය භාවිතා කළ හැක්කේ බොට් හිමිකරුට පමණි!*');
        }

        let blocked = getBlockedChats();
        if (!blocked.includes(from)) {
            return reply('⚠️ *මෙම චැට් එක බ්ලොක් කර නොමැත!*');
        }

        blocked = blocked.filter(item => item !== from);
        saveBlockedChats(blocked);

        return reply('✅ *මෙම ගෘප් එකට හෝ චැට් එකට බොට් නැවත සක්‍රීය කරන ලදී (.unblock කරන ලදී).*');
    }
});
