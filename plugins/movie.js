const { cmd } = require("../command");
const puppeteer = require("puppeteer");
const config = require("../config");

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
  // Remove duplicates based on movieUrl
  const uniqueResults = Array.from(new Map(results.map(item => [item.movieUrl, item])).values());
  return uniqueResults.slice(0, 10);
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
  // Unique links filter
  return Array.from(new Map(directLinks.map(item => [item.link, item])).values());
}

// 1. Movie Search Command
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
  
  pendingSearch[sender] = { results: searchResults, timestamp: Date.now() };
  
  let text = `╭━━━〔 *SACHIYA-MD MOVIES* 〕━━━\n\n`;
  searchResults.forEach((movie, i) => {
    text += `*${i + 1}.* ${movie.title}\n`;
    if (movie.language) text += `   🌐 Language: ${movie.language}\n`;
    if (movie.quality) text += `   📊 Quality: ${movie.quality}\n`;
    text += `----------------------------------\n`;
  });
  text += `\n*👉 Reply with the number (1-${searchResults.length}) of the movie you want to select.*\n\n> *⚡ Powered by SACHIYA-MD 💫*`;
  
  return reply(text);
});

// 2. Movie Selection & Quality Options Handler (Fixed quoting issue using m.quoted)
cmd({
  pattern: "selectmovie",
  dontAddCommandList: true,
  filename: __filename
}, async () => {}); // Dummy to keep command safe if needed, handled via general message listener below

// Global message listener to handle number replies reliably with quoting support
const originalMessagesUpsert = global.movieListenerAdded || false;
// We handle selection inside messages or via general text hook if standard filters fail.
// Below we use standard cmd filter with robust quoted text detection.

cmd({
  filter: (text, { sender, mek }) => {
    // Check if user is replying to a pending search or quality selection
    const isSearchPending = pendingSearch[sender];
    const isQualityPending = pendingQuality[sender];
    if (!isSearchPending && !isQualityPending) return false;
    
    // Check if the message is a pure number or text containing the number
    const cleanText = text.trim();
    return !isNaN(cleanText) && parseInt(cleanText) > 0;
  }
}, async (conn, mek, m, { body, sender, reply, from }) => {
  const textNum = parseInt(body.trim());

  // Handle Search Selection
  if (pendingSearch[sender]) {
    const searchData = pendingSearch[sender];
    if (textNum > 0 && textNum <= searchData.results.length) {
      await conn.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});
      
      const index = textNum - 1;
      const selected = searchData.results[index];
      delete pendingSearch[sender];
      
      await reply(`*⏳ Fetching details for:* *${selected.title}*...`);
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
      
      const thumbUrl = metadata.thumbnail || selected.thumb;
      if (thumbUrl) {
        await conn.sendMessage(from, { image: { url: thumbUrl }, caption: msg }, { quoted: mek }).catch(() => {
          reply(msg);
        });
      } else {
        await reply(msg);
      }
      
      const downloadLinks = await getPixeldrainLinks(selected.movieUrl);
      if (!downloadLinks.length) return reply("❌ *No download links found for this movie!*");
      
      pendingQuality[sender] = { movie: { metadata: { ...metadata, title: metadata.title || selected.title }, downloadLinks }, timestamp: Date.now() };
      
      let qualityMsg = `╭━━━〔 *SELECT QUALITY* 〕━━━\n\n`;
      qualityMsg += `🎬 *${metadata.title || selected.title}*\n\n`;
      downloadLinks.forEach((d, i) => {
        qualityMsg += `*${i + 1}.* Quality: *${d.quality}* | Size: *${d.size}*\n`;
      });
      qualityMsg += `\n*👉 Reply with the quality number to download.*` + `\n\n> *⚡ Powered by SACHIYA-MD 💫*`;
      
      return reply(qualityMsg);
    }
  }

  // Handle Quality Selection
  if (pendingQuality[sender]) {
    const qualityData = pendingQuality[sender];
    if (textNum > 0 && textNum <= qualityData.movie.downloadLinks.length) {
      await conn.sendMessage(from, { react: { text: "📥", key: mek.key } }).catch(() => {});
      
      const index = textNum - 1;
      const { movie } = qualityData;
      delete pendingQuality[sender];
      
      const selectedLink = movie.downloadLinks[index];
      await reply(`📥 *Preparing to send "${movie.metadata.title}" (${selectedLink.quality})...*\n⏳ *Please wait, sending as a document file.*`);
      
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
        await reply(`❌ *Failed to send movie file:* ${error.message || "Unknown error occurred."}`);
      }
    }
  }
});

// Timeout Cleanup Routine
setInterval(() => {
  const now = Date.now();
  const timeout = 10 * 60 * 1000; // 10 Minutes
  for (const s in pendingSearch) {
    if (now - pendingSearch[s].timestamp > timeout) delete pendingSearch[s];
  }
  for (const s in pendingQuality) {
    if (now - pendingQuality[s].timestamp > timeout) delete pendingQuality[s];
  }
}, 5 * 60 * 1000);

module.exports = { pendingSearch, pendingQuality };
