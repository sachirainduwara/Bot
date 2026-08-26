const { cmd } = require('../command');
const axios = require('axios');

// 🌐 Public Movie Scraper / API helper for SACHIYA-MD
cmd({
    pattern: "movie",
    alias: ["film", "downloadmovie"],
    desc: "Search and download movies with quality & format options",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, q, reply, sender }) => {
    try {
        if (!q) {
            return await reply(
                `╭━━━〔 *🎬 MOVIE FINDER* 〕━━━\n` +
                `┃\n` +
                `┃ ❌ *Please provide a movie name!*\n` +
                `┃ 📌 *Example:* \`.movie Leo\`\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `> *⚡ Powered by SACHIYA-MD 💫*`
            );
        }

        await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

        // Public reliable Sinhala/English movie site api / mirror data parser
        let searchUrl = `https://www.dark-yasiya-api.site/movie/search?text=${encodeURIComponent(q)}`;
        let response = await axios.get(searchUrl);
        let resData = response.data;

        if (!resData || !resData.status || !resData.data || resData.data.length === 0) {
            return await reply(`*❌ No movies found for:* "${q}". *Please check the spelling and try again!*`);
        }

        let movies = resData.data;
        let listText = `╭━━━〔 *🎬 SACHIYA-MD MOVIE SEARCH* 〕━━━\n` +
                       `┃\n` +
                       `┃ 🔍 *Search Query:* ${q}\n` +
                       `┃ 📊 *Results Found:* ${movies.length}\n` +
                       `┃\n`;

        for (let i = 0; i < Math.min(movies.length, 10); i++) {
            listText += `┃ *[${i + 1}]* ${movies[i].title} (${movies[i].year})\n` +
                        `┃      🔗 \`${movies[i].url}\`\n`;
        }

        listText += `┃\n` +
                    `┃ 📌 *Reply with the number [1-${Math.min(movies.length, 10)}] to select a movie.*\n` +
                    `┃ *(Valid for 15 Minutes)*\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `> *⚡ Powered by SACHIYA-MD 💫*`;

        let sentMsg = await conn.sendMessage(from, {
            image: { url: movies[0].image || 'https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true' },
            caption: listText
        }, { quoted: mek });

        const messageID = sentMsg.key.id;

        // Interactive Step 1: Movie Selection Listener
        const movieListener = async (chatUpdate) => {
            try {
                const mekResp = chatUpdate.messages[0];
                if (!mekResp || !mekResp.message) return;

                const respText = mekResp.message.conversation || mekResp.message.extendedTextMessage?.text || "";
                const senderID = mekResp.key.remoteJid;
                const isReply = mekResp.message.extendedTextMessage?.contextInfo?.stanzaId === messageID;

                if (isReply && senderID === from && respText) {
                    let selectedIndex = parseInt(respText.trim()) - 1;

                    if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= Math.min(movies.length, 10)) {
                        await conn.sendMessage(from, { text: `*❌ Invalid selection! Please reply with a number between 1 and ${Math.min(movies.length, 10)}.*` }, { quoted: mekResp });
                        return;
                    }

                    conn.ev.off("messages.upsert", movieListener);
                    let chosenMovie = movies[selectedIndex];

                    await conn.sendMessage(from, { react: { text: "⏳", key: mekResp.key } });

                    // Fetch Movie Details & Download Links
                    let detailUrl = `https://www.dark-yasiya-api.site/movie/imped?url=${encodeURIComponent(chosenMovie.url)}`;
                    let detailRes = await axios.get(detailUrl);
                    let movieInfo = detailRes.data?.result;

                    if (!movieInfo || !movieInfo.dl_links || movieInfo.dl_links.length === 0) {
                        return await conn.sendMessage(from, { text: `*❌ Sorry, download links are not available for this movie right now!*` }, { quoted: mekResp });
                    }

                    let qualityText = `╭━━━〔 *🎬 SELECT MOVIE QUALITY* 〕━━━\n` +
                                      `┃\n` +
                                      `┃ 📌 *Title:* ${movieInfo.title}\n` +
                                      `┃ 📅 *Released:* ${movieInfo.date || 'N/A'}\n` +
                                      `┃ ⭐ *Rating:* ${movieInfo.rating || 'N/A'}\n` +
                                      `┃\n`;

                    let linksArray = movieInfo.dl_links;
                    for (let j = 0; j < linksArray.length; j++) {
                        qualityText += `┃ *[${j + 1}]* ${linksArray[j].quality} (${linksArray[j].size})\n`;
                    }

                    qualityText += `┃\n` +
                                   `┃ 📌 *Reply with the Quality Number [1-${linksArray.length}]*\n` +
                                   `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                                   `> *⚡ Powered by SACHIYA-MD 💫*`;

                    let qMsg = await conn.sendMessage(from, {
                        image: { url: movieInfo.image || chosenMovie.image },
                        caption: qualityText
                    }, { quoted: mekResp });

                    const qMessageID = qMsg.key.id;

                    // Interactive Step 2: Quality Selection Listener
                    const qualityListener = async (qualityUpdate) => {
                        try {
                            const qMekResp = qualityUpdate.messages[0];
                            if (!qMekResp || !qMekResp.message) return;

                            const qRespText = qMekResp.message.conversation || qMekResp.message.extendedTextMessage?.text || "";
                            const qSenderID = qMekResp.key.remoteJid;
                            const isQReply = qMekResp.message.extendedTextMessage?.contextInfo?.stanzaId === qMessageID;

                            if (isQReply && qSenderID === from && qRespText) {
                                let qIndex = parseInt(qRespText.trim()) - 1;

                                if (isNaN(qIndex) || qIndex < 0 || qIndex >= linksArray.length) {
                                    await conn.sendMessage(from, { text: `*❌ Invalid quality choice! Reply with 1 to ${linksArray.length}.*` }, { quoted: qMekResp });
                                    return;
                                }

                                conn.ev.off("messages.upsert", qualityListener);
                                let selectedQuality = linksArray[qIndex];

                                // Interactive Step 3: Format Selection (Video or Document)
                                let formatText = `╭━━━〔 *📦 CHOOSE FILE FORMAT* 〕━━━\n` +
                                                 `┃\n` +
                                                 `┃ 🎥 *Selected:* ${movieInfo.title} [${selectedQuality.quality}]\n` +
                                                 `┃ 💾 *Size:* ${selectedQuality.size}\n` +
                                                 `┃\n` +
                                                 `┃ *[1]* 🎬 Send as Video File (.mp4)\n` +
                                                 `┃ *[2]* 📁 Send as Document File (High Quality)\n` +
                                                 `┃\n` +
                                                 `┃ 📌 *Reply with 1 or 2*:\n` +
                                                 `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                                                 `> *⚡ Powered by SACHIYA-MD 💫*`;

                                let fMsg = await conn.sendMessage(from, { text: formatText }, { quoted: qMekResp });
                                const fMessageID = fMsg.key.id;

                                const formatListener = async (formatUpdate) => {
                                    try {
                                        const fMekResp = formatUpdate.messages[0];
                                        if (!fMekResp || !fMekResp.message) return;

                                        const fRespText = fMekResp.message.conversation || fMekResp.message.extendedTextMessage?.text || "";
                                        const fSenderID = fMekResp.key.remoteJid;
                                        const isFReply = fMekResp.message.extendedTextMessage?.contextInfo?.stanzaId === fMessageID;

                                        if (isFReply && fSenderID === from && fRespText) {
                                            let choice = fRespText.trim();

                                            if (choice !== "1" && choice !== "2") {
                                                await conn.sendMessage(from, { text: `*❌ Invalid choice! Reply with '1' for Video or '2' for Document.*` }, { quoted: fMekResp });
                                                return;
                                            }

                                            conn.ev.off("messages.upsert", formatListener);
                                            await conn.sendMessage(from, { react: { text: "📥", key: fMekResp.key } });
                                            await reply(`*⏳ Downloading your movie (${selectedQuality.quality}). Please wait a moment...*`);

                                            // Direct file stream link resolution
                                            let directDLUrl = selectedQuality.link;
                                            // Handle redirection links if necessary
                                            if (directDLUrl.includes('pixeldrain.com') && !directDLUrl.includes('/api/file/')) {
                                                let fileId = directDLUrl.split('/').pop();
                                                directDLUrl = `https://pixeldrain.com/api/file/${fileId}`;
                                            }

                                            let caption = `╭━━━〔 *🎬 SACHIYA-MD MOVIE* 〕━━━\n` +
                                                          `┃\n` +
                                                          `┃ 📌 *Title:* ${movieInfo.title}\n` +
                                                          `┃ ⚙️ *Quality:* ${selectedQuality.quality}\n` +
                                                          `┃ 💾 *Size:* ${selectedQuality.size}\n` +
                                                          `┃\n` +
                                                          `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                                                          `> *⚡ Powered by SACHIYA-MD 💫*`;

                                            if (choice === "1") {
                                                // Send as Video
                                                await conn.sendMessage(from, {
                                                    video: { url: directDLUrl },
                                                    mimetype: "video/mp4",
                                                    caption: caption
                                                }, { quoted: fMekResp });
                                            } else {
                                                // Send as Document
                                                let safeFileName = `${movieInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}_${selectedQuality.quality}.mp4`;
                                                await conn.sendMessage(from, {
                                                    document: { url: directDLUrl },
                                                    mimetype: "video/mp4",
                                                    fileName: safeFileName,
                                                    caption: caption
                                                }, { quoted: fMekResp });
                                            }

                                            await conn.sendMessage(from, { react: { text: "✅", key: fMekResp.key } });
                                        }
                                    } catch (err) {
                                        console.log("Format Selection Error:", err);
                                    }
                                };

                                conn.ev.on("messages.upsert", formatListener);
                                setTimeout(() => conn.ev.off("messages.upsert", formatListener), 10 * 60 * 1000);

                            }
                        } catch (err) {
                            console.log("Quality Selection Error:", err);
                        }
                    };

                    conn.ev.on("messages.upsert", qualityListener);
                    setTimeout(() => conn.ev.off("messages.upsert", qualityListener), 10 * 60 * 1000);

                }
            } catch (err) {
                console.log("Movie Selection Error:", err);
            }
        };

        conn.ev.on("messages.upsert", movieListener);
        setTimeout(() => conn.ev.off("messages.upsert", movieListener), 15 * 60 * 1000);

    } catch (e) {
        console.log("Movie Search Error:", e);
        return reply(`*❌ Error occurred while searching movie:* ${e.message}`);
    }
});
