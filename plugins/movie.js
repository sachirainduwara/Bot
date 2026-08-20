const { cmd } = require('../command');
const axios = require('axios');
const cheerio = require('cheerio');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://sinhalasub.lk/'
};

async function searchMovies(query) {
    try {
        const searchUrl = `https://sinhalasub.lk/?s=${encodeURIComponent(query)}`;
        const { data } = await axios.get(searchUrl, { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);
        const results = [];

        // Parsing search items based on typical WordPress movie theme structure
        $('.items.normal article, .search-page .item, .result-item').each((index, element) => {
            if (results.length >= 5) return; // Limit to top 5 results
            
            const title = $(element).find('.title a, h3 a, .details h3').text().trim();
            const link = $(element).find('.title a, h3 a, .details h3').attr('href');
            const image = $(element).find('img').attr('data-src') || $(element).find('img').attr('src');
            const year = $(element).find('.year, .meta span').text().trim() || 'N/A';

            if (title && link) {
                results.push({ title, link, image, year });
            }
        });

        return results;
    } catch (error) {
        console.error('Search Error:', error.message);
        return [];
    }
}

async function getMovieDetails(movieUrl) {
    try {
        const { data } = await axios.get(movieUrl, { headers: HEADERS, timeout: 15000 });
        const $ = cheerio.load(data);
        
        const title = $('h1.entry-title, h1.title').text().trim();
        const poster = $('.poster img, .sheader .poster img').attr('src');
        const synopsis = $('.wp-content p, .desc p').first().text().trim() || 'No description available.';
        
        const downloadLinks = [];
        // Extracting download links from tables or download buttons
        $('.links_table tr, .download-links a, .s_dl a').each((i, el) => {
            const quality = $(el).find('td').first().text().trim() || $(el).text().trim() || 'HD Link';
            const link = $(el).find('a').attr('href') || $(el).attr('href');
            
            if (link && (link.includes('http') && !link.includes('sinhalasub.lk'))) {
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

        await reply("🔍 *Searching for movies on Sinhalasub, please wait...*");

        const movies = await searchMovies(q);
        if (!movies || movies.length === 0) {
            return reply("❌ *No movies found matching your query on Sinhalasub!*");
        }

        // Build Search Results List UI
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

        // Message Listener for Movie Selection
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

                    // Remove search listener
                    sachiya.ev.off("messages.upsert", searchListener);

                    const selectedMovie = movies[choiceIndex];
                    await sachiya.sendMessage(from, { react: { text: "⏳", key: msg.key } }).catch(() => {});
                    await reply(`📥 *Fetching details for:* *${selectedMovie.title}*...`);

                    const details = await getMovieDetails(selectedMovie.link);
                    if (!details) {
                        return reply("❌ *Failed to fetch movie details or download links. Try another movie.*");
                    }

                    // Build Download Options UI
                    let dlText = `╭━━━〔 *${selectedMovie.title}* 〕━━━\n` +
                                 `┃\n` +
                                 `┃ 📝 *Synopsis:* ${details.synopsis.substring(0, 150)}...\n` +
                                 `┃\n` +
                                 `┣━━━〔 *DOWNLOAD LINKS* 〕━━━\n`;

                    if (details.downloadLinks.length === 0) {
                        dlText += `┃ ⚠️ *Direct links are protected or unavailable.* \n` +
                                  `┃ 🔗 *Visit Site:* ${selectedMovie.link}\n`;
                    } else {
                        details.downloadLinks.slice(options = 4).forEach((dl, idx) => {
                            dlText += `┃ *${idx + 1}️⃣* ${dl.quality}\n`;
                        });
                    }

                    dlText += `┃\n` +
                              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                              `> ⚡ *Powered by SACHIYA-MD*`;

                    const posterImg = details.poster || selectedMovie.image;
                    let dlMsg;
                    if (posterImg) {
                        dlMsg = await sachiya.sendMessage(from, { image: { url: posterImg }, caption: dlText }, { quoted: msg });
                    } else {
                        dlMsg = await reply(dlText);
                    }

                    // If download links are found, you can add a secondary listener here for link choice or send direct links.
                    // For safety and fast delivery, we can also provide the direct page link if table parsing is restricted.
                    if (details.downloadLinks.length > 0) {
                        let directLinksSummary = `🎬 *Direct Download Link(s) found:*\n\n`;
                        details.downloadLinks.forEach((d, i) => {
                            directLinksSummary += `*${i+1}. ${d.quality}:* ${d.link}\n`;
                        });
                        await reply(directLinksSummary);
                    }

                }
            } catch (err) {
                console.log("Selection Listener Error:", err);
            }
        };

        sachiya.ev.on("messages.upsert", searchListener);
        setTimeout(() => {
            sachiya.ev.off("messages.upsert", searchListener);
        }, 120000); // 2 minutes timeout

    } catch (error) {
        console.error('[MOVIE PLUGIN ERROR]:', error);
        reply("❌ *An error occurred while processing your request. Please try again later.*");
    }
});
