const { cmd } = require("../command");
const puppeteer = require("puppeteer");

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
  const searchUrl = `https://sinhalasub.lk/?s=${encodeURIComponent(query)}&post_type=movies`;
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.goto(searchUrl, { waitUntil: "networkidle2", timeout: 30000 });
  
  const results = await page.$$eval(".display-item .item-box", boxes =>
    boxes.slice(0, 10).map((box, index) => {
      const a = box.querySelector("a");
      const img = box.querySelector(".thumb");
      const lang = box.querySelector(".item-desc-giha .language")?.textContent || "";
      const quality = box.querySelector(".item-desc-giha .quality")?.textContent || "";
      const qty = box.querySelector(".item-desc-giha .qty")?.textContent || "";
      return {
        id: index + 1,
        title: a?.title?.trim() || a?.textContent?.trim() || "Unknown Title",
        movieUrl: a?.href || "",
        thumb: img?.src || "",
        language: lang.trim(),
        quality: quality.trim(),
        qty: qty.trim(),
      };
    }).filter(m => m.title && m.movieUrl)
  );
  
  await browser.close();
  return results;
}

async function getMovieMetadata(url) {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
  
  const metadata = await page.evaluate(() => {
    const getText = el => el?.textContent.trim() || "";
    const getList = selector => Array.from(document.querySelectorAll(selector)).map(el => el.textContent.trim());
    const title = getText(document.querySelector(".info-details .details-title h3")) || getText(document.querySelector("h1.entry-title"));
    let language = "", directors = [], stars = [];
    
    document.querySelectorAll(".info-col p, .movie-info p, .details-info p").forEach(p => {
      const strong = p.querySelector("strong");
      if (!strong) return;
      const txt = strong.textContent.trim();
      if (txt.includes("Language:")) language = strong.nextSibling?.textContent?.trim() || "";
      if (txt.includes("Director:")) directors = Array.from(p.querySelectorAll("a")).map(a => a.textContent.trim());
      if (txt.includes("Stars:")) stars = Array.from(p.querySelectorAll("a")).map(a => a.textContent.trim());
    });

    const duration = getText(document.querySelector(".info-details .data-views[itemprop='duration'], .duration"));
    const imdb = getText(document.querySelector(".info-details .data-imdb, .imdb-rating"))?.replace("IMDb:", "").trim();
    const genres = getList(".details-genre a, .genres a");
    const thumbnail = document.querySelector(".splash-bg img, .poster img, .entry-thumb img")?.src || "";
    
    return { title, language, duration, imdb, genres, directors, stars, thumbnail };
  });
  
  await browser.close();
  return metadata;
}

async function getPixeldrainLinks(movieUrl) {
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  const page = await browser.newPage();
  await page.goto(movieUrl, { waitUntil: "networkidle2", timeout: 30000 });
  
  const linksData = await page.$$eval(".link-pixeldrain tbody tr, .download-links tr, .links-table tr", rows =>
    rows.map(row => {
      const a = row.querySelector(".link-opt a, a.download-btn, td a");
      const quality = row.querySelector(".quality, td:nth-child(2)")?.textContent.trim() || "HD";
      const size = row.querySelector("td:nth-child(3) span, td:nth-child(4)")?.textContent.trim() || "0 MB";
      return { pageLink: a?.href || "", quality, size };
    })
  ).catch(() => []);

  const directLinks = [];
  for (const l of linksData) {
    if (!l.pageLink) continue;
    try {
      const subPage = await browser.newPage();
      await subPage.goto(l.pageLink, { waitUntil: "networkidle2", timeout: 30000 });
      await new Promise(r => setTimeout(r, 8000));
      
      const finalUrl = await subPage.$eval(".wait-done a[href^='https://pixeldrain.com/'], a[href*='pixeldrain.com/u/']", el => el.href).catch(() => null);
      if (finalUrl) {
        let sizeMB = 0;
        const sizeText = l.size.toUpperCase();
        if (sizeText.includes("GB")) sizeMB = parseFloat(sizeText) * 1024;
        else if (sizeText.includes("MB")) sizeMB = parseFloat(sizeText);
        else sizeMB = 500; // Default safe size if unreadable

        if (sizeMB <= 2048) {
          directLinks.push({ link: finalUrl, quality: normalizeQuality(l.quality) || "HD", size: l.size });
        }
      }
      await subPage.close();
    } catch (e) { 
      continue; 
    }
  }
  await browser.close();
  return directLinks;
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
  if (!q) return reply(`*🎬 MOVIE SEARCH PLUGIN*\n\n*Usage:* .movie <Movie Name>\n*Example:* .movie Avengers`);
  
  await reply("*🔍 Searching for movies on Sinhalasub.lk, please wait...*");
  const searchResults = await searchMovies(q);
  
  if (!searchResults.length) return reply("*❌ No movies found for your query!*");
  
  pendingSearch[sender] = { results: searchResults, timestamp: Date.now() };
  
  let text = `*🎬 SEARCH RESULTS:*\n\n`;
  searchResults.forEach((movie, i) => {
    text += `*${i + 1}.* ${movie.title}\n`;
    if (movie.language) text += `   🌐 Language: ${movie.language}\n`;
    if (movie.quality) text += `   📊 Quality: ${movie.quality}\n`;
    text += `----------------------------------\n`;
  });
  text += `\n*👉 Reply with the number (1-${searchResults.length}) of the movie you want to select.*`;
  
  return reply(text);
});

// 2. Movie Selection & Quality Options Handler
cmd({
  filter: (text, { sender }) => pendingSearch[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingSearch[sender].results.length
}, async (conn, mek, m, { body, sender, reply, from }) => {
  await conn.sendMessage(from, { react: { text: "✅", key: m.key } });
  
  const index = parseInt(body.trim()) - 1;
  const selected = pendingSearch[sender].results[index];
  delete pendingSearch[sender];
  
  await reply(`*⏳ Fetching details for:* *${selected.title}*...`);
  const metadata = await getMovieMetadata(selected.movieUrl);
  
  let msg = `*🎬 TITLE:* ${metadata.title || selected.title}\n`;
  if (metadata.language) msg += `*🌐 Language:* ${metadata.language}\n`;
  if (metadata.duration) msg += `*⏱️ Duration:* ${metadata.duration}\n`;
  if (metadata.imdb) msg += `*⭐ IMDb Rating:* ${metadata.imdb}\n`;
  if (metadata.genres?.length) msg += `*🎭 Genres:* ${metadata.genres.join(", ")}\n`;
  if (metadata.directors?.length) msg += `*🎬 Directors:* ${metadata.directors.join(", ")}\n`;
  if (metadata.stars?.length) msg += `*🌟 Stars:* ${metadata.stars.slice(0, 5).join(", ")}\n\n`;
  msg += `*📥 Fetching download links (Pixeldrain), please wait...*`;
  
  const thumbUrl = metadata.thumbnail || selected.thumb;
  if (thumbUrl) {
    await conn.sendMessage(from, { image: { url: thumbUrl }, caption: msg }, { quoted: mek });
  } else {
    await conn.sendMessage(from, { text: msg }, { quoted: mek });
  }
  
  const downloadLinks = await getPixeldrainLinks(selected.movieUrl);
  if (!downloadLinks.length) return reply("*❌ No direct download links found under 2GB for this movie!*");
  
  pendingQuality[sender] = { movie: { metadata: { ...metadata, title: metadata.title || selected.title }, downloadLinks }, timestamp: Date.now() };
  
  let qualityMsg = `*🎬 ${metadata.title || selected.title}*\n\n*📦 AVAILABLE QUALITIES (Max 2GB):*\n`;
  downloadLinks.forEach((d, i) => {
    qualityMsg += `*${i + 1}.* Quality: *${d.quality}* | Size: *${d.size}*\n`;
  });
  qualityMsg += `\n*👉 Reply with the quality number to download the movie file directly to your inbox.*`;
  
  return reply(qualityMsg);
});

// 3. Quality Selection & Document Sender
cmd({
  filter: (text, { sender }) => pendingQuality[sender] && !isNaN(text) && parseInt(text) > 0 && parseInt(text) <= pendingQuality[sender].movie.downloadLinks.length
}, async (conn, mek, m, { body, sender, reply, from }) => {
  await conn.sendMessage(from, { react: { text: "📥", key: m.key } });
  
  const index = parseInt(body.trim()) - 1;
  const { movie } = pendingQuality[sender];
  delete pendingQuality[sender];
  
  const selectedLink = movie.downloadLinks[index];
  await reply(`*📥 Preparing to send "${movie.metadata.title}" (${selectedLink.quality})...*\n*⏳ Please wait, sending as a document file.*`);
  
  try {
    const directUrl = getDirectPixeldrainUrl(selectedLink.link);
    if (!directUrl) throw new Error("Invalid Pixeldrain direct URL generated.");

    const safeTitle = (movie.metadata.title || "Movie").replace(/[^\w\s.-]/gi, '').substring(0, 45);
    const fileName = `${safeTitle} - ${selectedLink.quality}.mp4`;

    await conn.sendMessage(from, {
      document: { url: directUrl },
      mimetype: "video/mp4",
      fileName: fileName,
      caption: `*🎬 ${movie.metadata.title}*\n*📊 Quality:* ${selectedLink.quality}\n*📁 Size:* ${selectedLink.size}\n\n*✨ Enjoy your movie! Powered by SACHIYA-MD 💫*`
    }, { quoted: mek });

  } catch (error) {
    console.error("Movie Send Error:", error);
    await reply(`*❌ Failed to send movie file:* ${error.message || "Unknown error occurred."}`);
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
