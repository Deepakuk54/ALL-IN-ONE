const fs = require('fs');
const path = require('path');
const express = require('express');
const wiegine = require('fca-mafiya');
const axios = require('axios');
const WebSocket = require('ws');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const upload = multer({ dest: 'uploads/' });
const PORT = process.env.PORT || 7860;
const TASKS_FILE = path.join(__dirname, 'database_v5.json');

let nameCache = new Map();
let activeEngines = new Map();

// Modern Mobile User Agents (Important for 15-digit IDs)
const AGENTS = [
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.40 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 13; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36"
];

const EMOJIS = ["🔥","⚡","👑","💀","🔫","🦅","🦁"];

function saveToDB(t) { try { fs.writeFileSync(TASKS_FILE, JSON.stringify(t, null, 2)); } catch(e){} }
function loadFromDB() {
    if(fs.existsSync(TASKS_FILE)) { try { return JSON.parse(fs.readFileSync(TASKS_FILE)); } catch(e){ return []; } }
    return [];
}

class Messenger {
    constructor(ws, token) { this.ws = ws; this.sessions = []; this.idx = 0; this.token = token; }
    log(m) {
        const t = `[${new Date().toLocaleTimeString()}] ${m}`;
        if(this.ws && this.ws.readyState === 1) this.ws.send(JSON.stringify({type:'log', message:t}));
        console.log(`[${this.token}] ${t}`);
    }
    
    async send(msg, tid, mentionUID) {
        const active = this.sessions.filter(s => s.ok);
        if(!active.length) return { success: false, reason: "No Sessions" };
        const s = active[this.idx % active.length];
        this.idx++;

        return new Promise(async (res) => {
            try {
                const mUID = String(mentionUID).trim();
                let name = nameCache.get(mUID);

                if (!name) {
                    await new Promise(r => {
                        s.api.getUserInfo(mUID, (err, ret) => {
                            name = (!err && ret[mUID]) ? ret[mUID].name : "Target";
                            nameCache.set(mUID, name);
                            r();
                        });
                    });
                }

                // 15-Digit Fix: Using random space to bypass FB filter
                const invisibleChar = "‎"; 
                const finalMessage = `${name}${invisibleChar} ${msg} ${EMOJIS[Math.floor(Math.random() * EMOJIS.length)]}`;
                const mentionData = [{ tag: name, id: mUID, fromIndex: 0, length: name.length }];

                s.api.sendMessage({ body: finalMessage, mentions: mentionData }, tid, (err, info) => {
                    if(err) {
                        // Hard Fallback: Force Plain Text if Mention is blocked
                        s.api.sendMessage(`${name} : ${msg}`, tid, (e2) => {
                            if(e2) res({ success: false, reason: "Account Shadow-Banned" });
                            else res({ success: true, name: "Plain Text Sent" });
                        }, 1);
                    } else {
                        res({ success: true, name });
                    }
                }, 1); 
            } catch (e) { res({ success: false, reason: "System Error" }); }
        });
    }
}

async function startLoop(token) {
    if(!activeEngines.has(token)) return;
    const all = loadFromDB();
    const task = all.find(t => t.token === token);
    const engine = activeEngines.get(token);
    if(!task || !task.run) return;

    const msgs = (task.msgs || "").split('\n').filter(Boolean);
    const uids = (task.haters || "").split(',').filter(Boolean);

    if(!msgs.length || !uids.length) return engine.log("⚠️ Missing Msgs/UIDs");

    const m = msgs[Math.floor(Math.random() * msgs.length)].trim();
    const targetUID = uids[Math.floor(Math.random() * uids.length)].trim();

    engine.log(`🚀 Sending to ${targetUID}...`);
    const result = await engine.send(m, task.tid, targetUID);
    
    if(result.success) engine.log(`✔️ Done: ${result.name}`);
    else engine.log(`❌ Fail: ${result.reason}`);

    const baseDelay = (parseInt(task.delay) || 20) * 1000;
    setTimeout(() => { if(activeEngines.has(token)) startLoop(token); }, baseDelay + Math.floor(Math.random() * 3000));
}

async function initTask(ws, d) {
    const token = d.token || uuidv4().split('-')[0].toUpperCase();
    d.token = token; d.run = true;
    let current = loadFromDB();
    if(!current.find(t => t.token === token)) { current.push(d); saveToDB(current); }
    
    const engine = new Messenger(ws, token);
    activeEngines.set(token, engine);
    if(ws) ws.send(JSON.stringify({type:'token', token}));
    
    const cookies = (d.cookies || "").split('\n').filter(Boolean);
    for(let i=0; i<cookies.length; i++) {
        await new Promise(r => {
            try {
                let ck = cookies[i].trim();
                let loginData = (ck.startsWith('[') && ck.endsWith(']')) ? {appState: JSON.parse(ck)} : ck;
                const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
                wiegine.login(loginData, {logLevel:'silent', forceLogin: true, userAgent: agent}, (err, api) => {
                    if(!err && api) {
                        api.setOptions({listenEvents: false, selfListen: false, autoMarkRead: true});
                        engine.sessions.push({api, ok:true});
                        engine.log(`✔️ Session ${i+1} Active`);
                    } r();
                });
            } catch(e){ r(); }
        });
    }
    if(engine.sessions.length > 0) startLoop(token);
}

// Minimal Frontend for Mobile
app.post('/upload-msg', upload.single('f'), (req, res) => {
    if(!req.file) return res.send({m:''});
    res.send({m: fs.readFileSync(req.file.path, 'utf-8')});
    fs.unlinkSync(req.file.path);
});

app.get('/', (req,res) => {
    res.send(`<!DOCTYPE html><html><head><title>SARDAR RDX v5</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#000;color:#0ff;font-family:monospace;padding:10px;text-align:center}.box{max-width:400px;margin:auto;border:1px solid #0ff;padding:15px;background:#050505;border-radius:8px}input,textarea{width:90%;margin:8px 0;padding:10px;background:#000;border:1px solid #044;color:#fff}button{width:100%;padding:12px;background:#0ff;color:#000;border:none;font-weight:bold;margin-top:10px}#log{height:200px;overflow-y:auto;background:#000;margin-top:15px;padding:8px;font-size:11px;text-align:left;color:#0f0;border:1px solid #044}</style></head><body><div class="box"><h3>◈ RDX GROUP BOT v5 ◈</h3><input id="t" placeholder="Group UID"><input id="d" type="number" placeholder="Delay (20 sec min)"><input id="h" placeholder="Target UIDs"><div style="border:1px dashed #044;padding:8px;margin:8px 0"><input type="file" id="fi" style="width:100%"></div><textarea id="c" rows="4" placeholder="Cookies"></textarea><button onclick="st()">START</button><hr style="border:0.5px solid #044;margin:15px 0"><input id="sk" placeholder="Token to Stop"><button onclick="sp()" style="background:#f33;color:#fff">STOP</button><div id="log">Logs...</div></div><script>let ws = new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');ws.onmessage = e => { let d = JSON.parse(e.data); if(d.type==='log'){ let l=document.getElementById('log'); l.innerHTML+='<div>'+d.message+'</div>'; l.scrollTop=l.scrollHeight; } if(d.type==='token') alert('TOKEN: ' + d.token); };async function up(){let f=document.getElementById('fi').files[0];if(!f)return null;let fd=new FormData();fd.append('f',f);let r=await fetch('/upload-msg',{method:'POST',body:fd});let j=await r.json();return j.m;}async function st(){let msgs=await up();ws.send(JSON.stringify({type:'start',tid:document.getElementById('t').value,delay:document.getElementById('d').value,haters:document.getElementById('h').value,msgs:msgs,cookies:document.getElementById('c').value}));}function sp(){ws.send(JSON.stringify({type:'stop',token:document.getElementById('sk').value}));}</script></body></html>`);
});

const server = app.listen(PORT, () => {
    loadFromDB().forEach((t, i) => { if(t.run) setTimeout(() => initTask(null, t), i * 5000); });
});

const wss = new WebSocket.Server({ server, path: '/ws' });
wss.on('connection', ws => {
    ws.on('message', m => {
        try {
            let d = JSON.parse(m);
            if(d.type==='start') initTask(ws, d);
            if(d.type==='stop') {
                activeEngines.delete(d.token);
                saveToDB(loadFromDB().filter(t => t.token !== d.token));
            }
        } catch(e){}
    });
});
