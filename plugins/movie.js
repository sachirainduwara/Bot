const { cmd } = require('../command');
const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://sinhalasub.lk/'
};

async function searchMovies(query) {
    try {
        const searchUrl = `https://sinhalasub.lk/?s=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, { headers: HEADERS, timeout: 20000 });
        const $ = cheerio.load(data);
        const results = [];

        // Comprehensive selectors for WordPress movie themes
        const selectors = [
            '.result-item', 
            'article.item', 
            '.items.normal article', 
            '.search-page .item',
            'div.result-item',
            '.animation-2.item'
        ];

        for (const selector of selectors) {
            $(selector).each((index, element) => {
                if (results.length >= 5) return;
                
                const titleEl = $(element).find('.title a, h3 a, .details h3 a, a.lnk-co');
                const title = titleEl.text().trim() || $(element).find('h3, .title').text().trim();
                const link = titleEl.attr('href') || $(element).find('a').attr('href');
                const image = $(element).find('img').attr('data-src') || $(element).find('img').attr('src');
                const year = $(element).find('.year, .meta span, span.year').text().trim() || 'N/A';

                if (title && link && !results.some(r => r.link === link)) {
                    results.push({ title, link, image, year });
                }
            });
            if (results.length > 0) break;
        }

        // Fallback: search all anchor tags if structured selectors miss
        if (results.length === 0) {
            $('a').each((i, el) => {
                if (results.length >= 5) return;
                const href = $(el).attr('href');
                const text = $(el).text().trim();
                if (href && href.includes('/movie/') && text.length > 3) {
                    if (!results.some(r => r.link === href)) {
                        results.push({ title: text, link: href, image: '', year: 'N/A' });
                    }
                }
            });
        }

        return results;
    } catch (error) {
        console.error('Search Error:', error.message);
        return [];
    }
}

async function getMovieDetails(movieUrl) {
    try {
        const { data } = await axios.get(movieUrl, { headers: HEADERS, timeout: 20000 });
        const $ = cheerio.load(data);
        
        const title = $('h1.entry-title, h1.title, .sheader h1').text().trim();
        const poster = $('.poster img, .sheader .poster img, .thumb img').attr('src');
        const synopsis = $('.wp-content p, .desc p, .wp-synopsis p').first().text().trim() || 'No description available.';
        
        const downloadLinks = [];
        $('table tr, .links_table tr, .download-links a, .s_dl a, .m-b-5 a').each((i, el) => {
            const quality = $(el).find('td').first().text().trim() || $(el).text().trim() || 'Download Link';
            const link = $(el).find('a').attr('href') || $(el).attr('href');
            
            if (link && link.startsWith('http') && !link.includes('sinhalasub.lk')) {
                downloadLinks.push({ quality, link });
            }
        });

        return { title, poster, synopsis, downloadLinks };
    } catch (error) {
        console.error('Details Error:', error.message);
        return null;
    }
}

cmd({
    pattern: "movie",
    alias: ["sinhalasub", "mv", "film"],
    desc: "Search and download movies from Sinhalasub.lk",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (sachiya, mek, m, { from, q, reply }) => {
    try {
        if (!q) {
            return reply("❌ *Please provide a movie name!*\n\n*Example:* `.movie Avatar` or `.movie Interstellar`");
        }

        await sachiya.sendMessage(from, { react: { text: "🔍", key: mek.key } }).catch(() => {});
        await reply("🔍 *Searching for movies on Sinhalasub, please wait...*");

        const movies = await searchMovies(q);
        if (!movies || movies.length === 0) {
            await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
            return reply("❌ *No movies found matching your query on Sinhalasub!*");
        }

        let listText = `╭━━━〔 *SINHALASUB SEARCH* 〕━━━\n` +
                       `┃\n` +
                       `┃ 🔎 *Query:* ${q}\n` +
                       `┃ 🔢 *Results Found:* ${movies.length}\n` +
                       `┃\n` +
                       `┣━━━〔 *SELECT A MOVIE* 〕━━━\n`;

        movies.forEach((movie, index) => {
            listText += `┃\n` +
                        `┃ *${index + 1}️⃣* *${movie.title}* (${movie.year})\n`;
        });

        listText += `┃\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `> 💬 *Please reply with the number (1-${movies.length}) of your choice!*`;

        const sentMsg = await sachiya.sendMessage(from, { text: listText }, { quoted: mek });
        await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});

        const searchListener = async (chatUpdate) => {
            try {
                const msg = chatUpdate.messages[0];
                if (!msg || !msg.message) return;
                
                const msgSender = msg.key.remoteJid;
                const isReplyToBot = msg.message.extendedTextMessage && 
                                   msg.message.extendedTextMessage.contextInfo && 
                                   msg.message.extendedTextMessage.contextInfo.stanzaId === sentMsg.key.id;

                if (msgSender === from && isReplyToBot) {
                    const choiceText = (msg.message.conversation || msg.message.extendedTextMessage.text || "").trim();
                    const choiceIndex = parseInt(choiceText) - 1;

                    if (isNaN(choiceIndex) || choiceIndex < 0 || choiceIndex >= movies.length) {
                        return;
                    }

                    sachiya.ev.off("messages.upsert", searchListener);

                    const selectedMovie = movies[choiceIndex];
                    await sachiya.sendMessage(from, { react: { text: "⏳", key: msg.key } }).catch(() => {});
                    await reply(`📥 *Fetching details for:* *${selectedMovie.title}*...`);

                    const details = await getMovieDetails(selectedMovie.link);
                    if (!details) {
                        return reply("❌ *Failed to fetch movie details. Try another movie.*");
                    }

                    let dlText = `╭━━━〔 *${selectedMovie.title}* 〕━━━\n` +
                                 `┃\n` +
                                 `┃ 📝 *Synopsis:* ${details.synopsis.substring(0, 140)}...\n` +
                                 `┃\n` +
                                 `┣━━━〔 *DOWNLOAD LINKS* 〕━━━\n`;

                    if (details.downloadLinks.length === 0) {
                        dlText += `┃ 🔗 *Direct Link:* ${selectedMovie.link}\n`;
                    } else {
                        details.downloadLinks.slice(0, 5).forEach((dl, idx) => {
                            dlText += `┃ *${idx + 1}️⃣* ${dl.quality}: ${dl.link}\n`;
                        });
                    }

                    dlText += `┃\n` +
                              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                              `> ⚡ *Powered by SACHIYA-MD*`;

                    const posterImg = details.poster || selectedMovie.image;
                    if (posterImg) {
                        await sachiya.sendMessage(from, { image: { url: posterImg }, caption: dlText }, { quoted: msg });
                    } else {
                        await reply(dlText);
                    }

                    await sachiya.sendMessage(from, { react: { text: "🎉", key: msg.key } }).catch(() => {});
                }
            } catch (err) {
                console.log("Selection Listener Error:", err);
            }
        };

        sachiya.ev.on("messages.upsert", searchListener);
        setTimeout(() => {
            sachiya.ev.off("messages.upsert", searchListener);
        }, 120000);

    } catch (error) {
        console.error('[MOVIE PLUGIN ERROR]:', error);
        reply("❌ *An error occurred while processing your request. Please try again later.*");
    }
});
