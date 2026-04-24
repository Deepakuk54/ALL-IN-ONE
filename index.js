const express = require('express');
const wiegine = require('fca-mafiya');
const fs = require('fs');
const app = express();

const PORT = process.env.PORT || 10000;
app.use(express.json());

// Dashboard UI
const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DRB | COOKIE & UID TOOL</title>
    <style>
        body { background: #0d1117; color: #c9d1d9; font-family: sans-serif; padding: 15px; text-align: center; }
        .card { background: #161b22; border: 1px solid #30363d; border-radius: 12px; padding: 20px; max-width: 500px; margin: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        textarea { width: 100%; background: #0d1117; border: 1px solid #30363d; color: #58a6ff; padding: 12px; border-radius: 8px; margin-bottom: 12px; box-sizing: border-box; outline: none; font-family: monospace; }
        .btn-group { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
        .btn { background: #238636; color: white; border: none; padding: 15px; border-radius: 8px; font-weight: bold; cursor: pointer; transition: 0.3s; }
        .btn-uid { background: #1f6feb; }
        .btn:hover { opacity: 0.8; transform: scale(1.02); }
        .result-box { background: #1c2128; border: 1px solid #30363d; padding: 15px; margin-top: 15px; border-radius: 8px; text-align: left; position: relative; }
        .copy-btn { position: absolute; right: 10px; top: 10px; background: #30363d; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px; }
        h1 { color: #58a6ff; text-transform: uppercase; letter-spacing: 1px; }
        pre { white-space: pre-wrap; word-wrap: break-word; font-size: 13px; color: #7ee787; }
    </style>
</head>
<body>
    <h1>Deepak Rajput Brand</h1>
    <div class="card">
        <textarea id="cookiesInput" placeholder="Paste multiple cookies here (one per line)" rows="8"></textarea>
        
        <div class="btn-group">
            <button class="btn" onclick="process('check')">CHECK ALIVE ✅</button>
            <button class="btn btn-uid" onclick="process('uid')">EXTRACT UIDS 🆔</button>
        </div>

        <div id="resultArea"></div>
    </div>

    <script>
        async function process(type) {
            const cookies = document.getElementById('cookiesInput').value.trim();
            if(!cookies) return alert("Bhai, cookies toh daal!");
            
            document.getElementById('resultArea').innerHTML = "<p>Processing... Wait kar...</p>";

            const res = await fetch('/process', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ cookies, type })
            });
            const data = await res.json();
            
            let html = '';
            if(type === 'check') {
                html = \`
                <div class="result-box">
                    <button class="copy-btn" onclick="copyText('aliveResults')">Copy Alive</button>
                    <strong>Alive Cookies:</strong>
                    <pre id="aliveResults">\${data.results.join('\\n') || "Koi alive nahi mili!"}</pre>
                </div>\`;
            } else {
                html = \`
                <div class="result-box">
                    <button class="copy-btn" onclick="copyText('uidResults')">Copy UIDs</button>
                    <strong>Group Names & UIDs:</strong>
                    <pre id="uidResults">\${data.results.join('\\n') || "Data nahi mila!"}</pre>
                </div>\`;
            }
            document.getElementById('resultArea').innerHTML = html;
        }

        function copyText(id) {
            const text = document.getElementById(id).innerText;
            navigator.clipboard.writeText(text);
            alert("Copied to clipboard!");
        }
    </script>
</body>
</html>`;

app.get('/', (req, res) => res.send(htmlContent));

app.post('/process', async (req, res) => {
    const { cookies, type } = req.body;
    const cookieArray = cookies.split('\n').filter(c => c.trim() !== "");
    let finalResults = [];

    for (let ck of cookieArray) {
        await new Promise((resolve) => {
            let loginData = ck.trim().startsWith('[') ? { appState: JSON.parse(ck) } : ck.trim();
            
            // Wahi purana makkhan login system
            wiegine.login(loginData, { 
                logLevel: 'silent', 
                forceLogin: true,
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            }, (err, api) => {
                if (err || !api) {
                    if (type === 'check') console.log("Dead Cookie skipped");
                    resolve();
                } else {
                    if (type === 'check') {
                        finalResults.push(ck.trim());
                        resolve();
                    } else if (type === 'uid') {
                        api.getThreadList(20, null, ["INBOX"], (err, list) => {
                            if (!err && list) {
                                list.forEach(t => {
                                    if (t.isGroup) finalResults.push(\`NAME: \${t.name} | UID: \${t.threadID}\`);
                                });
                            }
                            resolve();
                        });
                    } else {
                        resolve();
                    }
                }
            });
        });
    }
    res.json({ results: [...new Set(finalResults)] }); // Duplicate hata kar bhejega
});

app.listen(PORT, () => console.log(\`DRB Tool live on \${PORT}\`));
