const { cmd } = require("../command");
const puppeteer = require("puppeteer");

// Store active sessions per user chat
const pendingSearch = {};
const pendingQuality = {};

function normalizeQuality(text) {
  if (!text) return null;
  text = text.toUpperCase();
  if (/1080|FHD/.test(text)) return "1080p";
  if (/720|HD/.test(text)) return "720p";
  if (/480|SD/.test(text)) return "480p";
  return text;
}

function getDirectPixeldrainUrl(url) {
  const match = url.match(/pixeldrain\.com\/u\/(\w+)/);
  if (!match) return null;
  return `https://pixeldrain.com/api/file/${match[1]}?download`;
}

async function searchMovies(query) {
  const searchUrl = `https://sinhalasub.lk/?s=${encodeURIComponent(query)}`;
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 30000 });
  
  const results = await page.$$eval("article, .display-item .item-box, .search-item, .post-item", boxes =>
    boxes.slice(0, 10).map((box, index) => {
      const a = box.querySelector("h2 a, .title a, a.p-link, a");
      const img = box.querySelector("img");
      const lang = box.querySelector(".language, .la")?.textContent || "";
      const quality = box.querySelector(".quality, .qu")?.textContent || "";
      return {
        id: index + 1,
        title: a?.title?.trim() || a?.textContent?.trim() || "Unknown Title",
        movieUrl: a?.href || "",
        thumb: img?.src || img?.dataset?.src || "",
        language: lang.trim(),
        quality: quality.trim(),
      };
    }).filter(m => m.title && m.movieUrl && m.movieUrl.includes("sinhalasub.lk"))
  );
  
  await browser.close();
  return Array.from(new Map(results.map(item => [item.movieUrl, item])).values()).slice(0, 10);
}

async function getMovieMetadata(url) {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
  
  const metadata = await page.evaluate(() => {
    const getText = el => el?.textContent.trim() || "";
    const getList = selector => Array.from(document.querySelectorAll(selector)).map(el => el.textContent.trim());
    const title = getText(document.querySelector("h1.entry-title, .details-title h3, h1"));
    let language = "", directors = [], stars = [];
    
    document.querySelectorAll(".info-col p, .movie-info p, .details-info p, .extra-info p").forEach(p => {
      const text = p.textContent;
      if (text.includes("Language:")) language = text.replace("Language:", "").trim();
      if (text.includes("Director:")) directors = Array.from(p.querySelectorAll("a")).map(a => a.textContent.trim());
      if (text.includes("Stars:")) stars = Array.from(p.querySelectorAll("a")).map(a => a.textContent.trim());
    });

    const duration = getText(document.querySelector("[itemprop='duration'], .duration"));
    const imdb = getText(document.querySelector(".data-imdb, .imdb-rating"))?.replace("IMDb:", "").trim();
    const genres = getList(".details-genre a, .genres a, .gen a");
    const thumbnail = document.querySelector(".splash-bg img, .poster img, .entry-thumb img, .featured-image img")?.src || "";
    
    return { title, language, duration, imdb, genres, directors, stars, thumbnail };
  });
  
  await browser.close();
  return metadata;
}

async function getPixeldrainLinks(movieUrl) {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  await page.goto(movieUrl, { waitUntil: "networkidle2", timeout: 30000 });
  
  const linksData = await page.$$eval(".link-pixeldrain tbody tr, .download-links tr, .links-table tr, table tr", rows =>
    rows.map(row => {
      const a = row.querySelector("a[href*='pixeldrain'], .link-opt a, a");
      const quality = row.querySelector(".quality, td:nth-child(2)")?.textContent.trim() || "HD";
      const size = row.querySelector("td:nth-child(3), td:nth-child(4)")?.textContent.trim() || "500 MB";
      return { pageLink: a?.href || "", quality, size };
    })
  ).catch(() => []);

  const directLinks = [];
  for (const l of linksData) {
    if (!l.pageLink) continue;
    try {
      if (l.pageLink.includes("pixeldrain.com/u/")) {
        directLinks.push({ link: l.pageLink, quality: normalizeQuality(l.quality) || "HD", size: l.size });
        continue;
      }
      const subPage = await browser.newPage();
      await subPage.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
      await subPage.goto(l.pageLink, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise(r => setTimeout(r, 6000));
      
      const finalUrl = await subPage.$eval("a[href*='pixeldrain.com/u/']", el => el.href).catch(() => null);
      if (finalUrl) {
        directLinks.push({ link: finalUrl, quality: normalizeQuality(l.quality) || "HD", size: l.size });
      }
      await subPage.close();
    } catch (e) { 
      continue; 
    }
  }
  await browser.close();
  return Array.from(new Map(directLinks.map(item => [item.link, item])).values());
}

// 1. Movie Search Command (.movie <name>)
cmd({
  pattern: "movie",
  alias: ["sinhalasub", "films", "cinema"],
  react: "🎬",
  desc: "Search and download movies from Sinhalasub.lk",
  category: "download",
  filename: __filename
}, async (conn, mek, m, { from, q, sender, reply }) => {
  if (!q) return reply(`╭━━━〔 *SACHIYA-MD MOVIE* 〕━━━\n┃\n┃ ⚠️ *Please provide a movie name!*\n┃ *Example:* .movie Avatar\n┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  await reply("🔍 Searching for movies");
  const searchResults = await searchMovies(q);
  
  if (!searchResults.length) return reply("❌ *No movies found for your query!*");
  
  let text = `╭━━━〔 *SACHIYA-MD MOVIES* 〕━━━\n\n`;
  searchResults.forEach((movie, i) => {
    text += `*${i + 1}.* ${movie.title}\n`;
    if (movie.language) text += `   🌐 Language: ${movie.language}\n`;
    if (movie.quality) text += `   📊 Quality: ${movie.quality}\n`;
    text += `----------------------------------\n`;
  });
  text += `\n*👉 Reply with the number (1-${searchResults.length}) of the movie you want to select.*\n\n> *⚡ Powered by SACHIYA-MD 💫*`;
  
  // Send message and save its ID to track replies specifically to this message
  const sentMsg = await conn.sendMessage(from, { text }, { quoted: mek });
  const sentMsgId = sentMsg.key.id;

  pendingSearch[sentMsgId] = { results: searchResults, timestamp: Date.now() };
});

// 2. Direct Baileys Event Listener to track Quoted Message Replies precisely
let isListenerInitialized = false;

function initMovieListener(conn) {
  if (isListenerInitialized) return;
  isListenerInitialized = true;

  conn.ev.on("messages.upsert", async (chatUpdate) => {
    try {
      const mek = chatUpdate.messages ? chatUpdate.messages[0] : chatUpdate[0];
      if (!mek || !mek.message) return;
      if (mek.key && mek.key.remoteJid === 'status@broadcast') return;
      if (mek.key.fromMe) return;

      const from = mek.key.remoteJid;
      const sender = mek.key.participant || from;
      
      const msgType = Object.keys(mek.message)[0];
      const bodyText = msgType === 'conversation' ? mek.message.conversation :
                      msgType === 'extendedTextMessage' ? mek.message.extendedTextMessage.text :
                      msgType === 'imageMessage' ? mek.message.imageMessage.caption : '';

      if (!bodyText) return;

      // Check if the user is quoting a message
      const quotedMessage = mek.message.extendedTextMessage?.contextInfo;
      const quotedId = quotedMessage ? quotedMessage.stanzaId : null;

      const cleanBody = bodyText.replace('.', '').trim(); // supports both '6' and '.6'
      if (isNaN(cleanBody) || parseInt(cleanBody) <= 0) return;
      const textNum = parseInt(cleanBody);

      const replyFunc = (text) => conn.sendMessage(from, { text }, { quoted: mek });

      // Handle Search Selection (Only if user quoted the movie list message)
      if (quotedId && pendingSearch[quotedId]) {
        const searchData = pendingSearch[quotedId];
        if (textNum > 0 && textNum <= searchData.results.length) {
          await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});
          
          const index = textNum - 1;
          const selected = searchData.results[index];
          delete pendingSearch[quotedId]; // clear this session
          
          await replyFunc(`*⏳ Fetching details for:* *${selected.title}*...`);
          const metadata = await getMovieMetadata(selected.movieUrl);
          
          let msg = `╭━━━〔 *SACHIYA-MD MOVIE INFO* 〕━━━\n\n`;
          msg += `🎬 *TITLE:* ${metadata.title || selected.title}\n`;
          if (metadata.language) msg += `🌐 *Language:* ${metadata.language}\n`;
          if (metadata.duration) msg += `⏱️ *Duration:* ${metadata.duration}\n`;
          if (metadata.imdb) msg += `⭐ *IMDb Rating:* ${metadata.imdb}\n`;
          if (metadata.genres?.length) msg += `🎭 *Genres:* ${metadata.genres.join(", ")}\n`;
          if (metadata.directors?.length) msg += `🎬 *Directors:* ${metadata.directors.join(", ")}\n`;
          if (metadata.stars?.length) msg += `🌟 *Stars:* ${metadata.stars.slice(0, 5).join(", ")}\n\n`;
          msg += `📥 *Fetching download links, please wait...*\n\n> *⚡ Powered by SACHIYA-MD 💫*`;
          
          const botThumbnail = "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true";
          const thumbUrl = metadata.thumbnail || selected.thumb || botThumbnail;
          
          let qualityMsgSentId = null;
          try {
            const sentInfo = await conn.sendMessage(from, { image: { url: thumbUrl }, caption: msg }, { quoted: mek });
            qualityMsgSentId = sentInfo.key.id;
          } catch (err) {
            const sentInfo = await conn.sendMessage(from, { image: { url: botThumbnail }, caption: msg }, { quoted: mek }).catch(() => {});
            qualityMsgSentId = sentInfo ? sentInfo.key.id : null;
            if (!sentInfo) await replyFunc(msg);
          }
          
          const downloadLinks = await getPixeldrainLinks(selected.movieUrl);
          if (!downloadLinks.length) return replyFunc("❌ *No download links found for this movie!*");
          
          let qualityText = `╭━━━〔 *SELECT QUALITY* 〕━━━\n\n`;
          qualityText += `🎬 *${metadata.title || selected.title}*\n\n`;
          downloadLinks.forEach((d, i) => {
            qualityText += `*${i + 1}.* Quality: *${d.quality}* | Size: *${d.size}*\n`;
          });
          qualityText += `\n*👉 Reply with the quality number to download.*` + `\n\n> *⚡ Powered by SACHIYA-MD 💫*`;
          
          const qualityMsg = await conn.sendMessage(from, { text: qualityText }, { quoted: mek });
          const qualityMsgId = qualityMsg.key.id;

          pendingQuality[qualityMsgId] = { movie: { metadata: { ...metadata, title: metadata.title || selected.title }, downloadLinks }, timestamp: Date.now() };
          return;
        }
      }

      // Handle Quality Selection (Only if user quoted the quality selection message)
      if (quotedId && pendingQuality[quotedId]) {
        const qualityData = pendingQuality[quotedId];
        if (textNum > 0 && textNum <= qualityData.movie.downloadLinks.length) {
          await conn.sendMessage(from, { react: { text: "📥", key: mek.key } }).catch(() => {});
          
          const index = textNum - 1;
          const { movie } = qualityData;
          delete pendingQuality[quotedId];
          
          const selectedLink = movie.downloadLinks[index];
          await replyFunc(`📥 *Preparing to send "${movie.metadata.title}" (${selectedLink.quality})...*\n⏳ *Please wait, sending as a document file.*`);
          
          try {
            const directUrl = getDirectPixeldrainUrl(selectedLink.link);
            if (!directUrl) throw new Error("Invalid download link.");

            const safeTitle = (movie.metadata.title || "Movie").replace(/[^\w\s.-]/gi, '').substring(0, 40);
            const fileName = `${safeTitle} - ${selectedLink.quality}.mp4`;

            await conn.sendMessage(from, {
              document: { url: directUrl },
              mimetype: "video/mp4",
              fileName: fileName,
              caption: `╭━━━〔 *SACHIYA-MD DOWNLOAD* 〕━━━\n\n🎬 *${movie.metadata.title}*\n📊 *Quality:* ${selectedLink.quality}\n📁 *Size:* ${selectedLink.size}\n\n*✨ Enjoy your movie!*` + `\n\n> *⚡ Powered by SACHIYA-MD 💫*`
            }, { quoted: mek });

          } catch (error) {
            console.error("Movie Send Error:", error);
            await replyFunc(`❌ *Failed to send movie file:* ${error.message || "Unknown error occurred."}`);
          }
          return;
        }
      }
    } catch (err) {}
  });
}

// Hook to initialize listener when command is processed
cmd({
  pattern: "movielisten",
  dontAddCommandList: true,
  filename: __filename
}, async (conn) => {
  initMovieListener(conn);
});

module.exports = { pendingSearch, pendingQuality, initMovieListener };
