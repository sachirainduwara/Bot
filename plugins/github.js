const axios = require('axios');
const { cmd } = require("../command");

// 1. WhatsApp Bot Command (.gitrepo <owner/repo>) - ZIP ෆයිල් එක සෙන්ඩ් කිරීම
cmd(
    {
        pattern: "gitrepo",
        alias: ["github", "repo"],
        desc: "Download GitHub repository as a ZIP file directly",
        category: "download",
        react: "📦",
        filename: __filename,
    },
    async (sachiya, mek, m, { reply, q }) => {
        try {
            if (!q) {
                return reply("❌ *Please provide a repository name!* \n\n*Example:* `.gitrepo sachirainduwara/Sachiya-MD`");
            }

            let repoInput = q.trim();
            if (repoInput.includes('github.com')) {
                try {
                    const urlParts = new URL(repoInput).pathname.split('/').filter(Boolean);
                    if (urlParts.length >= 2) {
                        repoInput = `${urlParts[0]}/${urlParts[1]}`;
                    }
                } catch(e) {}
            }

            // GitHub API එකෙන් රෙපො විස්තර ලබා ගැනීම
            const response = await axios.get(`https://api.github.com/repos/${repoInput}`);
            const repo = response.data;

            await reply(`⏳ *Downloading ${repo.full_name} ZIP file, please wait...*`);

            // ZIP ෆයිල් එක බෆර් එකක් (Buffer) ලෙස ඩවුන්ලෝඩ් කරගැනීම (main හෝ default branch එක මඟින්)
            const branch = repo.default_branch || 'main';
            const zipUrl = `https://github.com/${repo.full_name}/archive/refs/heads/${branch}.zip`;
            
            const zipResponse = await axios.get(zipUrl, { responseType: 'arraybuffer' });
            const zipBuffer = Buffer.from(zipResponse.data);

            // ඩීටෙයිල්ස් සමඟ ලස්සන කැප්ෂන් එකක් හැදීම
            let caption = `╭━━━〔 *📦 GITHUB REPOSITORY* 〕━━━\n`;
            caption += `┃\n`;
            caption += `┃ 📌 *Name:* \`${repo.full_name}\`\n`;
            caption += `┃ 📝 *Description:* ${repo.description || 'No description'}\n`;
            caption += `┃ ⭐ *Stars:* \`${repo.stargazers_count}\`\n`;
            caption += `┃ 🍴 *Forks:* \`${repo.forks_count}\`\n`;
            caption += `┃\n`;
            caption += `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
            caption += `> *⚡ Powered by SACHIYA-MD 💫*`;

            // වට්ස්ඇප් චැට් එකට ZIP ෆයිල් එක Document එකක් ලෙස යැවීම
            await sachiya.sendMessage(m.chat, {
                document: zipBuffer,
                mimetype: 'application/zip',
                fileName: `${repo.name}-${branch}.zip`,
                caption: caption
            }, { quoted: mek });

        } catch (e) {
            console.error(e);
            return reply("❌ *Repository not found, or it's private / branch name mismatch!*");
        }
    }
);

// 2. Web UI සහ API සඳහා Express Handlers (index.js එක ස්පර්ශ නොකර ක්‍රියාත්මක වේ)
module.exports = {
    // වෙබ් සයිට් එකට ලින්ක් කළ විට පෙනෙන UI එක (HTML)
    webpage: `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>GitHub Repo Inspector & Downloader</title>
        <style>
            * { box-sizing: border-box; }
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
            .container { width: 100%; max-width: 600px; background: #1e293b; padding: 30px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.6); border: 1px solid #334155; }
            h2 { text-align: center; color: #38bdf8; margin-bottom: 25px; font-size: 24px; }
            .input-group { display: flex; gap: 10px; margin-bottom: 20px; }
            input { flex: 1; padding: 14px; border: 1px solid #475569; border-radius: 10px; background: #0f172a; color: #fff; font-size: 16px; outline: none; }
            input:focus { border-color: #38bdf8; }
            button { background: #2563eb; color: white; border: none; padding: 14px 22px; border-radius: 10px; font-size: 16px; font-weight: bold; cursor: pointer; transition: 0.3s; }
            button:hover { background: #1d4ed8; }
            .result-box { background: #0f172a; padding: 20px; border-radius: 12px; border: 1px solid #334155; margin-top: 20px; display: none; }
            .repo-title { color: #38bdf8; margin-top: 0; font-size: 20px; }
            .stats { display: flex; gap: 20px; margin: 15px 0; font-size: 14px; color: #94a3b8; }
            .download-btn { display: block; text-align: center; background: #16a34a; color: white; padding: 12px; border-radius: 10px; text-decoration: none; font-weight: bold; margin-top: 20px; transition: 0.3s; }
            .download-btn:hover { background: #15803d; }
            .loading { text-align: center; display: none; color: #38bdf8; margin: 15px 0; font-weight: bold; }
            .error { color: #f87171; text-align: center; font-weight: bold; background: rgba(248, 113, 113, 0.1); padding: 12px; border-radius: 8px; margin-top: 15px; display: none; }
        </style>
    </head>
    <body>
        <div class="container">
            <h2>GitHub Repo Downloader</h2>
            <div class="input-group">
                <input type="text" id="repoInput" placeholder="Enter repo URL or owner/repo">
                <button onclick="fetchRepo()">Search</button>
            </div>
            <div id="loading" class="loading">🔍 Fetching repository details...</div>
            <div id="errorMsg" class="error"></div>
            <div id="resultBox" class="result-box">
                <h3 id="repoName" class="repo-title"></h3>
                <p id="repoDesc" style="color: #cbd5e1; font-size: 14px; line-height: 1.5;"></p>
                <div class="stats">
                    <span>⭐ Stars: <strong id="repoStars" style="color:#fff;"></strong></span>
                    <span>🍴 Forks: <strong id="repoForks" style="color:#fff;"></strong></span>
                </div>
                <a id="downloadBtn" class="download-btn" href="#" target="_blank">📥 Download ZIP File</a>
            </div>
        </div>
        <script>
            async function fetchRepo() {
                let input = document.getElementById('repoInput').value.trim();
                const resultBox = document.getElementById('resultBox');
                const loading = document.getElementById('loading');
                const errorMsg = document.getElementById('errorMsg');
                resultBox.style.display = 'none';
                errorMsg.style.display = 'none';
                if (!input) { errorMsg.innerText = "Please enter a repository URL or name!"; errorMsg.style.display = 'block'; return; }
                if (input.includes('github.com')) {
                    try {
                        const urlParts = new URL(input).pathname.split('/').filter(Boolean);
                        if (urlParts.length >= 2) { input = \`\${urlParts[0]}/\${urlParts[1]}\`; }
                    } catch(e) {}
                }
                loading.style.display = 'block';
                try {
                    const res = await fetch(\`/api/github?repo=\${encodeURIComponent(input)}\`);
                    const data = await res.json();
                    loading.style.display = 'none';
                    if (data.error) { errorMsg.innerText = data.error; errorMsg.style.display = 'block'; }
                    else {
                        document.getElementById('repoName').innerText = data.name;
                        document.getElementById('repoDesc').innerText = data.description || "No description provided.";
                        document.getElementById('repoStars').innerText = data.stars;
                        document.getElementById('repoForks').innerText = data.forks;
                        document.getElementById('downloadBtn').href = data.downloadUrl;
                        resultBox.style.display = 'block';
                    }
                } catch (err) { loading.style.display = 'none'; errorMsg.innerText = "Failed to connect to the server!"; errorMsg.style.display = 'block'; }
            }
        </script>
    </body>
    </html>
    `,

    // රවුටර් හෝ සර්වර් එකට අවශ්‍ය API ලොජික් එක
    registerRoutes: (app) => {
        // වෙබ් සයිට් ප්‍රධාන පිටුවට ලෝඩ් වීම සඳහා
        app.get('/github-ui', (req, res) => {
            res.send(module.exports.webpage);
        });

        // GitHub දත්ත ලබා දෙන API එක
        app.get('/api/github', async (req, res) => {
            let repo = req.query.repo;
            if (!repo) return res.json({ error: "Repository name is required!" });
            try {
                const response = await axios.get(`https://api.github.com/repos/${repo}`);
                const data = response.data;
                const branch = data.default_branch || 'main';
                res.json({
                    name: data.full_name,
                    description: data.description,
                    stars: data.stargazers_count,
                    forks: data.forks_count,
                    downloadUrl: `https://github.com/${data.full_name}/archive/refs/heads/${branch}.zip`
                });
            } catch (err) {
                res.json({ error: "Repository not found on GitHub!" });
            }
        });
    }
};
