const { commands } = require('../command');
const axios = require('axios');
const cheerio = require('cheerio');

const movieSessions = new Map();

// Search movies from Cinesubz.lk
async function searchCinesubz(query) {
    try {
        const url = `https://cinesubz.lk/?s=${encodeURIComponent(query)}`;
        const { data } = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        const $ = cheerio.load(data);
        let results = [];

        $('.result-item').each((i, el) => {
            if (i < 5) {
                const title = $(el).find('.details .title a').text().trim();
                const link = $(el).find('.details .title a').attr('href');
                const img = $(el).find('.image img').attr('src') || $(el).find('img').attr('src');
                const year = $(el).find('.details .meta .year').text().trim() || '';
                
                if (title && link) {
                    results.push({ 
                        title: `${title} ${year ? '(' + year + ')' : ''}`, 
                        link, 
                        img: img || 'https://i.imgur.com/Jo9x02a.jpeg' 
                    });
                }
            }
        });

        // Alternative layout fallback selector if .result-item is not matched
        if (results.length === 0) {
            $('article').each((i, el) => {
                if (i < 5) {
                    const title = $(el).find('h2 a, h3 a').text().trim();
                    const link = $(el).find('h2 a, h3 a').attr('href');
                    const img = $(el).find('img').attr('src');
                    if (title && link) {
                        results.push({ title, link, img: img || 'https://i.imgur.com/Jo9x02a.jpeg' });
                    }
                }
            });
        }

        return results;
    } catch (e) {
        return [];
    }
}

// Scrape download page info
async function getMovieDetails(movieUrl) {
    try {
        const { data } = await axios.get(movieUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } });
        const $ = cheerio.load(data);
        
        let title = $('h1.entry-title').text().trim() || 'Sinhala Sub Movie';
        let img = $('.poster img').attr('src') || $('.entry-content img').attr('src') || 'https://i.imgur.com/Jo9x02a.jpeg';
        let links = { p480: '', p720: '' };

        $('a').each((i, el) => {
            const text = $(el).text().toLowerCase();
            const href = $(el).attr('href');
            if (href && (href.includes('pixeldrain') || href.includes('megaup') || href.includes('gdrive') || href.includes('download') || href.includes('1drv'))) {
                if (text.includes('480p') || text.includes('zip 480')) {
                    links.p480 = href;
                } else if (text.includes('720p') || text.includes('zip 720')) {
                    links.p720 = href;
                }
            }
        });

        return { title, img, links };
    } catch (e) {
        return { title: 'Movie', img: 'https://i.imgur.com/Jo9x02a.jpeg', links: { p480: '', p720: '' } };
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

        await reply('🔍 *චිත්‍රපටය Cinesubz වෙතින් සොයමින් පවතී, කරුණාකර මොහොතක් රැඳී සිටින්න...*');
        const movies = await searchCinesubz(q);

        if (!movies || movies.length === 0) {
            return reply('⚠️ *අදාළ නමින් සිංහල උපසිරැසි සහිත චිත්‍රපටයක් හමු නොවීය! කරුණාකර නම නිවැරදිව පරීක්ෂා කරන්න.*');
        }

        let txt = `╭━━━〔 *🎬 CINESUBZ MOVIE SEARCH* 〕━━━\n` +
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
