const express = require('express');
const axios = require('axios');
const wiegine = require('fca-mafiya');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Deepak Rajput Brand - Pro Extractor</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; background: #0d1117; color: #c9d1d9; padding: 20px; display: flex; flex-direction: column; align-items: center; }
                .container { width: 100%; max-width: 650px; background: #161b22; padding: 30px; border-radius: 15px; border: 1px solid #30363d; box-shadow: 0 15px 35px rgba(0,0,0,0.6); }
                h1 { text-align: center; color: #58a6ff; font-size: 26px; margin-bottom: 5px; text-transform: uppercase; }
                .brand-sub { text-align: center; color: #8b949e; margin-bottom: 20px; font-size: 13px; }
                .mode-selector { display: flex; gap: 10px; margin-bottom: 20px; }
                .mode-btn { flex: 1; padding: 12px; border: 1px solid #30363d; background: #21262d; color: white; cursor: pointer; border-radius: 8px; font-weight: bold; transition: 0.3s; display: flex; align-items: center; justify-content: center; gap: 8px; }
                .mode-btn.active { background: #1f6feb; border-color: #58a6ff; }
                textarea { width: 100%; height: 150px; background: #0d1117; color: #7ee787; border: 1px solid #30363d; border-radius: 8px; padding: 12px; font-family: monospace; box-sizing: border-box; margin-bottom: 15px; }
                .main-btn { width: 100%; padding: 15px; background: #238636; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px; width: 100%; }
                #status { margin-top: 20px; text-align: center; color: #ffa657; font-weight: 500; }
                .bulk-actions { margin-top: 15px; display: none; gap: 10px; justify-content: center; width: 100%; flex-wrap: wrap; }
                .bulk-btn { background: #1f6feb; color: white; border: none; padding: 10px 15px; border-radius: 5px; cursor: pointer; font-size: 12px; font-weight: bold; flex: 1; min-width: 140px; }
                .account-card { background: #010409; border: 1px solid #30363d; border-radius: 10px; padding: 15px; margin-top: 15px; border-left: 5px solid #58a6ff; }
                .cookie-display { background: #0d1117; color: #7ee787; padding: 10px; border-radius: 5px; font-size: 11px; word-break: break-all; margin-top: 10px; border: 1px dashed #30363d; }
                .group-list { margin-top: 10px; padding-top: 10px; border-top: 1px solid #21262d; }
                .group-item { font-size: 12px; display: flex; justify-content: space-between; margin-bottom: 5px; color: #8b949e; }
                .g-uid { color: #58a6ff; font-family: monospace; cursor: pointer; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Deepak Rajput Brand</h1>
                <div class="brand-sub">Premium Multi-Account Manager</div>
                
                <div class="mode-selector">
                    <button id="chkBtn" class="mode-btn active" onclick="setMode('checker')"><span>🍪</span> COOKIES CHECKER</button>
                    <button id="uidBtn" class="mode-btn" onclick="setMode('uid')"><span>🆔</span> UID EXTRACTOR</button>
                </div>

                <textarea id="userInput" placeholder="Paste data here..."></textarea>
                <button class="main-btn" onclick="startProcess()">START PROCESS</button>
                
                <div id="bulkActions" class="bulk-actions">
                    <button class="bulk-btn" onclick="copyAll('cookies')">📋 ALL ALIVE COOKIES</button>
                    <button class="bulk-btn" onclick="copyAll('uids')">🆔 ALL UIDs</button>
                    <button class="bulk-btn" onclick="copyAll('groups')">👥 ALL GROUP UIDs</button>
                </div>

                <div id="status">Ready...</div>
                <div id="results"></div>
            </div>

            <script>
                let currentMode = 'checker';
                let aliveCookies = [];
                let aliveUIDs = [];
                let groupUIDs = [];

                function setMode(mode) {
                    currentMode = mode;
                    document.getElementById('chkBtn').classList.toggle('active', mode === 'checker');
                    document.getElementById('uidBtn').classList.toggle('active', mode === 'uid');
                }

                async function startProcess() {
                    const data = document.getElementById('userInput').value.trim().split('\\n').filter(Boolean);
                    const resultsDiv = document.getElementById('results');
                    const status = document.getElementById('status');
                    const bulkDiv = document.getElementById('bulkActions');
                    
                    resultsDiv.innerHTML = '';
                    bulkDiv.style.display = 'none';
                    aliveCookies = [];
                    aliveUIDs = [];
                    groupUIDs = [];

                    for(let i=0; i < data.length; i++) {
                        const rawInput = data[i].trim();
                        status.innerText = "Processing: " + (i+1) + " / " + data.length;
                        
                        try {
                            const res = await fetch('/extract-all', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({ input: rawInput })
                            });
                            const result = await res.json();
                            
                            if (result.status === "dead") {
                                resultsDiv.innerHTML += \`<div class="account-card" style="border-left-color: #f85149">
                                    <b style="color: #f85149">❌ DEAD / INVALID</b><br>
                                    <small>\${rawInput.substring(0, 30)}...</small>
                                </div>\`;
                                continue;
                            }

                            aliveCookies.push(rawInput);
                            aliveUIDs.push(result.uid);
                            if(result.groups) result.groups.forEach(g => groupUIDs.push(g.id));

                            let html = \`<div class="account-card">
                                <b>✅ ALIVE - \${result.name}</b><br>
                                <span>UID: \${result.uid}</span>\`;

                            if (currentMode === 'checker') {
                                html += \`<div class="cookie-display">\${rawInput}</div>\`;
                            }

                            if(result.groups && result.groups.length > 0) {
                                html += '<div class="group-list">';
                                result.groups.forEach(g => {
                                    html += \`<div class="group-item"><span>\${g.name}</span><span class="g-uid" onclick="copyText('\${g.id}')">\${g.id}</span></div>\`;
                                });
                                html += '</div>';
                            } else {
                                html += '<div style="color:#f85149; font-size:11px; margin-top:5px;">No Groups Found</div>';
                            }

                            html += '</div>';
                            resultsDiv.innerHTML += html;
                        } catch(e) {}
                    }
                    status.innerText = "✅ Done!";
                    if(aliveCookies.length > 0) bulkDiv.style.display = 'flex';
                }

                function copyText(text) {
                    navigator.clipboard.writeText(text);
                    alert("Copied!");
                }

                function copyAll(type) {
                    let text = "";
                    if(type === 'cookies') text = aliveCookies.join('\\n');
                    if(type === 'uids') text = aliveUIDs.join('\\n');
                    if(type === 'groups') text = [...new Set(groupUIDs)].join('\\n'); // Remove duplicates
                    navigator.clipboard.writeText(text);
                    alert("All " + type + " Copied!");
                }
            </script>
        </body>
        </html>
    `);
});

// Fixed Logic for Groups + Name + UID
app.post('/extract-all', (req, res) => {
    const { input } = req.body;
    wiegine.login(input, { logLevel: 'silent' }, (err, api) => {
        if (err || !api) return res.json({ status: "dead" });
        
        const uid = api.getCurrentUserID();
        
        // Dono cheezein saath nikalne ke liye
        api.getUserInfo(uid, (e, info) => {
            const name = (!e && info[uid]) ? info[uid].name : "Facebook User";
            
            api.getThreadList(100, null, ["INBOX"], (err2, list) => {
                const groups = (!err2 && list) 
                    ? list.filter(t => t.isGroup).map(g => ({ name: g.name || "Unnamed Group", id: g.threadID })) 
                    : [];
                
                res.json({
                    status: "alive",
                    name: name,
                    uid: uid,
                    groups: groups
                });
            });
        });
    });
});

app.listen(PORT, '0.0.0.0', () => console.log('Live!'));
