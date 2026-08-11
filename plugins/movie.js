const { commands } = require('../command');
const axios = require('axios');

const API_KEY = 'zanta_WdA26szT535TnL0TeeL0g6o9';

commands.push({
    pattern: 'movie',
    alias: ['film', 'sinhalasub', 'dl'],
    desc: 'Search and download Sinhala Sub movies by name',
    category: 'download',
    react: '🎬',
    function: async (sock, mek, m, { q, reply, from }) => {
        if (!q) {
            return reply(
                `╭━━━〔 *🎬 SINHALA SUB MOVIE SEARCH* 〕━━━\n` +
                `┃\n` +
                `┃ ⚠️ *භාවිතා කරන ආකාරය:*\n` +
                `┃ \`.movie <film name>\`\n` +
                `┃ \n` +
                `┃ *උදාහරණයක්:*\n` +
                `┃ \`.movie Leo\`\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `> *⚡ Powered by SACHIYA-MD 💫*`
            );
        }

        await reply('🔍 *චිත්‍රපටය සොයමින් පවතී, කරුණාකර මොහොතක් රැඳී සිටින්න...*');

        try {
            // Using Zanta API search or dl endpoint with text query
            const apiUrl = `https://api.zanta-mini.store/api/sinhalasub/dl?apiKey=${API_KEY}&text=${encodeURIComponent(q)}`;
            const res = await axios.get(apiUrl);
            const data = res.data.result || res.data.data || res.data;

            if (!data) {
                return reply('⚠️ *අදාළ නමින් චිත්‍රපටයක් හමු නොවීය! කරුණාකර නම නිවැරදිව ලියා නැවත උත්සාහ කරන්න.*');
            }

            const title = data.title || data.name || q;
            const image = data.image || data.img || 'https://i.imgur.com/Jo9x02a.jpeg';
            const desc = data.description || data.desc || 'සිංහල උපසිරැසි සමඟ පහත ලින්ක් හරහා ඩවුන්ලෝඩ් කරගන්න.';
            
            let linksText = '';
            if (data.dl_links || data.links) {
                const links = data.dl_links || data.links;
                if (typeof links === 'object') {
                    for (const [quality, link] of Object.entries(links)) {
                        linksText += `┃ 📥 *${quality.toUpperCase()}:* ${link}\n`;
                    }
                } else if (typeof links === 'string') {
                    linksText += `┃ 📥 *Download Link:* ${links}\n`;
                }
            }

            const msg = `╭━━━〔 *🎬 MOVIE DETAILS* 〕━━━\n` +
                        `┃\n` +
                        `┃ 📌 *Title:* ${title}\n` +
                        `┃\n` +
                        `┃ 📝 *Description:*\n` +
                        `┃ ${desc.substring(0, 250)}...\n` +
                        `┃\n` +
                        `${linksText ? linksText + '┃\n' : ''}` +
                        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `> *⚡ Powered by SACHIYA-MD 💫*`;

            await sock.sendMessage(from, { 
                image: { url: image }, 
                caption: msg 
            }, { quoted: mek });

        } catch (e) {
            return reply('⚠️ *චිත්‍රපටය සෙවීමේදී දෝෂයක් මතු විය! කරුණාකර වෙනත් නමකින් උත්සාහ කරන්න.*');
        }
    }
});
