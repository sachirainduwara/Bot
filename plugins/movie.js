const { commands } = require('../command');
const axios = require('axios');

const movieSessions = new Map();

// Search and get details via Zanta Mini API
async function searchSinhalasubApi(query) {
    try {
        const searchUrl = `https://api.zanta-mini.store/api/sinhalasub/search?apiKey=zanta_WdA26szT535TnL0TeeL0g6o9&text=${encodeURIComponent(query)}`;
        const res = await axios.get(searchUrl);
        
        // Check API response structure (array or data object)
        const results = res.data.result || res.data.data || res.data;
        if (Array.isArray(results) && results.length > 0) {
            return results.slice(0, 5); // Top 5 results
        }
        return [];
    } catch (e) {
        return [];
    }
}

// Get specific movie details/links using the API
async function getMovieDetailsApi(movieLink) {
    try {
        const dlUrl = `https://api.zanta-mini.store/api/sinhalasub/dl?apiKey=zanta_WdA26szT535TnL0TeeL0g6o9&text=${encodeURIComponent(movieLink)}`;
        const res = await axios.get(dlUrl);
        return res.data.result || res.data.data || res.data;
    } catch (e) {
        return null;
    }
}

// 1. Search Command (.movie <name>)
commands.push({
    pattern: 'movie',
    alias: ['film', 'sinhalasub'],
    desc: 'Search movies with Sinhala subtitles using Zanta API',
    category: 'download',
    react: '🎬',
    function: async (sock, mek, m, { q, reply, from }) => {
        if (!q) {
            return reply('⚠️ *භාවිතා කරන ආකාරය: .movie <film name> (උදා: .movie Avatar)*');
        }

        await reply('🔍 *චිත්‍රපටය සිංහල සබ් API එකෙන් සොයමින් පවතී, කරුණාකර මොහොතක් රැඳී සිටින්න...*');
        const movies = await searchSinhalasubApi(q);

        if (!movies || movies.length === 0) {
            return reply('⚠️ *අදාළ නමින් සිංහල උපසිරැසි සහිත චිත්‍රපටයක් හමු නොවීය! කරුණාකර නම නිවැරදිව ලියා නැවත උත්සාහ කරන්න.*');
        }

        let txt = `╭━━━〔 *🎬 SINHALA SUB MOVIES* 〕━━━\n` +
                  `┃\n` +
                  `┃ *පහත දැක්වෙන චිත්‍රපට හමු විය:*\n` +
                  `┃\n`;

        movies.forEach((movie, index) => {
            const title = movie.title || movie.name || 'Unknown Movie';
            txt += `┃ *[ ${index + 1} ]* ${title}\n`;
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

// 2. Message Interceptor for Number Selection (Handles user input 1, 2, 3...)
const { commands: globalCmds } = require('../command');
globalCmds.push({
    pattern: 'handle_movie_number_api',
    dontAddCommandList: true,
    function: async () => {}
});

// Global hook to process number selections seamlessly
global.handleMovieSelection = async (sock, mek, from, body) => {
    const session = movieSessions.get(from);
    if (!session || session.step !== 'SELECT_MOVIE') return false;

    const choice = parseInt(body.trim());
    if (isNaN(choice) || choice < 1 || choice > session.movies.length) {
        return false;
    }

    const selectedMovie = session.movies[choice - 1];
    movieSessions.delete(from);

    await sock.sendMessage(from, { text: '⏳ *චිත්‍රපටයේ විස්තර සහ දත්ත ලබාගනිමින් පවතී...*' }, { quoted: mek });

    const movieLink = selectedMovie.link || selectedMovie.url;
    const details = movieLink ? await getMovieDetailsApi(movieLink) : selectedMovie;

    const title = details?.title || selectedMovie.title || 'Sinhala Sub Movie';
    const image = details?.image || details?.img || selectedMovie.image || selectedMovie.img || 'https://i.imgur.com/Jo9x02a.jpeg';
    const description = details?.description || details?.desc || selectedMovie.description || 'සිංහල උපසිරැසි සමඟ නරඹන්න.';

    const msg = `╭━━━〔 *🎬 MOVIE DETAILS* 〕━━━\n` +
                `┃\n` +
                `┃ 📌 *Title:* ${title}\n` +
                `┃\n` +
                `┃ 📝 *Description:*\n` +
                `┃ ${description.substring(0, 300)}...\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `> *⚡ Powered by SACHIYA-MD 💫*`;

    await sock.sendMessage(from, { 
        image: { url: image }, 
        caption: msg 
    }, { quoted: mek });

    return true;
};
