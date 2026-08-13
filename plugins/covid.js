const { cmd } = require('../command');
const axios = require('axios');

cmd({
    pattern: "covid",
    alias: ["corona"],
    desc: "Check COVID-19 stats of country",
    category: "main",
    filename: __filename
},
async (conn, mek, m, { from, q, reply }) => {
    try {
        let country = q ? q : "Sri Lanka";
        const res = await axios.get(`https://disease.sh/v3/covid-19/countries/${encodeURIComponent(country)}`);
        const data = res.data;

        const covidMsg = `╭━━━〔 *COVID-19 STATS: ${data.country}* 〕━━━\n` +
                         `┃\n` +
                         `┃ 🦠 *Total Cases:* ${data.cases.toLocaleString()}\n` +
                         `┃ 💀 *Total Deaths:* ${data.deaths.toLocaleString()}\n` +
                         `┃ ✨ *Total Recovered:* ${data.recovered.toLocaleString()}\n` +
                         `┃ 🚨 *Active Cases:* ${data.active.toLocaleString()}\n` +
                         `┃ 🧪 *Total Tests:* ${data.tests.toLocaleString()}\n` +
                         `┃\n` +
                         `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                         `> *⚡ Powered by SACHIYA-MD 💫*`;

        reply(covidMsg);
    } catch (e) {
        reply("❌ අදාළ රටේ තොරතුරු සොයාගත නොහැකි විය. රටේ නම නිවැරදිදැයි පරීක්ෂා කරන්න!");
    }
});
