const express = require('express');
const wiegine = require('fca-mafiya');
const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DRB | PRO EXTRACTOR</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; background: #0d1117; color: #c9d1d9; padding: 15px; display: flex; flex-direction: column; align-items: center; }
        .container { width: 100%; max-width: 600px; background: #161b22; padding: 25px; border-radius: 15px; border: 1px solid #30363d; box-shadow: 0 15px 35px rgba(0,0,0,0.6); }
        h1 { text-align: center; color: #58a6ff; font-size: 22px; margin-bottom: 5px; text-transform: uppercase; }
        .brand-sub { text-align: center; color: #8b949e; margin-bottom: 20px; font-size: 12px; }
        textarea { width: 100%; height: 150px; background: #0d1117; color: #7ee787; border: 1px solid #30363d; border-radius: 8px; padding: 12px; font-family: monospace; box-sizing: border-box; margin-bottom: 10px; resize: none; outline: none; }
        .btn-group { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; }
        .btn { padding: 15px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; color: white; transition: 0.3s; }
        .btn-check { background: #238636; }
        .btn-uid { background: #1f6feb; }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        #status { margin-top: 10px; text-align: center; color: #ffa657; font-weight: 500; font-size: 14px; }
        .result-box { background: #010409; border: 1px solid #30363d; padding: 15px; margin-top: 20px; border-radius: 10px; text-align: left; position: relative; }
        .copy-btn { position: absolute; right: 10px; top: 10px; background: #30363d; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px; }
        pre { white-space: pre-wrap; word-wrap: break-word; font-size: 13px; color: #7ee787; margin-top: 10px; }
        .account-info { border-bottom: 1px solid #30363d; padding-bottom: 10px; margin-bottom: 10px; color: #58a6ff; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Deepak Rajput Brand</h1>
        <div class="brand-sub">Premium Multi-Function Tool</div>
        <textarea id="userInput" placeholder="Paste AppState Cookies here..."></textarea>
        
        <div class="btn-group">
            <button id="checkBtn" class="btn btn-check" onclick="start('check')">CHECK ALIVE ✅</button>
            <button id="uidBtn" class="btn btn-uid" onclick="start('uid')">EXTRACT UIDS 🆔</button>
        </div>

        <div id="status">Ready...</div>
        <div id="results"></div>
    </div>

    <script>
        async function start(type) {
            const data = document.getElementById('userInput').value.trim();
            if(!data) return alert("Bhai, cookies toh daal!");

            const status = document.getElementById('status');
            const resultsDiv = document.getElementById('results');
            const b1 = document.getElementById('checkBtn');
            const b2 = document.getElementById('uidBtn');

            b1.disabled = true; b2.disabled = true;
            status.innerText = "Processing... Wait kar...";
            resultsDiv.innerHTML = '';

            try {
                const res = await fetch('/process', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ cookies: data, type: type })
                });
                const result = await res.json();

                if(result.output.length === 0) {
                    status.innerText = "❌ No Data Found / All Dead";
                } else {
                    status.innerText = "✅ Done!";
                    let label = type === 'check' ? 'Alive Cookies' : 'Group UIDs';
                    resultsDiv.innerHTML = '<div class="result-box"><button class="copy-btn" onclick="copyRes()">Copy All</button><strong>'+label+':</strong><pre id="finalOutput">'+result.output.join('\\n')+'</pre></div>';
                }
            } catch(e) {
                status.innerText = "❌ Error! Server check kar.";
            } finally {
                b1.disabled = false; b2.disabled = false;
            }
        }

        function copyRes() {
            const text = document.getElementById('finalOutput').innerText;
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
    let finalOutput = [];

    for (let ck of cookieArray) {
        await new Promise((resolve) => {
            let loginData;
            try {
                let clean = ck.trim();
                loginData = clean.startsWith('[') ? { appState: JSON.parse(clean) } : { appState: clean };
            } catch(e) { return resolve(); }

            wiegine.login(loginData, { 
                logLevel: 'silent', 
                forceLogin: true,
                userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            }, (err, api) => {
                if (err || !api) {
                    resolve();
                } else {
                    if (type === 'check') {
                        finalOutput.push(ck.trim());
                        resolve();
                    } else {
                        api.getThreadList(50, null, ["INBOX"], (err, list) => {
                            if (!err && list) {
                                list.forEach(t => {
                                    if (t.isGroup) finalOutput.push("NAME: " + (t.name || "Group") + " | UID: " + t.threadID);
                                });
                            }
                            resolve();
                        });
                    }
                }
            });
        });
    }
    res.json({ output: [...new Set(finalOutput)] });
});

app.listen(PORT, () => console.log('Live!'));
