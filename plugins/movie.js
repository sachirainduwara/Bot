const { commands } = require('../command');
const axios = require('axios');

const movieSessions = new Map();

// Search movies using a reliable public movie database API
async function searchMoviesApi(query) {
    try {
        const url = `https://api.themoviedb.org/3/search/movie?api_key=2d61a711e9a2fa562ab2b6b6e8284e3d&query=${encodeURIComponent(query)}`;
        const res = await axios.get(url);
        const results = res.data.results;
        
        let movies = [];
        if (results && results.length > 0) {
            results.slice(0, 5).forEach(movie => {
                const year = movie.release_date ? movie.release_date.split('-')[0] : '';
                movies.push({
                    title: `${movie.title} ${year ? '(' + year + ')' : ''}`,
                    overview: movie.overview || 'No description available.',
                    rating: movie.vote_average || 'N/A',
                    img: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://i.imgur.com/Jo9x02a.jpeg',
                    releaseDate: movie.release_date || 'Unknown'
                });
            });
        }
        return movies;
    } catch (e) {
        return [];
    }
}

// 1. Search Command (.movie <name>)
commands.push({
    pattern: 'movie',
    alias: ['film', 'sinhalasub'],
    desc: 'Search movies and details',
    category: 'download',
    react: '🎬',
    function: async (sock, mek, m, { q, reply, from }) => {
        if (!q) {
            return reply('⚠️ *භාවිතා කරන ආකාරය: .movie <film name> (උදා: .movie Avatar)*');
        }

        await reply('🔍 *චිත්‍රපටය දත්ත පද්ධතියෙන් සොයමින් පවතී, කරුණාකර මොහොතක් රැඳී සිටින්න...*');
        const movies = await searchMoviesApi(q);

        if (!movies || movies.length === 0) {
            return reply('⚠️ *අදාළ නමින් චිත්‍රපටයක් හමු නොවීය! කරුණාකර නම නිවැරදිව පරීක්ෂා කර නැවත උත්සාහ කරන්න.*');
        }

        let txt = `╭━━━〔 *🎬 MOVIE SEARCH RESULTS* 〕━━━\n` +
                  `┃\n` +
                  `┃ *පහත දැක්වෙන චිත්‍රපට හමු විය:*\n` +
                  `┃\n`;

        movies.forEach((movie, index) => {
            txt += `┃ *[ ${index + 1} ]* ${movie.title}\n`;
        });

        txt += `┃\n` +
               `┃ 📌 *විස්තර සහ ඩවුන්ලෝඩ් ලින්ක් බැලීමට අවශ්‍ය චිත්‍රපටයේ අංකය (1, 2, 3...) පමණක් මෙම චැට් එකට එවන්න!*\n` +
               `┃\n` +
               `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
               `> *⚡ Powered by SACHIYA-MD 💫*`;

        movieSessions.set(from, { movies, step: 'SELECT_MOVIE' });
        return sock.sendMessage(from, { text: txt }, { quoted: mek });
    }
});

// 2. Handle Number Selection (Listener for selection)
const { commands: globalCmds } = require('../command');
globalCmds.push({
    pattern: 'handle_movie_number',
    dontAddCommandList: true,
    function: async () => {}
});

// Message listener hook to handle number input when user sends 1, 2, 3...
const originalUpsertHandler = global.handleMovieSelection || null;
global.handleMovieSelection = async (sock, mek, from, body) => {
    const session = movieSessions.get(from);
    if (!session || session.step !== 'SELECT_MOVIE') return false;

    const choice = parseInt(body.trim());
    if (isNaN(choice) || choice < 1 || choice > session.movies.length) {
        return false;
    }

    const selectedMovie = session.movies[choice - 1];
    movieSessions.delete(from);

    const msg = `╭━━━〔 *🎬 MOVIE DETAILS* 〕━━━\n` +
                `┃\n` +
                `┃ 📌 *Title:* ${selectedMovie.title}\n` +
                `┃ 📅 *Release Date:* ${selectedMovie.releaseDate}\n` +
                `┃ ⭐ *Rating:* ${selectedMovie.rating} / 10\n` +
                `┃\n` +
                `┃ 📝 *Description:*\n` +
                `┃ ${selectedMovie.overview}\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `> *⚡ Powered by SACHIYA-MD 💫*`;

    await sock.sendMessage(from, { 
        image: { url: selectedMovie.img }, 
        caption: msg 
    }, { quoted: mek });

    return true;
};
