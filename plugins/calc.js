const { cmd } = require('../command');

cmd({
    pattern: "calc",
    alias: ["calculate", "math"],
    desc: "Calculate simple mathematical equations",
    category: "tools",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        if (!q) return reply("⚠️ කරුණාකර ගණිත ගැටළුවක් ලබා දෙන්න!\nඋදා: `.calc 50 + 50 * 2`");
        
        // Safe evaluation
        let result;
        try {
            result = Function(`'use strict'; return (${q})`)();
        } catch (err) {
            return reply("❌ වැරදි ගණිත සමීකරණයකි. කරුණාකර පරීක්ෂා කරන්න!");
        }

        const calcMsg = `╭━━━〔 *SACHIYA-MD CALCULATOR* 〕━━━\n` +
                        `┃\n` +
                        `┃ 📥 *Equation:* ${q}\n` +
                        `┃ 📤 *Answer:* ${result}\n` +
                        `┃\n` +
                        `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                        `> *⚡ Powered by SACHIYA-MD 💫*`;

        reply(calcMsg);
    } catch (e) {
        reply("❌ ගණනය කිරීමේදී දෝෂයක් ඇති විය!");
    }
});
