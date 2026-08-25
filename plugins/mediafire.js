const { cmd } = require("../command");
const axios = require("axios");
const cheerio = require("cheerio");
const FormData = require("form-data");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");

// --- 1. MEDIAFIRE DOWNLOADER PLUGIN ---
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
        return reply("❌ *Please provide a valid Mediafire link!* \n\n*Example:* `.mediafire https://www.mediafire.com/file/...`");
      }

      await sachiya.sendMessage(from, { react: { text: "⏳", key: mek.key } });

      let cleanUrl = q.trim().split(" ")[0]; 
      let fileName = "Mediafire_File";
      let fileSize = "Unknown Size";
      let downloadUrl = null;

      // --- METHOD 1: Direct Web Scraping ---
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

      if (!downloadUrl) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to fetch Mediafire file! Make sure the link is valid and file is public.*");
      }

      const safeFileName = fileName.replace(/[^\w\s.-]/gi, '');

      let desc = `╭━━━〔 *📁 MEDIAFIRE DOWNLOADER* 〕━━━\n` +
                 `┃\n` +
                 `┃ 📂 *File Name:* ${safeFileName}\n` +
                 `┃ 📦 *Size:* ${fileSize}\n` +
                 `┃\n` +
                 `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                 `> *⚡ Powered by SACHIYA-MD 💫*`;

      await sachiya.sendMessage(
        from,
        {
          image: { url: "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true" },
          caption: desc,
        },
        { quoted: mek }
      );

      await sachiya.sendMessage(
        from,
        {
          document: { url: downloadUrl },
          mimetype: "application/octet-stream",
          fileName: safeFileName,
          caption: `📂 *${safeFileName}*\n\n> *Downloaded by SACHIYA-MD 💫*`,
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


// --- 2. MULTI-API CLOUD UPLOADER PLUGIN (Reply to any File/Video/Audio/Image) ---
cmd(
  {
    pattern: "uploadmf",
    alias: ["mfupload", "mifu"],
    react: "☁️",
    desc: "Upload media/documents to cloud sharing server with multi backups",
    category: "download",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, quoted, reply }) => {
    try {
      const targetQuoted = quoted ? quoted : (mek.msg?.contextInfo?.quotedMessage ? { message: mek.msg.contextInfo.quotedMessage } : null);
      
      if (!targetQuoted) {
        return reply("❌ *Please reply to any video, audio, image, or document to upload!*");
      }

      let type = '';
      let messageContent = targetQuoted.message || targetQuoted;
      
      if (messageContent.documentMessage) type = 'document';
      else if (messageContent.videoMessage) type = 'video';
      else if (messageContent.audioMessage) type = 'audio';
      else if (messageContent.imageMessage) type = 'image';

      if (!type) {
        return reply("❌ *The replied message is not a valid file, video, audio, or image!*");
      }

      await sachiya.sendMessage(from, { react: { text: "🔄", key: mek.key } });
      reply("⏳ *Uploading your file to the cloud server, please wait...*");

      const stream = await downloadContentFromMessage(messageContent[type + 'Message'], type);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      let originalFileName = messageContent[type + 'Message'].fileName || `SACHIYA_MD_${Date.now()}.${type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : type === 'audio' ? 'mp3' : 'bin'}`;
      let fileSizeMb = (buffer.length / (1024 * 1024)).toFixed(2) + " MB";

      let fileUrl = null;

      // --- BACKUP 1: Tmpfiles.org API ---
      try {
        const formData1 = new FormData();
        formData1.append('file', buffer, { filename: originalFileName });
        const res1 = await axios.post("https://tmpfiles.org/api/v1/upload", formData1, {
          headers: { ...formData1.getHeaders() },
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        });
        if (res1.data && res1.data.status === 'success' && res1.data.data?.url) {
          let rawLink = res1.data.data.url;
          fileUrl = rawLink.replace("tmpfiles.org/", "tmpfiles.org/dl/");
        }
      } catch (err1) {
        console.log("Tmpfiles upload failed, trying backup 2...");
      }

      // --- BACKUP 2: File.io API ---
      if (!fileUrl) {
        try {
          const formData2 = new FormData();
          formData2.append('file', buffer, { filename: originalFileName });
          const res2 = await axios.post("https://file.io", formData2, {
            headers: { ...formData2.getHeaders() },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
          });
          if (res2.data && res2.data.success && res2.data.link) {
            fileUrl = res2.data.link;
          }
        } catch (err2) {
          console.log("File.io upload failed, trying backup 3...");
        }
      }

      // --- BACKUP 3: Telegraph API ---
      if (!fileUrl) {
        try {
          const formData3 = new FormData();
          formData3.append('file', buffer, { filename: originalFileName });
          const res3 = await axios.post("https://telegra.ph/upload", formData3, {
            headers: { ...formData3.getHeaders() },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
          });
          if (res3.data && res3.data[0] && res3.data[0].src) {
            fileUrl = "https://telegra.ph" + res3.data[0].src;
          }
        } catch (err3) {
          console.log("Telegraph upload failed too.");
        }
      }

      if (!fileUrl) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *All cloud upload servers are currently busy or down! Please try again later.*");
      }

      let uploadSuccessDesc = `╭━━━〔 *☁️ FILE UPLOADED SUCCESS* 〕━━━\n` +
                              `┃\n` +
                              `┃ 📄 *File Name:* ${originalFileName}\n` +
                              `┃ 📦 *File Size:* ${fileSizeMb}\n` +
                              `┃ 🔗 *Direct Link:* ${fileUrl}\n` +
                              `┃\n` +
                              `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                              `> *⚡ Powered by SACHIYA-MD 💫*`;

      await sachiya.sendMessage(
        from,
        {
          image: { url: "https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true" },
          caption: uploadSuccessDesc,
        },
        { quoted: mek }
      );

      await sachiya.sendMessage(from, { react: { text: "✅", key: mek.key } });

    } catch (e) {
      console.error("Upload Error:", e);
      await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
      reply(`❌ *Upload Error:* ${e.message || "Something went wrong!"}`);
    }
  }
);
