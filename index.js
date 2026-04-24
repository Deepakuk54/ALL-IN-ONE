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
            <title>Deepak Rajput Brand - Pro Cookies Checker</title>
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
                .account-card { background: #010409; border: 1px solid #30363d; border-radius: 10px; padding: 15px; margin-top: 15px; border-left: 5px solid #58a6ff; position: relative; }
                .copy-actions { margin-top: 10px; display: flex; gap: 10px; }
                .copy-btn { background: #30363d; color: #c9d1d9; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px; }
                .copy-btn:hover { background: #58a6ff; color: white; }
                .group-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #21262d; font-size: 13px; }
                .uid-badge { background: #1f6feb; color: white; padding: 2px 6px; border-radius: 4px; font-family: monospace; cursor: pointer; font-size: 11px; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Deepak Rajput Brand</h1>
                <div class="brand-sub">Premium Multi-Account Cookies Manager</div>
                
                <div class="mode-selector">
                    <button class="mode-btn active"><span>🍪</span> COOKIES CHECKER</button>
                    <button class="mode-btn active"><span>🆔</span> UID EXTRACTOR</button>
                </div>

                <textarea id="userInput" placeholder="Paste multiple cookies here (one per line)..."></textarea>
                <button class="main-btn" onclick="startExtraction()">START PROCESS</button>
                
                <div id="status">Ready to check...</div>
                <div id="results"></div>
            </div>

            <script>
                async function startExtraction() {
                    const inputData = document.getElementById('userInput').value.trim().split('\\n').filter(Boolean);
                    const resultsDiv = document.getElementById('results');
                    const status = document.getElementById('status');
                    resultsDiv.innerHTML = '';

                    for(let i=0; i < inputData.length; i++) {
                        const currentCookie = inputData[i].trim();
                        status.innerText = "Checking: " + (i+1) + " / " + inputData.length;
                        
                        try {
                            const res = await fetch('/extract-cookie', {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({ input: currentCookie })
                            });
                            const result = await res.json();
                            
                            let statusColor = result.uid === "---" ? "#f85149" : "#238636";
                            let cardHtml = \`
                                <div class="account-card" style="border-left-color: \${statusColor}">
                                    <b style="color: \${statusColor}">\${result.uid === "---" ? "❌ DEAD" : "✅ ALIVE"}</b><br>
                                    <b>👤 Name: \${result.name}</b><br>
                                    <span>🆔 UID: \${result.uid}</span>
                                    
                                    <div class="copy-actions">
                                        \${result.uid !== "---" ? \`<button class="copy-btn" onclick="copyText('\${result.uid}')">Copy UID</button>\` : ''}
                                        <button class="copy-btn" onclick="copyText(\\\`\${currentCookie}\\\`)">Copy Cookie</button>
                                    </div>
                            \`;

                            if(result.groups && result.groups.length > 0) {
                                cardHtml += '<div style="margin-top:10px; font-size:12px; color:#8b949e;">Groups:</div>';
                                result.groups.forEach(g => {
                                    cardHtml += \`<div class="group-item"><span>\${g.name}</span><span class="uid-badge" onclick="copyText('\${g.id}')">\${g.id}</span></div>\`;
                                });
                            }
                            
                            cardHtml += '</div>';
                            resultsDiv.innerHTML += cardHtml;
                        } catch(e) {
                            console.error(e);
                        }
                    }
                    status.innerText = "✅ All Cookies Processed!";
                }

                function copyText(text) {
                    navigator.clipboard.writeText(text);
                    alert("Copied to clipboard!");
                }
            </script>
        </body>
        </html>
    `);
});

app.post('/extract-cookie', (req, res) => {
    const { input } = req.body;
    wiegine.login(input, { logLevel: 'silent' }, (err, api) => {
        if (err || !api) return res.json({ name: "Invalid / Expired", uid: "---", groups: [] });
        
        const uid = api.getCurrentUserID();
        
        api.getThreadList(50, null, ["INBOX"], (err, list) => {
            const groups = (!err && list) ? list.filter(t => t.isGroup).map(g => ({ name: g.name || "Group", id: g.threadID })) : [];
            
            api.getUserInfo(uid, (e, info) => {
                const name = (!e && info[uid]) ? info[uid].name : "Facebook User";
                res.json({ name: name, uid: uid, groups: groups });
            });
        });
    });
});

app.listen(PORT, '0.0.0.0', () => console.log('Live on port ' + PORT));
