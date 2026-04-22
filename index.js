const express = require('express');
const wiegine = require('fca-mafiya');
const axios = require('axios');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 3000;
app.use(express.json());

let activeLocks = new Map();
const DB_FILE = 'drb_master_db.json';

if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ locks: [] }));

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DRB MASTER V4 | PRO EDITION</title>
    <style>
        :root { --bg: #0b0e14; --card: #151921; --border: #2d333b; --accent: #58a6ff; --green: #238636; --red: #da3633; --text: #adbac7; }
        body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', sans-serif; margin: 0; padding: 15px; display: flex; flex-direction: column; align-items: center; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 1px solid var(--border); width: 100%; padding-bottom: 15px; }
        .header h1 { color: var(--accent); margin: 0; font-size: 24px; text-transform: uppercase; letter-spacing: 2px; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; width: 100%; max-width: 500px; }
        .tool-card { background: var(--card); border: 1px solid var(--border); border-radius: 15px; padding: 25px 10px; text-align: center; cursor: pointer; transition: 0.3s; box-shadow: 0 4px 15px rgba(0,0,0,0.4); }
        .tool-card:hover { border-color: var(--accent); transform: translateY(-5px); background: #1c2128; }
        .icon { font-size: 40px; margin-bottom: 10px; display: block; }
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.9); z-index: 1000; padding: 15px; box-sizing: border-box; overflow-y: auto; }
        .modal-content { background: var(--card); border: 1px solid var(--border); border-radius: 20px; max-width: 450px; margin: 30px auto; padding: 25px; }
        textarea, input { width: 100%; background: #0d1117; border: 1px solid var(--border); color: #7ee787; padding: 12px; margin: 10px 0; border-radius: 10px; box-sizing: border-box; font-family: monospace; outline: none; }
        .main-btn { width: 100%; padding: 15px; background: var(--green); color: white; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; font-size: 16px; transition: 0.2s; }
        .main-btn:active { transform: scale(0.97); }
        .close-btn { background: var(--red); margin-top: 10px; }
        .res-box { background: #0d1117; border: 1px solid var(--border); border-radius: 10px; padding: 12px; margin-top: 10px; font-size: 13px; text-align: left; }
        .badge { background: var(--accent); color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px; float: right; cursor: pointer; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Deepak Rajput Brand</h1>
        <p style="font-size: 12px; color: #768390;">Advanced Automation Interface v4.0</p>
    </div>

    <div class="grid">
        <div class="tool-card" onclick="openTool('lock')"><span class="icon">🛡️</span><h3>Stealth Lock</h3></div>
        <div class="tool-card" onclick="openTool('extractor')"><span class="icon">📡</span><h3>UID Extractor</h3></div>
        <div class="tool-card" onclick="openTool('checker')"><span class="icon">💎</span><h3>Cookie Check</h3></div>
        <div class="tool-card" onclick="alert('Coming Soon!')"><span class="icon">✉️</span><h3>Msg Sender</h3></div>
    </div>

    <div id="modal" class="modal">
        <div class="modal-content">
            <h2 id="mTitle" style="color:var(--accent); margin-top:0;"></h2>
            <div id="mBody"></div>
            <button class="main-btn close-btn" onclick="closeModal()">Close Dashboard</button>
        </div>
    </div>

    <script>
        function closeModal() { document.getElementById('modal').style.display = 'none'; }
        async function openTool(type) {
            const m = document.getElementById('modal');
            const title = document.getElementById('mTitle');
            const body = document.getElementById('mBody');
            m.style.display = 'block';

            if(type === 'lock') {
                title.innerText = '🛡️ Stealth Nickname Lock';
                body.innerHTML = \`<textarea id="lck" placeholder="Paste AppState JSON"></textarea><input id="tid" placeholder="Group UID"><input id="nk" value="DEEPAK RAJPUT BRAND"><button class="main-btn" onclick="runLock()">Activate Lock</button>\`;
            } else if(type === 'extractor') {
                title.innerText = '📡 PRO UID Extractor';
                body.innerHTML = \`<textarea id="ein" placeholder="Paste Cookie/AppState"></textarea><button class="main-btn" onclick="runExtract()">Scan Groups</button><div id="eres"></div>\`;
            } else if(type === 'checker') {
                title.innerText = '💎 Premium Checker';
                body.innerHTML = \`<textarea id="cin" placeholder="Paste AppStates (One per line)"></textarea><button class="main-btn" onclick="runCheck()">Verify Status</button><div id="cres"></div>\`;
            }
        }

        async function runLock() {
            const data = { ck: document.getElementById('lck').value, tid: document.getElementById('tid').value, nk: document.getElementById('nk').value };
            await fetch('/add-lock', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
            alert("Lock Command Sent Successfully!");
        }

        async function runExtract() {
            const resDiv = document.getElementById('eres');
            resDiv.innerHTML = '<p style="color:var(--accent)">Scanning threads...</p>';
            const res = await fetch('/extract-uid', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ ck: document.getElementById('ein').value })
            });
            const data = await res.json();
            if(data.success) {
                resDiv.innerHTML = \`<b>👤 \${data.name}</b><br>\`;
                data.groups.forEach(g => {
                    resDiv.innerHTML += \`<div class="res-box">\${g.name} <span class="badge" onclick="navigator.clipboard.writeText('\${g.id}');alert('Copied')">\${g.id}</span></div>\`;
                });
            } else { resDiv.innerHTML = '<p style="color:var(--red)">Failed to fetch!</p>'; }
        }

        async function runCheck() {
            const lines = document.getElementById('cin').value.trim().split('\\n').filter(Boolean);
            const resDiv = document.getElementById('cres');
            resDiv.innerHTML = '<p>Checking...</p>';
            for(let c of lines) {
                const r = await fetch('/check-cookie', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ ck: c }) }).then(res => res.json());
                resDiv.innerHTML += \`<div class="res-box" style="border-left:4px solid \${r.status === 'LIVE' ? 'var(--green)' : 'var(--red)'}"><b>\${r.name}</b> [\${r.status}]</div>\`;
            }
        }
    </script>
</body>
</html>`;

// --- Backend Logic ---

app.get('/', (req, res) => res.send(htmlContent));

app.post('/extract-uid', (req, res) => {
    const { ck } = req.body;
    wiegine.login(ck, { logLevel: 'silent' }, (err, api) => {
        if (err || !api) return res.json({ success: false });
        const uid = api.getCurrentUserID();
        api.getThreadList(50, null, ["INBOX"], (err, list) => {
            const groups = (!err && list) ? list.filter(t => t.isGroup).map(g => ({ name: g.name || "Unnamed Group", id: g.threadID })) : [];
            api.getUserInfo(uid, (e, info) => {
                res.json({ success: true, name: info[uid]?.name || "Account OK", groups });
            });
        });
    });
});

app.post('/check-cookie', (req, res) => {
    const { ck } = req.body;
    wiegine.login(ck, { logLevel: 'silent' }, (err, api) => {
        if (err || !api) return res.json({ name: "Dead", status: "DEAD" });
        api.getUserInfo(api.getCurrentUserID(), (e, info) => {
            res.json({ name: info[api.getCurrentUserID()]?.name || "Live", status: "LIVE" });
        });
    });
});

app.post('/add-lock', (req, res) => {
    const { ck, tid, nk } = req.body;
    wiegine.login(ck, { logLevel: 'silent', forceLogin: true }, (err, api) => {
        if (err || !api) return;
        api.setOptions({ listenEvents: true, selfListen: false });
        
        // Anti-Change Loop (The Fix)
        api.listenMqtt((err, event) => {
            if (event?.logMessageType === "log:user-nickname" && event.threadID === tid) {
                if (event.logMessageData.nickname !== nk) {
                    api.changeNickname(nk, tid, event.logMessageData.participant_id, () => {});
                }
            }
        });
    });
    res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => console.log('DRB Master v4 Ready!'));
