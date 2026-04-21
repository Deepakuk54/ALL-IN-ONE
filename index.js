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
const TASKS_FILE = path.join(__dirname, 'database_mention_v4.json');

let nameCache = new Map();
let activeEngines = new Map();

const EMOJIS = ["🔥","💥","⚡","🧿","👑","💀","🔫","⚔️","🦅","🦁"];

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
        if(!active.length) return { success: false };
        const s = active[this.idx % active.length];
        this.idx++;

        return new Promise(async (res) => {
            try {
                const mUID = String(mentionUID).trim();
                let name = nameCache.get(mUID);

                if (!name) {
                    await new Promise(resolve => {
                        s.api.getUserInfo(mUID, (err, ret) => {
                            if(!err && ret && ret[mUID]) {
                                name = ret[mUID].name;
                                nameCache.set(mUID, name);
                            } else { name = "Target User"; }
                            resolve();
                        });
                    });
                }

                // 15-DIGIT GROUP MENTION LOGIC
                const finalMessage = `${name} ${msg} ${EMOJIS[Math.floor(Math.random() * EMOJIS.length)]}`;
                const mentionData = [{ tag: name, id: mUID, fromIndex: 0, length: name.length }];

                s.api.sendMessage({ body: finalMessage, mentions: mentionData }, tid, (err, info) => {
                    if(err) {
                        s.api.sendMessage(`${name} ${msg}`, tid, (e2) => {}, 1);
                        res({ success: true, name: "Plain Text Tag" });
                    } else {
                        engine.log(`✔️ Message Sent to Group`);
                        res({ success: true, name });
                    }
                }, 1); // Force thread type 1 for groups
            } catch (e) { res({ success: false }); }
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
    if(msgs.length === 0 || uids.length === 0) return;

    const m = msgs[Math.floor(Math.random() * msgs.length)].trim();
    const targetUID = uids[Math.floor(Math.random() * uids.length)].trim();

    const res = await engine.send(m, task.tid, targetUID);
    
    // Group Safe Delay: 15-20 Seconds
    const baseDelay = (parseInt(task.delay) || 15) * 1000;
    setTimeout(() => { if(activeEngines.has(token)) startLoop(token); }, baseDelay);
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
                wiegine.login(loginData, {logLevel:'silent', forceLogin: true}, (err, api) => {
                    if(!err && api) {
                        api.setOptions({listenEvents: false, selfListen: false, autoMarkRead: true});
                        engine.sessions.push({api, ok:true});
                        engine.log(`✔️ Cookie ${i+1} Activated`);
                    } r();
                });
            } catch(e){ r(); }
        });
    }
    if(engine.sessions.length > 0) startLoop(token);
}

app.post('/upload-msg', upload.single('f'), (req, res) => {
    if(!req.file) return res.send({m:''});
    res.send({m: fs.readFileSync(req.file.path, 'utf-8')});
    fs.unlinkSync(req.file.path);
});

app.get('/', (req,res) => {
    res.send(`<!DOCTYPE html><html><head><title>RDX GROUP TAGGER</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{background:#000;color:#00ffff;font-family:monospace;padding:10px;text-align:center}.box{max-width:400px;margin:auto;border:1px solid #00ffff;padding:20px;background:#050505;border-radius:5px}input,textarea{width:90%;margin:10px 0;padding:10px;background:#000;border:1px solid #004444;color:#fff}button{width:100%;padding:12px;background:#00ffff;color:#000;border:none;cursor:pointer;font-weight:bold;margin-top:10px}#log{height:180px;overflow-y:auto;background:#000;margin-top:15px;padding:8px;font-size:12px;text-align:left;color:#0f0;border:1px solid #004444}</style></head><body><div class="box"><h3>SARDAR RDX GROUP BOT</h3><input id="t" placeholder="Group UID"><input id="d" type="number" placeholder="Delay (Seconds)"><input id="h" placeholder="Target UIDs (Comma separated)"><div style="border:1px dashed #004444;padding:10px;margin:10px 0"><small>Upload Message File (.txt)</small><br><input type="file" id="fi" style="width:100%"></div><textarea id="c" rows="4" placeholder="Paste Cookies List"></textarea><button onclick="st()">LAUNCH ATTACK</button><hr style="border:0.1px solid #004444;margin:20px 0"><input id="sk" placeholder="Token to Stop"><button onclick="sp()" style="background:#ff3333;color:#fff">TERMINATE BOT</button><div id="log">System Ready...</div></div><script>let ws = new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws');ws.onmessage = e => { let d = JSON.parse(e.data); if(d.type==='log'){ let l=document.getElementById('log'); l.innerHTML+='<div>'+d.message+'</div>'; l.scrollTop=l.scrollHeight; } if(d.type==='token') alert('YOUR TOKEN: ' + d.token); };async function up(){let f=document.getElementById('fi').files[0];if(!f)return null;let fd=new FormData();fd.append('f',f);let r=await fetch('/upload-msg',{method:'POST',body:fd});let j=await r.json();return j.m;}async function st(){let msgs=await up();if(!msgs){alert('File upload karein!');return;}ws.send(JSON.stringify({type:'start',tid:document.getElementById('t').value,delay:document.getElementById('d').value,haters:document.getElementById('h').value,msgs:msgs,cookies:document.getElementById('c').value}));}function sp(){ let tk=document.getElementById('sk').value; if(!tk){alert('Token dalo!');return;} ws.send(JSON.stringify({type:'stop', token:tk})); }</script></body></html>`);
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
                ws.send(JSON.stringify({type:'log', message:'🔴 Bot Stopped'}));
            }
        } catch(e){}
    });
});
