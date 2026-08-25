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


// --- 2. MEDIAFIRE UPLOADER PLUGIN (Reply to any File/Video/Audio/Image) ---
cmd(
  {
    pattern: "uploadmf",
    alias: ["mfupload", "mifu"],
    react: "☁️",
    desc: "Upload media/documents to file sharing / mediafire supported cloud",
    category: "download",
    filename: __filename,
  },
  async (sachiya, mek, m, { from, quoted, reply }) => {
    try {
      const targetQuoted = quoted ? quoted : (mek.msg?.contextInfo?.quotedMessage ? { message: mek.msg.contextInfo.quotedMessage } : null);
      
      if (!targetQuoted) {
        return reply("❌ *Please reply to any video, audio, image, or document to upload!*");
      }

      // Check media type
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

      // Download media stream from whatsapp
      const stream = await downloadContentFromMessage(messageContent[type + 'Message'], type);
      let buffer = Buffer.from([]);
      for await (const chunk of stream) {
        buffer = Buffer.concat([buffer, chunk]);
      }

      let originalFileName = messageContent[type + 'Message'].fileName || `SACHIYA_MD_${Date.now()}.${type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : type === 'audio' ? 'mp3' : 'bin'}`;
      let fileSizeMb = (buffer.length / (1024 * 1024)).toFixed(2) + " MB";

      // Upload via public file upload API (Telegraph / Catbox / Tmpfiles backup integration)
      const formData = new FormData();
      formData.append('file', buffer, { filename: originalFileName });

      let uploadRes;
      try {
        uploadRes = await axios.post("https://itzpire.com/tools/upload", formData, {
          headers: { ...formData.getHeaders() },
          maxBodyLength: Infinity,
          maxContentLength: Infinity
        });
      } catch (err) {
        // Backup Uploader
        try {
          const formAlt = new FormData();
          formAlt.append('reqtype', 'fileupload');
          formAlt.append('fileToUpload', buffer, { filename: originalFileName });
          uploadRes = await axios.post("https://catbox.moe/user/api.php", formAlt, {
            headers: { ...formAlt.getHeaders() },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
          });
          if (uploadRes.data) {
            uploadRes = { data: { status: true, result: { url: uploadRes.data } } };
          }
        } catch (e2) {
          throw new Error("Cloud upload service failed. Try again later.");
        }
      }

      let fileUrl = uploadRes.data?.result?.url || uploadRes.data?.url || uploadRes.data?.link;

      if (!fileUrl) {
        await sachiya.sendMessage(from, { react: { text: "❌", key: mek.key } });
        return reply("❌ *Failed to upload file to the server!*");
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
