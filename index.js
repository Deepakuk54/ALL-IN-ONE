const express = require('express');
const wiegine = require('fca-mafiya');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>DRB | COOKIE EXTRACTOR</title>
            <style>
                body { font-family: 'Segoe UI', sans-serif; background: #0d1117; color: #c9d1d9; padding: 15px; display: flex; flex-direction: column; align-items: center; }
                .container { width: 100%; max-width: 600px; background: #161b22; padding: 25px; border-radius: 15px; border: 1px solid #30363d; box-shadow: 0 15px 35px rgba(0,0,0,0.6); }
                h1 { text-align: center; color: #58a6ff; font-size: 22px; margin-bottom: 5px; text-transform: uppercase; }
                .brand-sub { text-align: center; color: #8b949e; margin-bottom: 20px; font-size: 12px; }
                textarea { width: 100%; height: 150px; background: #0d1117; color: #7ee787; border: 1px solid #30363d; border-radius: 8px; padding: 12px; font-family: monospace; box-sizing: border-box; margin-bottom: 10px; resize: none; }
                .main-btn { width: 100%; padding: 15px; background: #238636; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px; margin-bottom: 10px; }
                .copy-alive-btn { width: 100%; padding: 10px; background: #30363d; color: #fff; border: 1px solid #444; border-radius: 8px; cursor: pointer; font-size: 13px; margin-bottom: 15px; display: none; }
                #status { margin-top: 10px; text-align: center; color: #ffa657; font-weight: 500; font-size: 14px; }
                .account-card { background: #010409; border: 1px solid #30363d; border-radius: 10px; padding: 15px; margin-top: 15px; border-left: 5px solid #238636; text-align: left; }
                .group-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #21262d; font-size: 13px; }
                .uid-badge { background: #1f6feb; color: white; padding: 3px 7px; border-radius: 4px; font-family: monospace; cursor: pointer; font-size: 11px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Deepak Rajput Brand</h1>
                <div class="brand-sub">Cookie Alive Check & UID Extractor</div>
                <textarea id="userInput" placeholder="Paste AppState Cookies here (one per line)..."></textarea>
                <button class="main-btn" onclick="startExtraction()">START EXTRACTION</button>
                <button id="copyAlive" class="copy-alive-btn" onclick="copyAllAlive()">📋 COPY ALL ALIVE COOKIES</button>
                <div id="status">Ready...</div>
                <div id="results"></div>
            </div>
            <script>
                let aliveData = [];

                async function startExtraction() {
                    const lines = document.getElementById('userInput').value.trim().split('\\n').filter(Boolean);
                    if(lines.length === 0) return alert("Bhai, pehle cookies toh daal!");
                    
                    const resultsDiv = document.getElementById('results');
                    const status = document.getElementById('status');
                    const copyBtn = document.getElementById('copyAlive');
                    
                    resultsDiv.innerHTML = '';
                    aliveData = [];
                    copyBtn.style.display = 'none';
                    
                    for(let i=0; i < lines.length; i++) {
                        status.innerText = "Checking Cookie " + (i+1) + "/" + lines.length + "...";
                        try {
                            const res = await fetch('/extract-cookie', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({ input: lines[i].trim() })
                            });
                            const result = await res.json();
                            
                            if(result.uid !== "---") {
                                aliveData.push(lines[i].trim());
                                copyBtn.style.display = 'block';
                                
                                let html = \`<div class="account-card">
                                    <b style="color:#238636">✅ \${result.name}</b><br>
                                    <small style="color:#8b949e">UID: \${result.uid}</small>\`;
                                
                                if(result.groups && result.groups.length > 0) {
                                    result.groups.forEach(g => {
                                        html += \`<div class="group-item"><span>\${g.name}</span><span class="uid-badge" onclick="copyUID('\${g.id}')">\${g.id}</span></div>\`;
                                    });
                                } else {
                                    html += '<p style="color:#f85149; font-size:12px; margin-top:10px;">❌ No Groups Found</p>';
                                }
                                html += '</div>';
                                resultsDiv.innerHTML += html;
                            }
                        } catch(e) {}
                    }
                    status.innerText = "✅ Done! Total Alive: " + aliveData.length;
                }

                function copyUID(uid) {
                    navigator.clipboard.writeText(uid);
                    alert("UID Copied!");
                }

                function copyAllAlive() {
                    navigator.clipboard.writeText(aliveData.join('\\n'));
                    alert("All Alive Cookies Copied!");
                }
            </script>
        </body>
        </html>
    `);
});

app.post('/extract-cookie', (req, res) => {
    const { input } = req.body;
    let loginData;
    try {
        loginData = input.startsWith('[') ? { appState: JSON.parse(input) } : { appState: input };
    } catch(e) { return res.json({ name: "Format Error", uid: "---", groups: [] }); }

    wiegine.login(loginData, { logLevel: 'silent', forceLogin: true }, (err, api) => {
        if (err || !api) return res.json({ name: "Dead Cookie", uid: "---", groups: [] });
        
        const uid = api.getCurrentUserID();
        
        api.getThreadList(100, null, ["INBOX"], (err, list) => {
            const groups = (!err && list) ? list.filter(t => t.isGroup).map(g => ({ 
                name: g.name || "Group", 
                id: g.threadID 
            })) : [];
            
            api.getUserInfo(uid, (e, info) => {
                const name = (!e && info[uid]) ? info[uid].name : "Active Account";
                res.json({ name: name, uid: uid, groups: groups });
            });
        });
    });
});

app.listen(PORT, () => console.log('DRB Cookie Extractor Live!'));
