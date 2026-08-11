const { commands } = require('../command');
const axios = require('axios');
const cheerio = require('cheerio');

const movieSessions = new Map();

// Search movies from Baiscope.lk
async function searchBaiscope(query) {
    try {
        const url = `https://www.baiscope.lk/?s=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        let results = [];

        $('.elementor-post').each((i, el) => {
            if (i < 5) {
                const title = $(el).find('.elementor-post__title a').text().trim();
                const link = $(el).find('.elementor-post__title a').attr('href');
                const img = $(el).find('.elementor-post__thumbnail img').attr('src') || $(el).find('img').attr('src');
                if (title && link) {
                    results.push({ title, link, img: img || 'https://i.imgur.com/Jo9x02a.jpeg' });
                }
            }
        });
        return results;
    } catch (e) {
        return [];
    }
}

// Scrape download links from the specific movie page
async function getMovieDownloadLinks(movieUrl) {
    try {
        const { data } = await axios.get(movieUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(data);
        let links = { p480: '', p720: '' };

        $('a').each((i, el) => {
            const text = $(el).text().toLowerCase();
            const href = $(el).attr('href');
            if (href && (href.includes('pixeldrain') || href.includes('megaup') || href.includes('gdrive') || href.includes('download'))) {
                if (text.includes('480p') || text.includes('direct download 480')) {
                    links.p480 = href;
                } else if (text.includes('720p') || text.includes('direct download 720')) {
                    links.p720 = href;
                }
            }
        });

        if (!links.p480 && !links.p720) {
            $('a').each((i, el) => {
                const href = $(el).attr('href');
                if (href && (href.includes('pixeldrain.com/u/') || href.includes('megaup.net'))) {
                    if (!links.p480) links.p480 = href;
                    else if (!links.p720) links.p720 = href;
                }
            });
        }

        return links;
    } catch (e) {
        return { p480: '', p720: '' };
    }
}

// 1. Search Command (.movie <name>)
commands.push({
    pattern: 'movie',
    alias: ['film', 'sinhalasub'],
    desc: 'Search movies with Sinhala subtitles',
    category: 'download',
    react: '🎬',
    function: async (sock, mek, m, { q, reply, from }) => {
        if (!q) {
            return reply('⚠️ *භාවිතා කරන ආකාරය: .movie <film name> (උදා: .movie Avatar)*');
        }

        await reply('🔍 *චිත්‍රපටය සොයමින් පවතී, කරුණාකර මොහොතක් රැඳී සිටින්න...*');
        const movies = await searchBaiscope(q);

        if (!movies || movies.length === 0) {
            return reply('⚠️ *අදාළ නමින් සිංහල උපසිරැසි සහිත චිත්‍රපටයක් හමු නොවීය!*');
        }

        let txt = `╭━━━〔 *🎬 MOVIE SEARCH RESULTS* 〕━━━\n` +
                  `┃\n` +
                  `┃ *පහත දැක්වෙන චිත්‍රපට හමු විය:*\n` +
                  `┃\n`;

        movies.forEach((movie, index) => {
            txt += `┃ *[ ${index + 1} ]* ${movie.title}\n`;
        });

        txt += `┃\n` +
               `┃ 📌 *අවශ්‍ය චිත්‍රපටයේ අංකය (1, 2, 3...) පමණක් මෙම චැට් එකට එවන්න!*\n` +
               `┃\n` +
               `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
               `> *⚡ Powered by SACHIYA-MD 💫*`;

        movieSessions.set(from, { movies, step: 'SELECT_MOVIE' });
        return sock.sendMessage(from, { text: txt }, { quoted: mek });
    }
});

// 2. Message Interceptor for Number Selection & Quality Buttons
const { commands: globalCmds } = require('../command');
// We attach handler to message upsert via command file export or index integration, 
// To make it seamless, ensure your index passes messages or handles plugin functions.
