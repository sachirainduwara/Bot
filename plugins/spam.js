const { commands } = require('../command');

commands.push({
    pattern: 'spam',
    alias: ['spammsg'],
    desc: 'Spam a message a specific number of times without limits',
    category: 'owner',
    react: '🚀',
    function: async (sock, mek, m, { q, reply, isOwner, senderNumber, from }) => {
        // Allow command execution if owner or self chat
        const botNumber = sock.user.id.split(':')[0];
        const isSelfChat = from === sock.user.id || senderNumber === botNumber;

        if (!isOwner && !isSelfChat && !mek.key.fromMe) {
            return reply('⚠️ *මෙම විධානය භාවිතා කළ හැක්කේ බොට් හිමිකරුට (Owner) පමණි!*');
        }

        if (!q) {
            return reply(
                `╭━━━〔 *✨ SACHIYA-MD SPAM COMMAND ✨* 〕━━━\n` +
                `┃\n` +
                `┃ ⚠️ *භාවිතා කරන ආකාරය:*\n` +
                `┃ \`.spam <message> <count>\`\n` +
                `┃ *උදාහරණයක්:* \`.spam Hello 100\`\n` +
                `┃\n` +
                `┃ 📌 *සීමාවන් නොමැත (Unlimited)*\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `> *⚡ Powered by SACHIYA-MD 💫*`
            );
        }

        // Split arguments to get message and count
        const args = q.trim().split(' ');
        const countStr = args[args.length - 1];
        const count = parseInt(countStr);

        // Validate if count is a valid number
        if (isNaN(count) || count <= 0) {
            return reply('⚠️ *කරුණාකර නිවැරදි සංඛ්‍යාවක් (Count එකක්) අගට යොදන්න! (උදා: .spam Hi 50)*');
        }

        // Extract message by removing the last element (count)
        args.pop();
        const spamMessage = args.join(' ');

        if (!spamMessage) {
            return reply('⚠️ *කරුණාකර යැවිය යුතු මැසේජ් එකක් ඇතුළත් කරන්න!*');
        }

        try {
            // Delete the command message to keep chat clean (optional)
            await sock.sendMessage(from, { react: { text: '⏳', key: mek.key } }).catch(() => {});

            // Loop and send messages according to count without any limit
            for (let i = 0; i < count; i++) {
                await sock.sendMessage(from, { text: spamMessage });
                // Small delay to prevent rate-limiting or flooding blocks
                await new Promise(resolve => setTimeout(resolve, 300));
            }

            // Success reaction
            await sock.sendMessage(from, { react: { text: '✅', key: mek.key } }).catch(() => {});

        } catch (err) {
            console.error('Spam Command Error:', err);
            return reply(`⚠️ *ස්පෑම් ක්‍රියාත්මක කිරීමේදී දෝෂයක් මතු විය: ${err.message}*`);
        }
    }
});
