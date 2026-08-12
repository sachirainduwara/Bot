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
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
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
        title: a?.title?.trim() || a?.textContent?.trim() || "",
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
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
  const metadata = await page.evaluate(() => {
    const getText = el => el?.textContent.trim() || "";
    const getList = selector => Array.from(document.querySelectorAll(selector)).map(el => el.textContent.trim());
    const title = getText(document.querySelector(".info-details .details-title h3, h1.entry-title"));
    let language = "", directors = [], stars = [];
    document.querySelectorAll(".info-col p, .movie-info p").forEach(p => {
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
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  await page.goto(movieUrl, { waitUntil: "networkidle2", timeout: 30000 });
  const linksData = await page.$$eval(".link-pixeldrain tbody tr, .download-links tr", rows =>
    rows.map(row => {
      const a = row.querySelector(".link-opt a, a[href*='pixeldrain']");
      const quality = row.querySelector(".quality, td:nth-child(2)")?.textContent.trim() || "HD";
      const size = row.querySelector("td:nth-child(3) span, td:nth-child(3)")?.textContent.trim() || "500 MB";
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
      const finalUrl = await subPage.$eval(".wait-done a[href^='https://pixeldrain.com/'], a[href*='pixeldrain.com/u/']", el => el.href).catch(() => null);
      if (finalUrl) {
        let sizeMB = 500;
        const sizeText = l.size.toUpperCase();
        if (sizeText.includes("GB")) sizeMB = parseFloat(sizeText) * 1024;
        else if (sizeText.includes("MB")) sizeMB = parseFloat(sizeText);
        if (sizeMB <= 2048) {
          directLinks.push({ link: finalUrl, quality: normalizeQuality(l.quality) || "HD", size: l.size });
        }
      }
      await subPage.close();
    } catch (e) { continue; }
  }
  await browser.close();
  return Array.from(new Map(directLinks.map(item => [item.link, item])).values());
}

// 1. Movie Search Command
cmd({
  pattern: "movie",
  alias: ["sinhalasub","films","cinema"],
  react: "🎬",
  desc: "Search and send movies from Sinhalasub.lk",
  category: "download",
  filename: __filename
}, async (danuwa, mek, m, { from, q, sender, reply }) => {
  if (!q) return reply(`╭━━━〔 *SACHIYA-MD MOVIE* 〕━━━\n┃\n┃ ⚠️ *Please provide a movie name!*\n┃ *Example:* .movie Avengers\n┃\n╰━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  
  await reply("🔍 Searching for movies");
  const searchResults = await searchMovies(q);
  if (!searchResults.length) return reply("*❌ No movies found!*");
  
  let text = `╭━━━〔 *SACHIYA-MD MOVIES* 〕━━━\n\n`;
  searchResults.forEach((m, i) => {
    text += `*${i+1}.* ${m.title}\n`;
    if (m.language) text += `   🌐 Language: ${m.language}\n`;
    if (m.quality) text += `   📊 Quality: ${m.quality}\n`;
    text += `----------------------------------\n`;
  });
  text += `\n*👉 Reply with the number (1-${searchResults.length}) of the movie you want to select.*\n\n> *⚡ Powered by SACHIYA-MD 💫*`;
  
  const sentMsg = await danuwa.sendMessage(from, { text }, { quoted: mek });
  pendingSearch[sentMsg.key.id] = { results: searchResults, sender, timestamp: Date.now() };
});

// 2. Global Text and Reply Listener to handle number inputs seamlessly
cmd({
  on: "text"
}, async (danuwa, mek, m, { body, sender, reply, from }) => {
  try {
    if (!body) return;
    const cleanBody = body.replace('.', '').trim();
    if (isNaN(cleanBody) || parseInt(cleanBody) <= 0) return;
    const textNum = parseInt(cleanBody);

    const quotedMsg = mek.message?.extendedTextMessage?.contextInfo;
    const quotedId = quotedMsg ? quotedMsg.stanzaId : null;

    let targetSearchKey = quotedId && pendingSearch[quotedId] ? quotedId : null;
    if (!targetSearchKey) {
      for (const key in pendingSearch) {
        if (pendingSearch[key].sender === sender) {
          targetSearchKey = key;
          break;
        }
      }
    }

    if (targetSearchKey && pendingSearch[targetSearchKey]) {
      const searchData = pendingSearch[targetSearchKey];
      if (textNum > 0 && textNum <= searchData.results.length) {
        await danuwa.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});
        const index = textNum - 1;
        const selected = searchData.results[index];
        delete pendingSearch[targetSearchKey];

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

        const botThumbnail = "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true";
        const thumbUrl = metadata.thumbnail || selected.thumb || botThumbnail;

        let qualityMsgId = null;
        try {
          const sentInfo = await danuwa.sendMessage(from, { image: { url: thumbUrl }, caption: msg }, { quoted: mek });
          qualityMsgId = sentInfo.key.id;
        } catch (err) {
          const sentInfo = await danuwa.sendMessage(from, { image: { url: botThumbnail }, caption: msg }, { quoted: mek }).catch(() => {});
          qualityMsgId = sentInfo ? sentInfo.key.id : null;
          if (!sentInfo) await reply(msg);
        }

        const downloadLinks = await getPixeldrainLinks(selected.movieUrl);
        if (!downloadLinks.length) return reply("❌ *No download links found (<2GB)!*");

        let qualityText = `╭━━━〔 *SELECT QUALITY* 〕━━━\n\n`;
        qualityText += `🎬 *${metadata.title || selected.title}*\n\n`;
        downloadLinks.forEach((d, i) => {
          qualityText += `*${i + 1}.* Quality: *${d.quality}* | Size: *${d.size}*\n`;
        });
        qualityText += `\n*👉 Reply with the quality number to download.*` + `\n\n> *⚡ Powered by SACHIYA-MD 💫*`;

        const qualityMsg = await danuwa.sendMessage(from, { text: qualityText }, { quoted: mek });
        pendingQuality[qualityMsg.key.id] = { movie: { metadata: { ...metadata, title: metadata.title || selected.title }, downloadLinks }, sender, timestamp: Date.now() };
        return;
      }
    }

    let targetQualityKey = quotedId && pendingQuality[quotedId] ? quotedId : null;
    if (!targetQualityKey) {
      for (const key in pendingQuality) {
        if (pendingQuality[key].sender === sender) {
          targetQualityKey = key;
          break;
        }
      }
    }

    if (targetQualityKey && pendingQuality[targetQualityKey]) {
      const qualityData = pendingQuality[targetQualityKey];
      if (textNum > 0 && textNum <= qualityData.movie.downloadLinks.length) {
        await danuwa.sendMessage(from, { react: { text: "📥", key: mek.key } }).catch(() => {});
        const index = textNum - 1;
        const { movie } = qualityData;
        delete pendingQuality[targetQualityKey];

        const selectedLink = movie.downloadLinks[index];
        reply(`📥 *Preparing to send "${movie.metadata.title}" (${selectedLink.quality})...*\n⏳ *Please wait, sending as a document file.*`);

        try {
          const directUrl = getDirectPixeldrainUrl(selectedLink.link);
          if (!directUrl) throw new Error("Invalid download link.");
          const safeTitle = (movie.metadata.title || "Movie").replace(/[^\w\s.-]/gi, '').substring(0, 40);
          const fileName = `${safeTitle} - ${selectedLink.quality}.mp4`;

          await danuwa.sendMessage(from, {
            document: { url: directUrl },
            mimetype: "video/mp4",
            fileName: fileName,
            caption: `╭━━━〔 *SACHIYA-MD DOWNLOAD* 〕━━━\n\n🎬 *${movie.metadata.title}*\n📊 *Quality:* ${selectedLink.quality}\n📁 *Size:* ${selectedLink.size}\n\n*✨ Enjoy your movie!*` + `\n\n> *⚡ Powered by SACHIYA-MD 💫*`
          }, { quoted: mek });
        } catch (error) {
          console.error("Send document error:", error);
          reply(`❌ *Failed to send movie file:* ${error.message || "Unknown error"}`);
        }
        return;
      }
    }
  } catch (err) {
    console.error("Movie selection listener error:", err);
  }
});

setInterval(() => {
  const now = Date.now();
  const timeout = 10 * 60 * 1000;
  for (const s in pendingSearch) if (now - pendingSearch[s].timestamp > timeout) delete pendingSearch[s];
  for (const s in pendingQuality) if (now - pendingQuality[s].timestamp > timeout) delete pendingQuality[s];
}, 5 * 60 * 1000);

module.exports = { pendingSearch, pendingQuality };
