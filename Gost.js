/* [GOST AI v2 — FULL INTEGRATED VERSION] */

const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const axios = require("axios");
const OpenAI = require("openai");

const { kord, wtype, config, prefix } = require("../core");

let Canvas = null;
try { Canvas = require("canvas"); } catch {}

/* ----------------- SAFE CONFIG ----------------- */
function getCfgAny() { try { if(typeof config==="function") return config()||{} } catch{} try{ return config||{} } catch{return{} } }
function SAFE_PREFIX() {
  const envP = process.env.PREFIX; if(envP && String(envP).trim()) return String(envP).trim();
  if(typeof prefix==="string" && prefix.trim()) return prefix.trim();
  const cfg = getCfgAny();
  if(cfg?.PREFIX && String(cfg.PREFIX).trim()) return String(cfg.PREFIX).trim();
  return ".";
}
function getVar(name,fallback=""){ const env = process.env?.[name]; if(env!==undefined&&env!==null){ const s=String(env).trim(); if(s) return s } const cfg=getCfgAny(); const v=cfg?.[name]; if(v!==undefined&&v!==null){ const s=String(v).trim(); if(s) return s } return fallback }
function getSenderId(m){ return m?.sender || m?.key?.participant || m?.participant || m?.key?.remoteJid || "unknown"; }
function getChatId(m){ return m?.key?.remoteJid || m?.chat || "unknown"; }
function isAllowed(m){ 
  if(m?.fromMe) return true; 
  if(m?.isOwner) return true; 
  if(m?.isSudo) return true; 
  if(m?.isMod) return true; 
  const cfg=getCfgAny(); 
  const sudoRaw=cfg?.SUDO || cfg?.SUDO_USERS || cfg?.SUDOS; 
  const sender=getSenderId(m); 
  if(sudoRaw && sender){ const list=Array.isArray(sudoRaw)?sudoRaw:String(sudoRaw).split(",").map(x=>x.trim()).filter(Boolean); if(list.includes(sender)) return true; } 
  return false; 
}
function getTextFromAny(m,textArg){ const t=(typeof textArg==="string"?textArg:"")||m?.message?.conversation||m?.message?.extendedTextMessage?.text||m?.text||m?.body||""; return String(t||""); }
async function sendText(m,txt,opt={}){ try{ if(typeof m.send==="function") return await m.send(txt,opt) } catch{} try{ if(m?.client?.sendMessage) return await m.client.sendMessage(getChatId(m),{ text:txt,...opt },{ quoted:m }) } catch{} try{ if(typeof m.reply==="function") return await m.reply(txt) } catch{} return null }
async function sendImage(m,buf,caption="",opt={}){ try{ if(typeof m.replyimg==="function") return await m.replyimg(buf,caption) } catch{} try{ if(m?.client?.sendMessage) return await m.client.sendMessage(getChatId(m),{ image:buf,caption,...opt},{ quoted:m }) } catch{} return sendText(m,caption||"✅",opt) }
function withMentions(text,jids){ return { text, mentions: Array.isArray(jids)?jids:[] } }

/* ----------------- STORAGE ----------------- */
const ROOT="/home/container";
const DATA_DIR=path.join(ROOT,"cmds",".gost");
const MEM_FILE=path.join(DATA_DIR,"memory.json");
const PREF_FILE=path.join(DATA_DIR,"prefs.json");
function ensureDirs(){ if(!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR,{recursive:true}); if(!fs.existsSync(MEM_FILE)) fs.writeFileSync(MEM_FILE,JSON.stringify({users:{}},null,2)); if(!fs.existsSync(PREF_FILE)) fs.writeFileSync(PREF_FILE,JSON.stringify({users:{},chats:{}},null,2)) }
function readJSON(file,fallback){ ensureDirs(); try{ return JSON.parse(fs.readFileSync(file,"utf8")) } catch{ return fallback } }
function writeJSON(file,obj){ ensureDirs(); fs.writeFileSync(file,JSON.stringify(obj,null,2),"utf8") }
function ukey(m){ return `${getChatId(m)}::${getSenderId(m)}`; }
function chatKey(m){ return `${getChatId(m)}`; }
function getPrefs(m){ const db=readJSON(PREF_FILE,{users:{},chats:{}}); return db.users[ukey(m)]||{}; }
function setPrefs(m,patch){ const db=readJSON(PREF_FILE,{users:{},chats:{}}); const k=ukey(m); db.users[k]={...(db.users[k]||{}),...patch}; writeJSON(PREF_FILE,db); return db.users[k]; }
function getChatPrefs(m){ const db=readJSON(PREF_FILE,{users:{},chats:{}}); return db.chats[chatKey(m)]||{}; }
function setChatPrefs(m,patch){ const db=readJSON(PREF_FILE,{users:{},chats:{}}); const k=chatKey(m); db.chats[k]={...(db.chats[k]||{}),...patch}; writeJSON(PREF_FILE,db); return db.chats[k]; }

/* ----------------- MEMORY ----------------- */
function memCap(){ const v=parseInt(getVar("GOST_MEM","24"),10); return Math.max(8,Math.min(80,Number.isFinite(v)?v:24)) }
function loadMem(m){ const db=readJSON(MEM_FILE,{users:{}}); return db.users[ukey(m)]||[] }
function saveMem(m,arr){ const db=readJSON(MEM_FILE,{users:{}}); db.users[ukey(m)]=arr; writeJSON(MEM_FILE,db) }
function pushMem(m,role,content){ const cap=memCap(); const arr=loadMem(m); arr.push({role,content:String(content||"").slice(0,4000),ts:Date.now()}); while(arr.length>cap) arr.shift(); saveMem(m,arr) }
function clearMem(m){ const db=readJSON(MEM_FILE,{users:{}}); delete db.users[ukey(m)]; writeJSON(MEM_FILE,db) }
/* ----------------- COOLDOWN ----------------- */
const COOLDOWN=new Map();
function cdSec(){ const v=parseInt(getVar("GOST_COOLDOWN","3"),10); return Math.max(0,Math.min(30,Number.isFinite(v)?v:3)) }
function checkCooldownKey(key){ const s=cdSec(); if(!s) return null; const now=Date.now(); const last=COOLDOWN.get(key)||0; if(now-last<s*1000) return Math.ceil((s*1000-(now-last))/1000); COOLDOWN.set(key,now); return null }

/* ----------------- OPENAI ----------------- */
const OPENAI_API_KEY=(process.env.OPENAI_API_KEY||"").trim();
const MODEL=(process.env.GOST_MODEL||"gpt-4o-mini").trim();
const openai=OPENAI_API_KEY?new OpenAI({apiKey:OPENAI_API_KEY}):null;

/* ----------------- SESSION + MODE ----------------- */
function sessionState(m){ const c=getChatPrefs(m); return { on:!!c.session_on, mode:(c.session_mode||"tag").toLowerCase() }; }
function setSession(m,on){ return setChatPrefs(m,{ session_on:!!on }); }
function setMode(m,mode){ mode=String(mode||"").toLowerCase(); if(!["tag","all"].includes(mode)) return null; setChatPrefs(m,{ session_mode:mode }); return mode; }
function getBotJid(m){ const a=m?.client?.user?.id||m?.client?.user?.jid||m?.user?.id||""; if(a && typeof a==="string") return a.includes("@")?a:`${a}@s.whatsapp.net`; const cfg=getCfgAny(); const bn=cfg?.BOT_NUMBER||cfg?.BOTNUM||cfg?.NUMBER; if(bn) return `${String(bn).replace(/\D/g,"")}@s.whatsapp.net`; return ""; }
function getOwnerJidGuess(){ const cfg=getCfgAny(); const n=cfg?.OWNER_NUMBER||cfg?.OWNER||cfg?.OWNERNUM||""; const digits=String(n||"").replace(/\D/g,""); return digits?`${digits}@s.whatsapp.net`:""; }
function isTaggedForSession(m){ const mentioned=Array.isArray(m?.mentionedJid)?m.mentionedJid:[]; if(!mentioned.length) return false; const bot=getBotJid(m); const owner=getOwnerJidGuess(); if(bot && mentioned.includes(bot)) return true; if(owner && mentioned.includes(owner)) return true; const botNum=bot?bot.split("@")[0]:""; const ownerNum=owner?owner.split("@")[0]:""; return mentioned.some(j=>{ const num=String(j).split("@")[0]; return (botNum && num===botNum)||(ownerNum && num===ownerNum) }); }

/* ----------------- AI CORE ----------------- */
function baseSystem(mode){
  const modeHint={
    chat:"Be friendly, sharp, Nigerian-street-smart but respectful. Reply mostly in Naija Pidgin English.",
    coach:"Give steps, plans, checklists in Naija Pidgin.",
    writer:"Write premium content in Pidgin. Give 3 options + best pick.",
    coder:"Explain clean code in simple Naija Pidgin.",
    translate:"Translate cleanly into Naija Pidgin.",
    summarize:"Summarize into bullets + actions in Pidgin.",
    roast:"Playful banter in Pidgin. No slurs, threats, or curses.",
    auto:"Reply naturally in Pidgin. Keep it short and helpful."
  }[mode]||"Be helpful in Pidgin.";

  return "You are GOST AI, a premium WhatsApp assistant.\nRules:\n- Keep responses concise but premium.\n- Never output hate, slurs, threats, doxxing, or sexual content.\n- If asked for harmful content, refuse and redirect.\nMode:\n"+modeHint;
}

async function aiReply(m,userText,mode="chat"){
  if(!openai) throw new Error("OPENAI_API_KEY not set.");
  const cdKey="chat::"+getChatId(m);
  const left=checkCooldownKey(cdKey);
  if(left) throw new Error(`Cooldown: wait ${left}s`);
  const history=loadMem(m).map(x=>({role:x.role,content:x.content}));
  const messages=[{role:"system",content:baseSystem(mode)}, ...history.slice(-memCap()), {role:"user",content:userText}];
  const resp=await openai.chat.completions.create({model:MODEL,messages,temperature:(mode==="roast")?0.95:0.7});
  const out=resp?.choices?.[0]?.message?.content?.trim();
  if(!out) throw new Error("AI returned empty response.");
  pushMem(m,"user",userText);
  pushMem(m,"assistant",out);
  return out;
}

/* ----------------- WEATHER + MUSIC ----------------- */
async function getWeather(city){
  const apiKey=(process.env.OPENWEATHER_API_KEY||"").trim();
  if(!apiKey) return "Weather not configured: set OPENWEATHER_API_KEY.";
  const url=`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
  const res=await axios.get(url,{timeout:20000});
  const w=res.data;
  return `Weather: ${w.name}\nCondition: ${w.weather?.[0]?.description||"-"}\nTemp: ${w.main?.temp??"-"}°C (feels ${w.main?.feels_like??"-"}°C)\nHumidity: ${w.main?.humidity??"-"}%\nWind: ${w.wind?.speed??"-"} m/s`;
}
// ...continuing from inside your kord({cmd:"gost|gst"...}) handler

// WEATHER
if(sub==="setcity"){
  if(!rest) return sendText(m,"Use: gost setcity <city>");
  setPrefs(m,{city:rest});
  return sendText(m,`Default city set: ${rest}`);
}

if(sub==="weather"){
  const prefs=getPrefs(m);
  const city=rest||prefs.city;
  if(!city) return sendText(m,"Use: gost weather <city>  (or set default with gost setcity <city>)");
  const rep=await getWeather(city);
  return sendText(m, rep);
}

// MUSIC (Deezer preview)
if(sub==="music"){
  if(!rest) return sendText(m,`Use: ${p}gost music <query>`);
  const r=await searchMusic(rest);

  // If you have an audio sender, use it; else show link/text
  if(r.preview){
    // If your framework supports sending audio from URL:
    // return sendAudio(m, r.preview, r.text);

    // fallback to text (preview URL included)
    return sendText(m, `${r.text}\n${r.preview}`);
  }
  return sendText(m, r.text);
}

// ROAST
if(sub==="roast"){
  // roast self or mentioned user
  let target="you";
  const mentioned =
    (m.mentionedJid && m.mentionedJid.length) ? m.mentionedJid[0] : null;

  if(rest){
    // if they typed @user or a name, just use rest
    target = rest;
  } else if(mentioned) {
    target = `@${mentioned.split("@")[0]}`;
  }

  const roast = await doRoast(m, target);
  saveLastRoast?.(m, roast); // optional if you have it; safe-call
  return sendText(m, roast);
}

if(sub==="lastroast"){
  const lr = loadLastRoast?.(m);
  if(!lr) return sendText(m,"No last roast saved yet. Use: gost roast");
  return sendText(m, lr);
}

// AI MODES (one-shot prompt)
if(["chat","coach","writer","coder"].includes(sub)){
  if(!rest) return sendText(m,`Use: ${p}gost ${sub} <message>`);
  const out = await aiReply(m, rest, sub, sub);
  return sendText(m, out);
}

// TRANSLATE
if(sub==="translate"){
  if(!rest) return sendText(m,`Use: ${p}gost translate <text>`);
  const out = await aiReply(m, `Translate this text to clear English (and keep meaning):\n\n${rest}`, "translate", "translate");
  return sendText(m, out);
}

// SUMMARIZE (expects reply)
if(sub==="summarize"){
  const quoted = getQuotedText?.(m) || ""; // depends on your framework
  const toSum = (rest || quoted).trim();
  if(!toSum) return sendText(m, `Reply a message then use: ${p}gost summarize`);
  const out = await aiReply(m, `Summarize this in 5 bullet points:\n\n${toSum}`, "summarize", "summarize");
  return sendText(m, out);
}

// fallback: show menu if unknown
return sendMenu(m);

}catch(e){
  console.error("GOST CMD ERROR:", e);
  return sendText(m, "❌ Something went wrong. Try again.");
}
});