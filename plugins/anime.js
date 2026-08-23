const { cmd } = require("../command");
const fetch = require("node-fetch");

async function getJSON(url) {
  try {
    const res = await fetch(url);
    return res.ok ? await res.json() : null;
  } catch (e) {
    console.error("API Fetch Error:", e);
    return null;
  }
}

const waifuEndpoints = {
  waifu: "https://api.waifu.pics/sfw/waifu",
  husbando: "https://api.waifu.pics/sfw/husbando",
  neko: "https://api.waifu.pics/sfw/neko",
  animegirl: "https://api.waifu.pics/sfw/waifu",
  animeboy: "https://api.waifu.pics/sfw/waifu",
  kitsune: "https://api.waifu.pics/sfw/kitsune",
  hentaigif: "https://api.waifu.pics/nsfw/waifu",
  hentai: "https://api.waifu.pics/nsfw/neko"
};

for (const [cmdName, url] of Object.entries(waifuEndpoints)) {
  cmd(
    {
      pattern: cmdName,
      react: "🎴",
      desc: `Send a random ${cmdName} image`,
      category: "anime",
      filename: __filename
    },
    async (sachiya, mek, m, { from, reply }) => {
      const data = await getJSON(url);
      if (!data || !data.url) return reply("*❌ Failed to fetch image from server!* ⚠️");
      await sachiya.sendMessage(
        from,
        { 
          image: { url: data.url }, 
          caption: `╭━━━〔 *✨ SACHIYA-MD ANIME ✨* 〕━━━\n` +
                   `┃\n` +
                   `┃ 🎴 *Type:* ${cmdName.toUpperCase()}\n` +
                   `┃\n` +
                   `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                   `> *⚡ Powered by SACHIYA-MD 💫*` 
        },
        { quoted: mek }
      );
    }
  );
}

cmd(
  {
    pattern: "anime",
    react: "📺",
    desc: "Search anime details",
    category: "anime",
    filename: __filename
  },
  async (sachiya, mek, m, { from, q, reply }) => {
    if (!q) return reply("*❌ Please provide an anime name! Example:* `.anime Naruto` 🔍");
    const data = await getJSON(`https://api.jikan.moe/v4/anime?q=${encodeURIComponent(q)}&limit=1`);
    if (!data || !data.data || data.data.length === 0) return reply("*❌ Anime not found in the database!* ⚠️");
    const anime = data.data[0];
    const text = `╭━━━〔 *✨ SACHIYA-MD ANIME INFO ✨* 〕━━━\n` +
                 `┃\n` +
                 `┃ 📺 *Title:* ${anime.title}\n` +
                 `┃ 📝 *Episodes:* ${anime.episodes || "?"}\n` +
                 `┃ ⭐ *Rating:* ${anime.score || "?"}\n` +
                 `┃ 🎭 *Genres:* ${anime.genres.map(g => g.name).join(", ")}\n` +
                 `┃\n` +
                 `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                 `> *⚡ Powered by SACHIYA-MD 💫*`;
    await sachiya.sendMessage(from, { text }, { quoted: mek });
  }
);

cmd(
  {
    pattern: "manga",
    react: "📖",
    desc: "Search manga info",
    category: "anime",
    filename: __filename
  },
  async (sachiya, mek, m, { from, q, reply }) => {
    if (!q) return reply("*❌ Please provide a manga name! Example:* `.manga One Piece` 🔍");
    const data = await getJSON(`https://api.jikan.moe/v4/manga?q=${encodeURIComponent(q)}&limit=1`);
    if (!data || !data.data || data.data.length === 0) return reply("*❌ Manga not found in the database!* ⚠️");
    const manga = data.data[0];
    const text = `╭━━━〔 *✨ SACHIYA-MD MANGA INFO ✨* 〕━━━\n` +
                 `┃\n` +
                 `┃ 📖 *Title:* ${manga.title}\n` +
                 `┃ 📝 *Chapters:* ${manga.chapters || "?"}\n` +
                 `┃ ⭐ *Rating:* ${manga.score || "?"}\n` +
                 `┃ 🎭 *Genres:* ${manga.genres.map(g => g.name).join(", ")}\n` +
                 `┃\n` +
                 `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                 `> *⚡ Powered by SACHIYA-MD 💫*`;
    await sachiya.sendMessage(from, { text }, { quoted: mek });
  }
);

cmd(
  {
    pattern: "character",
    react: "👤",
    desc: "Get anime character info",
    category: "anime",
    filename: __filename
  },
  async (sachiya, mek, m, { from, q, reply }) => {
    if (!q) return reply("*❌ Please provide a character name! Example:* `.character Naruto` 🔍");
    const data = await getJSON(`https://api.jikan.moe/v4/characters?q=${encodeURIComponent(q)}&limit=1`);
    if (!data || !data.data || data.data.length === 0) return reply("*❌ Character not found in the database!* ⚠️");
    const char = data.data[0];
    const text = `╭━━━〔 *✨ SACHIYA-MD CHARACTER ✨* 〕━━━\n` +
                 `┃\n` +
                 `┃ 👤 *Name:* ${char.name}\n` +
                 `┃ 💖 *Anime:* ${char.anime.map(a => a.anime.title).slice(0,5).join(", ")}\n` +
                 `┃\n` +
                 `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                 `> *⚡ Powered by SACHIYA-MD 💫*`;
    await sachiya.sendMessage(from, { text }, { quoted: mek });
  }
);

cmd(
  {
    pattern: "quote",
    react: "💬",
    desc: "Random anime quote",
    category: "anime",
    filename: __filename
  },
  async (sachiya, mek, m, { from, reply }) => {
    const data = await getJSON("https://animechan.vercel.app/api/random");
    if (!data || !data.quote) return reply("*❌ Could not fetch anime quote right now!* ⚠️");
    const text = `╭━━━〔 *✨ SACHIYA-MD QUOTE ✨* 〕━━━\n` +
                 `┃\n` +
                 `┃ 💬 "${data.quote}"\n` +
                 `┃ 👤 *- ${data.character}* (${data.anime})\n` +
                 `┃\n` +
                 `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                 `> *⚡ Powered by SACHIYA-MD 💫*`;
    await sachiya.sendMessage(from, { text }, { quoted: mek });
  }
);

cmd(
  {
    pattern: "waifuquote",
    react: "💌",
    desc: "Quote from random waifu",
    category: "anime",
    filename: __filename
  },
  async (sachiya, mek, m, { from }) => {
    const data = await getJSON("https://api.waifu.pics/sfw/waifu");
    if (!data || !data.url) return reply("*❌ Could not fetch waifu quote image!* ⚠️");
    await sachiya.sendMessage(
      from, 
      { 
        image: { url: data.url }, 
        caption: `╭━━━〔 *✨ SACHIYA-MD WAIFU ✨* 〕━━━\n` +
                 `┃\n` +
                 `┃ 💌 *Waifu Quote Image* 💖\n` +
                 `┃\n` +
                 `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                 `> *⚡ Powered by SACHIYA-MD 💫*` 
      }, 
      { quoted: mek }
    );
  }
);

cmd(
  {
    pattern: "animefact",
    react: "🤔",
    desc: "Random anime fact",
    category: "anime",
    filename: __filename
  },
  async (sachiya, mek, m, { from }) => {
    const facts = [
      "Naruto’s Naruto Ramen is based on a real Japanese dish.",
      "Attack on Titan’s Titans were inspired by the author’s nightmares.",
      "In One Piece, Luffy’s hat was inspired by a real straw hat."
    ];
    const fact = facts[Math.floor(Math.random() * facts.length)];
    const text = `╭━━━〔 *✨ SACHIYA-MD FACT ✨* 〕━━━\n` +
                 `┃\n` +
                 `┃ 🤔 *Anime Fact:* ${fact}\n` +
                 `┃\n` +
                 `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                 `> *⚡ Powered by SACHIYA-MD 💫*`;
    await sachiya.sendMessage(from, { text }, { quoted: mek });
  }
);

cmd(
  {
    pattern: "animequiz",
    react: "❓",
    desc: "Anime trivia question",
    category: "anime",
    filename: __filename
  },
  async (sachiya, mek, m, { from }) => {
    const quiz = [
      { q: "Who is the main character in Naruto?", a: "Naruto Uzumaki" },
      { q: "In One Piece, what is Luffy’s dream?", a: "Become Pirate King" },
      { q: "Which anime features Titans attacking humans?", a: "Attack on Titan" }
    ];
    const selected = quiz[Math.floor(Math.random() * quiz.length)];
    const text = `╭━━━〔 *✨ SACHIYA-MD QUIZ ✨* 〕━━━\n` +
                 `┃\n` +
                 `┃ ❓ *Question:* ${selected.q}\n` +
                 `┃ 💡 *Answer:* ${selected.a}\n` +
                 `┃\n` +
                 `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                 `> *⚡ Powered by SACHIYA-MD 💫*`;
    await sachiya.sendMessage(from, { text }, { quoted: mek });
  }
);

cmd(
  {
    pattern: "aniroll",
    react: "🎲",
    desc: "Roll random anime GIF",
    category: "anime",
    filename: __filename
  },
  async (sachiya, mek, m, { from }) => {
    const gifs = [
      "https://media.giphy.com/media/l0HlBO7eyXzSZkJri/giphy.gif",
      "https://media.giphy.com/media/3o6Zt6ML6BklcajjsA/giphy.gif",
      "https://media.giphy.com/media/xT9IgG50Fb7Mi0prBC/giphy.gif"
    ];
    const gif = gifs[Math.floor(Math.random() * gifs.length)];
    await sachiya.sendMessage(
      from, 
      { 
        video: { url: gif }, 
        caption: `╭━━━〔 *✨ SACHIYA-MD GIF ✨* 〕━━━\n` +
                 `┃\n` +
                 `┃ 🎲 *Random Anime GIF Roll* ✨\n` +
                 `┃\n` +
                 `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                 `> *⚡ Powered by SACHIYA-MD 💫*` 
      }, 
      { quoted: mek }
    );
  }
);

cmd(
  {
    pattern: "anigame",
    react: "🎮",
    desc: "Guess this anime character game",
    category: "anime",
    filename: __filename
  },
  async (sachiya, mek, m, { from }) => {
    const game = [
      { name: "Naruto Uzumaki", url: "https://i.imgur.com/3a7P7zC.png" },
      { name: "Luffy", url: "https://i.imgur.com/BxQs5It.png" },
      { name: "Goku", url: "https://i.imgur.com/0M3d3yI.png" }
    ];
    const selected = game[Math.floor(Math.random() * game.length)];
    await sachiya.sendMessage(
      from, 
      { 
        image: { url: selected.url }, 
        caption: `╭━━━〔 *✨ SACHIYA-MD GAME ✨* 〕━━━\n` +
                 `┃\n` +
                 `┃ 🎮 *Guess this character!* 🤔\n` +
                 `┃\n` +
                 `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                 `> *⚡ Powered by SACHIYA-MD 💫*` 
      }, 
      { quoted: mek }
    );
  }
);
