const { cmd } = require("../command");
const axios = require("axios");
const cheerio = require("cheerio");

cmd(
  {
    pattern: "mediafire",
    alias: ["mfire", "mf"],
    react: "📁",
    desc: "Download files from Mediafire",
    category: "download",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, quoted, q, reply }) => {
    try {
      if (!q || !q.includes("mediafire.com")) {
        return reply("❌ *Please provide a valid Mediafire link!*");
      }

      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      // Safe URL Cleaning (keeping necessary parts if any)
      let cleanUrl = q.trim().split(" ")[0]; 

      let fileName = "Mediafire_File";
      let fileSize = "Unknown Size";
      let downloadUrl = null;

      // --- METHOD 1: Direct Web Scraping (Most Reliable) ---
      try {
        const pageRes = await axios.get(cleanUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        });
        const $ = cheerio.load(pageRes.data);

        downloadUrl = $("#downloadButton").attr("href");
        
        let rawTitle = $(".dl-btn-label").attr("title");
        if (rawTitle) fileName = rawTitle.replace("Download file ", "").trim();
        
        // Improved File Size Extraction from Mediafire HTML Elements
        let rawInfo = $(".dl-info .size").text().trim() || $(".dl-btn-label").text() || "";
        let sizeMatch = rawInfo.match(/\((.*?)\)/) || rawInfo.match(/([0-9.]+\s?[KkMmGgBb][Bb]?)/);
        
        if (sizeMatch && sizeMatch[1]) {
          fileSize = sizeMatch[1].trim();
        } else {
          // Alternative fallback element check for size
          let altSize = $("a#downloadButton").text().match(/\((.*?)\)/);
          if (altSize && altSize[1]) fileSize = altSize[1].trim();
        }

      } catch (e) {
        console.log("Direct Scrape Failed, trying API...");
      }

      // --- METHOD 2: API Backup ---
      if (!downloadUrl || fileSize === "Unknown Size") {
        try {
          let apiRes = await axios.get(`https://api.davidcyriltech.my.id/mediafire?url=${encodeURIComponent(cleanUrl)}`);
          if (apiRes.data && apiRes.data.success && apiRes.data.result) {
            downloadUrl = apiRes.data.result.download_url || apiRes.data.result.link || downloadUrl;
            fileName = apiRes.data.result.filename || fileName;
            fileSize = apiRes.data.result.filesize || apiRes.data.result.size || fileSize;
          }
        } catch (e) {
          console.log("API Backup Failed...");
        }
      }

      // ඩවුන්ලෝඩ් ලින්ක් එක සොයාගත නොහැකි වූයේ නම්
      if (!downloadUrl) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to fetch Mediafire file! Make sure the link is valid and file is public.*");
      }

      const safeFileName = fileName.replace(/[^\w\s.-]/gi, '');

      // Attractive UI & Emoji Updated Caption
      let desc = `╭━━━〔 *📁 MEDIAFIRE DOWNLOADER* 〕━━━\n` +
                 `┃\n` +
                 `┃ 📄 *File Name:* ${safeFileName}\n` +
                 `┃ 📦 *File Size:* ${fileSize}\n` +
                 `┃ 🔗 *Status:* Ready to Send ✅\n` +
                 `┃\n` +
                 `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                 `> *⚡ Powered by SACHIYA-MD 💫*`;

      // 1. Send Banner / Info Card
      await sachiya.sendMessage(
        from,
        {
          image: { url: "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true" },
          caption: desc,
        },
        { quoted: mek }
      );

      // 2. Send Document File
      await sachiya.sendMessage(
        from,
        {
          document: { url: downloadUrl },
          mimetype: "application/octet-stream",
          fileName: safeFileName,
          caption: `📂 *${safeFileName}*\n📦 *Size:* ${fileSize}\n\n> *Downloaded by SACHIYA-MD 💫*`,
        },
        { quoted: mek }
      );

      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.error("Mediafire Error:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply(`❌ *Error:* ${e.message || "Failed to download file!"}`);
    }
  }
);
