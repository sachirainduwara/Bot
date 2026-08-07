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

      reply("⏳ *Fetching Mediafire File... Please wait!*");

      // Link Clean කර ගැනීම
      let cleanUrl = q.trim().split(" ")[0].split("?")[0]; 

      let fileName = "Mediafire_File";
      let fileSize = "Unknown Size";
      let downloadUrl = null;

      // --- METHOD 1: Direct Web Scraping (Most Reliable) ---
      try {
        const pageRes = await axios.get(cleanUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
          }
        });
        const $ = cheerio.load(pageRes.data);

        downloadUrl = $("#downloadButton").attr("href");
        
        let rawTitle = $(".dl-btn-label").attr("title");
        if (rawTitle) fileName = rawTitle.replace("Download file ", "").trim();
        
        let rawInfo = $(".dl-btn-label").text();
        let sizeMatch = rawInfo.match(/\((.*?)\)/);
        if (sizeMatch && sizeMatch[1]) fileSize = sizeMatch[1];

      } catch (e) {
        console.log("Direct Scrape Failed, trying API...");
      }

      // --- METHOD 2: API Backup ---
      if (!downloadUrl) {
        try {
          let apiRes = await axios.get(`https://api.davidcyriltech.my.id/mediafire?url=${encodeURIComponent(cleanUrl)}`);
          if (apiRes.data && apiRes.data.success && apiRes.data.result) {
            downloadUrl = apiRes.data.result.download_url || apiRes.data.result.link;
            fileName = apiRes.data.result.filename || fileName;
            fileSize = apiRes.data.result.filesize || fileSize;
          }
        } catch (e) {
          console.log("API Backup Failed...");
        }
      }

      // ඡේදය සොයාගත නොහැකි වූයේ නම්
      if (!downloadUrl) {
        return reply("❌ *Failed to fetch Mediafire file! Make sure the link is valid and file is public.*");
      }

      let desc = `*─── ｢ 📁 MEDIAFIRE DOWNLOADER ｣ ───*

📂 *File Name:* ${fileName}
📦 *Size:* ${fileSize}

> *SACHIYA WHATSAPP MINI BOT* 🧬`;

      // 1. Send Banner
      await sachiya.sendMessage(
        from,
        {
          image: { url: "https://github.com/sachirainduwara/Bot/blob/main/Media/SACHIYA%20MD.png?raw=true" },
          caption: desc,
        },
        { quoted: mek }
      );

      // 2. Send Document File
      await sachiya.sendMessage(
        from,
        {
          document: { url: downloadUrl },
          mimetype: "application/zip",
          fileName: fileName,
          caption: `📂 *${fileName}*\n\n> Downloaded by SACHIYA-MD`,
        },
        { quoted: mek }
      );

    } catch (e) {
      console.error(e);
      reply(`❌ *Error:* ${e.message || "Failed to download file!"}`);
    }
  }
);
