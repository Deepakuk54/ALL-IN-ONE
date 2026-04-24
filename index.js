const express = require('express');
const wiegine = require('fca-mafiya');
const fs = require('fs');
const path = require('path');
const app = express();

const PORT = process.env.PORT || 10000;
app.use(express.json());

// Database Setup
let activeLocks = new Map();
const DB_FILE = path.join('/tmp', 'drb_master_v5.json');
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([]));

// --- PROFESSIONAL COOKIE PARSER ---
function getLoginData(input) {
    input = input.trim();
    if (input.startsWith('[')) return { appState: JSON.parse(input) };
    
    const parsed = input.split(';').map(i => {
        const [name, ...value] = i.split('=');
        if (!name || !value.length) return null;
        return {
            key: name.trim(),
            value: value.join('=').trim(),
            domain: "facebook.com",
            path: "/",
            hostOnly: false
        };
    }).filter(Boolean);
    return { appState: parsed };
}

// --- DASHBOARD UI ---
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>DRB MASTER - PRO PANEL</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        :root { --bg: #080a0f; --card: #11141d; --border: #1f2633; --accent: #00d2ff; --green: #00ff88; --red: #ff4b2b; --text: #e0e6ed; }
        body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', sans-serif; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; }
        .header { text-align: center; margin-bottom: 25px; }
        .header h1 { font-size: 22px; background: linear-gradient(to right, #00d2ff, #3a7bd5); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0; text-transform: uppercase; font-weight: 900; letter-spacing: 1.5px; }
        .grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; width: 100%; max-width: 480px; }
        .tool-card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 20px 5px; text-align: center; cursor: pointer; transition: 0.3s; }
        .tool-card i { font-size: 30px; margin-bottom: 8px; display: block; color: var(--accent); }
        .tool-card h3 { font-size: 11px; margin: 0; color: #fff; text-transform: uppercase; }
        
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.92); z-index: 1000; padding: 10px; box-sizing: border-box; overflow-y: auto; }
        .modal-content { background: var(--card); border: 1px solid var(--border); border-radius: 15px; max-width: 450px; margin: 20px auto; padding: 20px; border-top: 3px solid var(--accent); }
        
        textarea, input { width: 100%; background: #000; border: 1px solid var(--border); color: var(--green); padding: 12px; margin: 8px 0; border-radius: 8px; box-sizing: border-box; outline: none; font-family: monospace; font-size: 12px; }
        .btn-main { width: 100%; padding: 14px; background: linear-gradient(135deg, #00d2ff, #3a7bd5); color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; margin-top: 5px; text-transform: uppercase; }
        .btn-copy { background: #1a1d26; color: var(--accent); border: 1px solid var(--accent); padding: 10px; width: 100%; border-radius: 8px; cursor: pointer; font-size: 11px; margin-top: 8px; font-weight: bold; }
        .btn-close { background: transparent; border: 1px solid var(--red); color: var(--red); margin-top: 15px; width: 100%; padding: 10px; border-radius: 8px; cursor: pointer; font-size: 11px; font-weight: bold; }
        
        .res-item { background: #000; border: 1px solid var(--border); padding: 10px; border-radius: 8px; margin-top: 8px; text-align: left; font-size: 11px; border-left: 3px solid var(--accent); position: relative; word-break: break-all; }
        .stop-btn { position: absolute; right: 8px; top: 8px; background: var(--red); color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-size: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>DEEPAK RAJPUT BRAND</h1>
        <p style="color:#5c6b84; font-size: 10px;">PREMIUM MASTER PANEL V5.1</p>
    </div>
    
    <div class="grid">
        <div class="tool-card" onclick="openTool('lock')"><i class="fa-solid fa-user-lock"></i><h3>Nickname Lock</h3></div>
        <div class="tool-card" onclick="openTool('extract')"><i class="fa-solid fa-satellite-dish"></i><h3>UID Extractor</h3></div>
        <div class="tool-card" onclick="openTool('check')"><i class="fa-solid fa-vial-circle-check"></i><h3>Cookie Check</h3></div>
        <div class="tool-card" onclick="alert('Coming Soon!')"><i class="fa-solid fa-paper-plane"></i><h3>Msg Sender</h3></div>
    </div>

    <div id="modal" class="modal">
        <div class="modal-content">
            <h2 id="mTitle" style="color:var(--accent); margin-bottom:15px; text-align:center; font-size: 16px; text-transform: uppercase;"></h2>
            <div id="mBody"></div>
            <button class="btn-close" onclick="closeModal()">BACK TO MENU</button>
        </div>
    </div>

    <script>
        let aliveCookies = [];
        function closeModal() { document.getElementById('modal').style.display = 'none'; }
        async function openTool(type) {
            const m = document.getElementById('modal');
            const title = document.getElementById('mTitle');
            const body = document.getElementById('mBody');
            m.style.display = 'block';

            if(type === 'lock') {
                title.innerText = 'NICKNAME LOCKER (3s)';
                body.innerHTML = \`<textarea id="l_ck" placeholder="Paste AppState or Raw Cookie" rows="5"></textarea>
                <input id="l_tid" placeholder="Group Thread ID">
                <input id="l_nk" value="DEEPAK RAJPUT BRAND">
                <button class="btn-main" onclick="startLock()">START 3s MONITORING</button>
                <div id="activeLocks" style="margin-top:15px;"></div>\`;
                loadLocks();
            } else if(type === 'extract') {
                title.innerText = 'UID & GROUP SCANNER';
                body.innerHTML = \`<textarea id="e_ck" placeholder="Paste Cookie here..."></textarea>
                <button class="btn-main" onclick="runExtract()">SCAN ALL GROUPS</button>
                <div id="e_res" style="margin-top:15px; max-height: 250px; overflow-y: auto;"></div>\`;
            } else if(type === 'check') {
                title.innerText = 'COOKIE VALIDATOR';
                aliveCookies = [];
                body.innerHTML = \`<textarea id="c_ck" placeholder="One Cookie per line..." rows="6"></textarea>
                <button class="btn-main" onclick="runCheck()">START CHECKING</button>
                <button class="btn-copy" onclick="copyAlive()">COPY ALL ALIVE COOKIES</button>
                <div id="c_res" style="margin-top:15px; max-height: 250px; overflow-y: auto;"></div>\`;
            }
        }

        function copyAlive() {
            if(aliveCookies.length === 0) return alert("No live cookies found!");
            navigator.clipboard.writeText(aliveCookies.join('\\n'));
            alert("Copied " + aliveCookies.length + " live cookies!");
        }

        async function loadLocks() {
            const r = await fetch('/list-locks').then(res => res.json());
            const div = document.getElementById('activeLocks');
            if(div) div.innerHTML = r.map(t => \`<div class="res-item">TID: \${t.threadID}<button class="stop-btn" onclick="stopLock('\${t.id}')">STOP</button></div>\`).join('');
        }

        async function startLock() {
            const d = { cookie: document.getElementById('l_ck').value, threadID: document.getElementById('l_tid').value, name: document.getElementById('l_nk').value };
            if(!d.cookie || !d.threadID) return alert("Fill all fields!");
            await fetch('/add-lock', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(d) });
            alert("Lock Activated! 3s gap applied."); loadLocks();
        }

        async function stopLock(id) {
            await fetch('/stop-lock', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id}) });
            loadLocks();
        }

        async function runExtract() {
            const resDiv = document.getElementById('e_res'); resDiv.innerHTML = '<span style="color:var(--accent)">Logging in & Scanning...</span>';
            const r = await fetch('/extract-uid', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ck: document.getElementById('e_ck').value }) }).then(res => res.json());
            if(r.success) {
                resDiv.innerHTML = \`<b style="color:var(--green)">User: \${r.name}</b><br>\` + r.groups.map(g => \`<div class="res-item" onclick="document.getElementById('l_tid').value='\${g.id}'; alert('TID Copied!')">\${g.name} <br> \${g.id}</div>\`).join('');
            } else { resDiv.innerHTML = '<span style="color:var(--red)">Login Failed! Check Cookie.</span>'; }
        }

        async function runCheck() {
            const lines = document.getElementById('c_ck').value.trim().split('\\n').filter(Boolean);
            const resDiv = document.getElementById('c_res'); resDiv.innerHTML = 'Starting...';
            for(let ck of lines) {
                const r = await fetch('/check-cookie', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ck }) }).then(res => res.json());
                if(r.status === 'LIVE') aliveCookies.push(ck);
                resDiv.innerHTML += \`<div class="res-item" style="border-left-color:\${r.status==='LIVE'?'var(--green)':'var(--red)'}">\${r.name} - \${r.status}</div>\`;
            }
        }
    </script>
</body>
</html>`;

// --- BACKEND LOGIC ---

const LOGIN_OPTS = {
    logLevel: 'silent',
    forceLogin: true,
    userAgent: "Mozilla/5.0 (Linux; Android 13; iQOO Neo 10R) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
};

function runLockBot(task) {
    if (activeLocks.has(task.id)) return;
    try {
        const loginData = getLoginData(task.cookie);
        wiegine.login(loginData, LOGIN_OPTS, (err, api) => {
            if (err || !api) return console.log(`[DRB] Login Fail: ${task.id}`);
            
            api.setOptions({ listenEvents: true, selfListen: false });

            // [INITIAL 3s LOCK]
            api.getThreadInfo(task.threadID, (err, info) => {
                if (!err && info) {
                    const nickMap = info.nicknames || {};
                    info.participantIDs.forEach((uid, i) => {
                        setTimeout(() => {
                            if (activeLocks.has(task.id) && nickMap[uid] !== task.name) {
                                api.changeNickname(task.name, task.threadID, uid, () => {});
                            }
                        }, i * 3000); 
                    });
                }
            });

            // [PERMANENT LISTENER]
            const stopListen = api.listenMqtt((err, event) => {
                if (event?.logMessageType === "log:user-nickname" && event.logMessageData.nickname !== task.name && event.threadID === task.threadID) {
                    api.changeNickname(task.name, task.threadID, event.logMessageData.participant_id, () => {});
                }
            });
            activeLocks.set(task.id, { ...task, stopFunc: stopListen });
        });
    } catch (e) { console.log("[DRB] Crash"); }
}

app.get('/', (req, res) => res.send(htmlContent));
app.get('/list-locks', (req, res) => res.json(Array.from(activeLocks.values()).map(t => ({ id: t.id, threadID: t.threadID }))));

app.post('/add-lock', (req, res) => {
    const id = "LOCK-" + Date.now();
    const newTask = { ...req.body, id };
    const db = JSON.parse(fs.readFileSync(DB_FILE)); db.push(newTask); fs.writeFileSync(DB_FILE, JSON.stringify(db));
    runLockBot(newTask); res.json({ success: true });
});

app.post('/stop-lock', (req, res) => {
    const { id } = req.body;
    if (activeLocks.has(id)) {
        const task = activeLocks.get(id);
        if (task.stopFunc) task.stopFunc();
        activeLocks.delete(id);
        const db = JSON.parse(fs.readFileSync(DB_FILE)).filter(item => item.id !== id);
        fs.writeFileSync(DB_FILE, JSON.stringify(db));
    }
    res.json({ success: true });
});

app.post('/extract-uid', (req, res) => {
    try {
        wiegine.login(getLoginData(req.body.ck), LOGIN_OPTS, (err, api) => {
            if (err || !api) return res.json({ success: false });
            api.getThreadList(100, null, ["INBOX"], (err, list) => {
                const groups = (!err && list) ? list.filter(t => t.isGroup).map(g => ({ name: g.name || "Unnamed Group", id: g.threadID })) : [];
                api.getUserInfo(api.getCurrentUserID(), (e, info) => res.json({ success: true, name: info[api.getCurrentUserID()]?.name || "User", groups }));
            });
        });
    } catch(e) { res.json({ success: false }); }
});

app.post('/check-cookie', (req, res) => {
    try {
        wiegine.login(getLoginData(req.body.ck), LOGIN_OPTS, (err, api) => {
            if (err || !api) return res.json({ name: "Dead/Invalid", status: "DEAD" });
            api.getUserInfo(api.getCurrentUserID(), (e, info) => res.json({ name: info[api.getCurrentUserID()]?.name || "Live", status: "LIVE" }));
        });
    } catch(e) { res.json({ name: "Error", status: "DEAD" }); }
});

const saved = JSON.parse(fs.readFileSync(DB_FILE));
saved.forEach((t, i) => setTimeout(() => runLockBot(t), i * 5000));

app.listen(PORT, () => console.log('DRB MASTER V5.1 ACTIVE'));
