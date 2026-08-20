const { cmd } = require("../command");
const puppeteer = require("puppeteer");

const pendingSearch = {};
const pendingQuality = {};

const SACHIYA_LOGO = "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true";

function normalizeQuality(text) {
  if (!text) return "HD";
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

async function getBrowser() {
  return await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--disable-gpu"
    ]
  });
}

async function searchMovies(query) {
  const searchUrl = `https://sinhalasub.lk/?s=${encodeURIComponent(query)}&post_type=movies`;
  const browser = await getBrowser();
  try {
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
  } catch (error) {
    await browser.close();
    console.error("Search Movies Error:", error);
    return [];
  }
}

async function getMovieMetadata(url) {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    
    const metadata = await page.evaluate(() => {
      const getText = el => el?.textContent.trim() || "";
      const getList = selector => Array.from(document.querySelectorAll(selector)).map(el => el.textContent.trim());
      const title = getText(document.querySelector(".info-details .details-title h3") || document.querySelector("h1.entry-title"));
      let language = "", directors = [], stars = [];
      document.querySelectorAll(".info-col p, .custom-field p").forEach(p => {
        const strong = p.querySelector("strong");
        if (!strong) return;
        const txt = strong.textContent.trim();
        if (txt.includes("Language:")) language = strong.nextSibling?.textContent?.trim() || "";
        if (txt.includes("Director:")) directors = Array.from(p.querySelectorAll("a")).map(a => a.textContent.trim());
        if (txt.includes("Stars:")) stars = Array.from(p.querySelectorAll("a")).map(a => a.textContent.trim());
      });
      const duration = getText(document.querySelector(".info-details .data-views[itemprop='duration']") || document.querySelector(".duration"));
      const imdb = getText(document.querySelector(".info-details .data-imdb"))?.replace("IMDb:", "").trim();
      const genres = getList(".details-genre a, .genres a");
      const thumbnail = document.querySelector(".splash-bg img")?.src || document.querySelector(".poster img")?.src || "";
      return { title, language, duration, imdb, genres, directors, stars, thumbnail };
    });
    await browser.close();
    return metadata;
  } catch (error) {
    await browser.close();
    console.error("Get Metadata Error:", error);
    return null;
  }
}

async function getPixeldrainLinks(movieUrl) {
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.goto(movieUrl, { waitUntil: "networkidle2", timeout: 30000 });
    
    // Extract all anchor links directly from the page content
    const allLinks = await page.$$eval("a", anchors => anchors.map(a => ({
      href: a.href || "",
      text: a.textContent || "",
      parentText: a.parentElement ? a.parentElement.textContent : ""
    })));

    await browser.close();

    const directLinks = [];
    const seenUrls = new Set();

    for (const item of allLinks) {
      const fullLink = item.href;
      // Check if it's a pixeldrain link or a redirect link to pixeldrain
      if (fullLink && (fullLink.includes('pixeldrain.com') || fullLink.includes('pixeldrain'))) {
        const match = fullLink.match(/pixeldrain\.com\/u\/(\w+)/);
        if (match) {
          const cleanUrl = `https://pixeldrain.com/u/${match[1]}`;
          if (!seenUrls.has(cleanUrl)) {
            seenUrls.add(cleanUrl);
            
            // Detect quality from text or parent text
            let quality = "HD";
            const combinedText = (item.text + " " + item.parentText).toUpperCase();
            if (/1080|FHD/.test(combinedText)) quality = "1080p";
            else if (/720|HD/.test(combinedText)) quality = "720p";
            else if (/480|SD/.test(combinedText)) quality = "480p";

            directLinks.push({ 
              link: cleanUrl, 
              quality: quality, 
              size: "HD Quality" 
            });
          }
        }
      }
    }

    return directLinks;
  } catch (error) {
    console.error("Get Pixeldrain Links Error:", error);
    return [];
  }
}

cmd({
  pattern: "movie",
  alias: ["sinhalasub", "films", "cinema"],
  react: "🎬",
  desc: "Search and send movies from Sinhalasub.lk",
  category: "download",
  filename: __filename
}, async (danuwa, mek, m, { from, q, sender, reply }) => {
  try {
    if (!q) return reply(`*🎬 SACHIYA MD - MOVIE SYSTEM*\n\n*Usage:* \`.movie <movie_name>\`\n*Example:* \`.movie avengers\``);
    
    await danuwa.sendMessage(from, { react: { text: "🔍", key: mek.key } }).catch(() => {});

    const searchResults = await searchMovies(q);
    if (!searchResults.length) {
      await danuwa.sendMessage(from, { react: { text: "❌", key: mek.key } }).catch(() => {});
      return reply("*❌ No movies found matching your query on Sinhalasub!*");
    }

    pendingSearch[sender] = { results: searchResults, timestamp: Date.now() };

    let text = `╭━━━〔 *SACHIYA-MD MOVIE SEARCH* 〕━━━\n` +
               `┃ 🔎 *Query:* ${q}\n` +
               `┃ 🔢 *Found:* ${searchResults.length} Movies\n` +
               `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

    searchResults.forEach((item, i) => {
      text += `┃ *${i + 1}️⃣* *${item.title}*\n` +
              `┃    📌 Lang: ${item.language || 'N/A'}\n` +
              `┃    📊 Quality: ${item.quality || 'N/A'}\n` +
              `┃\n`;
    });
    text += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n> *💬 Please reply with the movie number (1-${searchResults.length})!*`;

    const sentMsg = await danuwa.sendMessage(from, { 
      image: { url: SACHIYA_LOGO }, 
      caption: text 
    }, { quoted: mek });

    await danuwa.sendMessage(from, { react: { text: "✅", key: mek.key } }).catch(() => {});

    const searchListener = async (chatUpdate) => {
      try {
        const msg = chatUpdate.messages[0];
        if (!msg || !msg.message) return;
        
        const msgSender = msg.key.remoteJid;
        const isReplyToBot = msg.message.extendedTextMessage && 
                           msg.message.extendedTextMessage.contextInfo && 
                           msg.message.extendedTextMessage.contextInfo.stanzaId === sentMsg.key.id;

        if (msgSender === from && isReplyToBot) {
          const bodyText = (msg.message.conversation || msg.message.extendedTextMessage.text || "").trim();
          const index = parseInt(bodyText) - 1;

          if (isNaN(index) || index < 0 || index >= searchResults.length) return;

          danuwa.ev.off("messages.upsert", searchListener);
          delete pendingSearch[sender];

          await danuwa.sendMessage(from, { react: { text: "⏳", key: msg.key } }).catch(() => {});
          const selected = searchResults[index];
          
          await danuwa.sendMessage(from, { text: `📥 *Fetching details and metadata for:* *${selected.title}*...` }, { quoted: msg });

          const metadata = await getMovieMetadata(selected.movieUrl);
          if (!metadata) {
            return danuwa.sendMessage(from, { text: "❌ *Failed to fetch movie metadata!*" }, { quoted: msg });
          }

          let msgText = `╭━━━〔 *${metadata.title || selected.title}* 〕━━━\n` +
                        `┃ 📌 *Language:* ${metadata.language || 'N/A'}\n` +
                        `┃ ⏱️ *Duration:* ${metadata.duration || 'N/A'}\n` +
                        `┃ ⭐ *IMDb:* ${metadata.imdb || 'N/A'}\n` +
                        `┃ 🎭 *Genres:* ${metadata.genres?.join(", ") || 'N/A'}\n` +
                        `┃ 🎬 *Directors:* ${metadata.directors?.join(", ") || 'N/A'}\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                        `*⏳ Fetching Pixeldrain download links, please wait...*`;

          let detailsMsg;
          const posterToUse = metadata.thumbnail || selected.thumb || SACHIYA_LOGO;
          detailsMsg = await danuwa.sendMessage(from, { image: { url: posterToUse }, caption: msgText }, { quoted: msg });

          const downloadLinks = await getPixeldrainLinks(selected.movieUrl);
          if (!downloadLinks.length) {
            return danuwa.sendMessage(from, { text: "❌ *No download links found for this movie!*" }, { quoted: msg });
          }

          pendingQuality[sender] = { movie: { metadata, downloadLinks }, timestamp: Date.now() };

          let qualityMsg = `╭━━━〔 *SACHIYA-MD QUALITIES* 〕━━━\n` +
                           `┃ 🎬 *${metadata.title || selected.title}*\n` +
                           `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
          downloadLinks.forEach((d, i) => {
            qualityMsg += `┃ *${i + 1}️⃣* Quality: ${d.quality} 📦 (${d.size})\n`;
          });
          qualityMsg += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n> *💬 Reply with the quality number to download as document!*`;

          const qualitySentMsg = await danuwa.sendMessage(from, { text: qualityMsg }, { quoted: detailsMsg });

          const qualityListener = async (qualityUpdate) => {
            try {
              const qMsg = qualityUpdate.messages[0];
              if (!qMsg || !qMsg.message) return;
              
              const qSender = qMsg.key.remoteJid;
              const isQReply = qMsg.message.extendedTextMessage && 
                               qMsg.message.extendedTextMessage.contextInfo && 
                               qMsg.message.extendedTextMessage.contextInfo.stanzaId === qualitySentMsg.key.id;

              if (qSender === from && isQReply) {
                const qText = (qMsg.message.conversation || qMsg.message.extendedTextMessage.text || "").trim();
                const qIndex = parseInt(qText) - 1;

                if (isNaN(qIndex) || qIndex < 0 || qIndex >= downloadLinks.length) return;

                danuwa.ev.off("messages.upsert", qualityListener);
                delete pendingQuality[sender];

                await danuwa.sendMessage(from, { react: { text: "📥", key: qMsg.key } }).catch(() => {});
                const selectedLink = downloadLinks[qIndex];

                await danuwa.sendMessage(from, { text: `📥 *Preparing ${selectedLink.quality} video file... Please wait, uploading as document.*` }, { quoted: qMsg });

                const directUrl = getDirectPixeldrainUrl(selectedLink.link);
                if (!directUrl) {
                  return danuwa.sendMessage(from, { text: "❌ *Failed to generate direct Pixeldrain link!*" }, { quoted: qMsg });
                }

                const safeTitle = (metadata.title || selected.title).replace(/[^\w\s.-]/gi, '').substring(0, 50);
                await danuwa.sendMessage(from, {
                  document: { url: directUrl },
                  mimetype: "video/mp4",
                  fileName: `${safeTitle} - ${selectedLink.quality}.mp4`,
                  caption: `╭━━━〔 *SACHIYA-MD DOWNLOAD* 〕━━━\n` +
                           `┃ 🎬 *Title:* ${metadata.title || selected.title}\n` +
                           `┃ 📊 *Quality:* ${selectedLink.quality}\n` +
                           `┃ 📦 *Size:* ${selectedLink.size}\n` +
                           `┣━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                           `┃ ✨ *Powered by SACHIYA MD* 🚀\n` +
                           `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n> *Enjoy your movie! 🍿*`
                }, { quoted: qMsg });

                await danuwa.sendMessage(from, { react: { text: "🎉", key: qMsg.key } }).catch(() => {});
              }
            } catch (err) {
              console.error("Quality Listener Error:", err);
            }
          };

          danuwa.ev.on("messages.upsert", qualityListener);
          setTimeout(() => danuwa.ev.off("messages.upsert", qualityListener), 300000);
        }
      } catch (err) {
        console.error("Search Listener Error:", err);
      }
    };

    danuwa.ev.on("messages.upsert", searchListener);
    setTimeout(() => danuwa.ev.off("messages.upsert", searchListener), 300000);

  } catch (error) {
    console.error('[MOVIE PLUGIN ERROR]:', error);
    reply("❌ *An error occurred while processing your request. Please try again later.*");
  }
});

setInterval(() => {
  const now = Date.now();
  const timeout = 10 * 60 * 1000;
  for (const s in pendingSearch) if (now - pendingSearch[s].timestamp > timeout) delete pendingSearch[s];
  for (const s in pendingQuality) if (now - pendingQuality[s].timestamp > timeout) delete pendingQuality[s];
}, 5 * 60 * 1000);

module.exports = { pendingSearch, pendingQuality };
