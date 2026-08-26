const { cmd } = require('../command');
const { baiscopelksearch, baiscopelkdownload } = require('baiscopelk-api');

cmd({
    pattern: "movie",
    alias: ["film", "downloadmovie"],
    desc: "Search and download movies from Baiscope.lk interactively",
    category: "download",
    react: "🎬",
    filename: __filename
}, async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) {
            return await reply(
                `╭━━━〔 *🎬 MOVIE FINDER* 〕━━━\n` +
                `┃\n` +
                `┃ ❌ *Please provide a movie name!*\n` +
                `┃ 📌 *Example:* \`.movie Bird Box\`\n` +
                `┃\n` +
                `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `> *⚡ Powered by SACHIYA-MD 💫*`
            );
        }

        await conn.sendMessage(from, { react: { text: "🔍", key: mek.key } });

        // Baiscope.lk Search API
        let searchRes = await baiscopelksearch(q);
        let movies = searchRes?.results;

        if (!movies || movies.length === 0) {
            return await reply(`*❌ No movies found for:* "${q}". *Please check the spelling and try again!*`);
        }

        let listText = `╭━━━〔 *🎬 BAISCOPE MOVIE SEARCH* 〕━━━\n` +
                       `┃\n` +
                       `┃ 🔍 *Search Query:* ${q}\n` +
                       `┃ 📊 *Results Found:* ${movies.length}\n` +
                       `┃\n`;

        for (let i = 0; i < Math.min(movies.length, 10); i++) {
            listText += `┃ *[${i + 1}]* ${movies[i].title}\n`;
        }

        listText += `┃\n` +
                    `┃ 📌 *Reply with the number [1-${Math.min(movies.length, 10)}] to select a movie.*\n` +
                    `┃ *(Valid for 15 Minutes)*\n` +
                    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                    `> *⚡ Powered by SACHIYA-MD 💫*`;

        let sentMsg = await conn.sendMessage(from, {
            text: listText
        }, { quoted: mek });

        const messageID = sentMsg.key.id;

        // Interactive Step: Movie Selection Listener
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
                    await reply(`*⏳ Fetching download details for: ${chosenMovie.title}...*`);

                    // Fetch Download Info using Baiscopelk download api
                    let downloadInfo = await baiscopelkdownload(chosenMovie.url);

                    if (!downloadInfo || !downloadInfo.DOWN_URL) {
                        return await conn.sendMessage(from, { text: `*❌ Sorry, direct download link not found for this movie!*` }, { quoted: mekResp });
                    }

                    // Format Selection (Video or Document)
                    let formatText = `╭━━━〔 *📦 CHOOSE FILE FORMAT* 〕━━━\n` +
                                     `┃\n` +
                                     `┃ 📌 *Title:* ${downloadInfo.title}\n` +
                                     `┃\n` +
                                     `┃ *[1]* 🎬 Send as Video File (.mp4)\n` +
                                     `┃ *[2]* 📁 Send as Document File (High Quality)\n` +
                                     `┃\n` +
                                     `┃ 📌 *Reply with 1 or 2*:\n` +
                                     `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                                     `> *⚡ Powered by SACHIYA-MD 💫*`;

                    let fMsg = await conn.sendMessage(from, {
                        image: { url: downloadInfo.image || 'https://github.com/sachirainduwara/Bot/blob/main/images/SACHIYA%20MD.png?raw=true' },
                        caption: formatText
                    }, { quoted: mekResp });

                    let fMessageID = fMsg.key.id;

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
                                await reply(`*⏳ Downloading movie file. Please wait a moment...*`);

                                let directDLUrl = downloadInfo.DOWN_URL;
                                let caption = `╭━━━〔 *🎬 SACHIYA-MD MOVIE* 〕━━━\n` +
                                              `┃\n` +
                                              `┃ 📌 *Title:* ${downloadInfo.title}\n` +
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
                                    let safeFileName = `${downloadInfo.title.replace(/[^a-zA-Z0-9]/g, '_')}.mp4`;
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
