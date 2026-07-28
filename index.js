"use strict";
process.env.TZ = 'Europe/Berlin';

const FB_EMAIL    = process.env.FB_EMAIL    || "";
const FB_PASSWORD = process.env.FB_PASSWORD || "";

const FB_2FA_SECRET = process.env.FB_2FA_SECRET || "";

import errorReporter from "./utils/errorReporter";

process.on("uncaughtException", (err) => {
  if (err.code === "EPIPE" || err.code === "ECONNRESET" || err.code === "ETIMEDOUT") return;
  errorReporter.report("uncaughtException", err);
});
process.on("unhandledRejection", (reason) => {
  const msg = reason?.message || String(reason);
  if (msg.includes("EPIPE") || msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT")) return;
  errorReporter.report("unhandledRejection", reason instanceof Error ? reason : new Error(msg));
});

const _reactionTimestamps = new Map();
const _reactionListenerRaw = {};
const reactionListenerProxy = new Proxy(_reactionListenerRaw, {
  set(target, prop, value) {
    _reactionTimestamps.set(prop, Date.now());
    target[prop] = value;
    return true;
  },
  deleteProperty(target, prop) {
    _reactionTimestamps.delete(prop);
    delete target[prop];
    return true;
  }
});
global.client           = { reactionListener: reactionListenerProxy };
global._reactionTimestamps = _reactionTimestamps;

global.Kagenou          = { replies: {} };
global.config           = { admins: [], moderators: [], developers: [], vips: [], Prefix: ["."], botName: "Sunken Bot" };
global.globalData       = new Map();
global.usersData        = new Map();
global.userCooldowns    = new Map();
global.commands         = new Map();
global.eventCommands    = [];
global.appState         = {};
global.botApi           = null;

const MIN_SEND_GAP_MS = 350;

const _threadGates = new Map(); 

// Send a message, rate-limited to avoid spamming a thread too fast.
function gatedSend(api, body, threadID, callback, messageID) {
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  
  const rawApi = api.__rawApi || api;

  const key = String(threadID);
  let gate = _threadGates.get(key);
  if (!gate) {
    gate = { promise: Promise.resolve(), lastSendAt: 0 };
    _threadGates.set(key, gate);
  }

  
  
  
  
  const resultPromise = gate.promise.then(async () => {
    const wait = MIN_SEND_GAP_MS - (Date.now() - gate.lastSendAt);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    gate.lastSendAt = Date.now();
    if (messageID !== undefined) return await rawApi.sendMessage(body, threadID, callback, messageID);
    return await rawApi.sendMessage(body, threadID, callback);
  });

  
  
  
  
  gate.promise = resultPromise.catch(e => { console.error("[SEND] خطأ:", e.message); });

  return resultPromise;
}

global.cleanupIdleThreadGates = () => {
  const now = Date.now();
  let removed = 0;
  for (const [tid, g] of _threadGates.entries()) {
    if (now - g.lastSendAt > 30 * 60 * 1000) { _threadGates.delete(tid); removed++; }
  }
  return removed;
};

global.safeSend = gatedSend;

const _wrappedApiCache = new WeakMap();
// Wrap the raw Facebook API so all sends go through the safe/gated sender.
function wrapApiForSafety(api) {
  if (_wrappedApiCache.has(api)) return _wrappedApiCache.get(api);
  const wrapped = Object.create(api);
  wrapped.__rawApi = api; 
  wrapped.sendMessage = (body, threadID, callback, messageID) =>
        global.safeSend(api, body, threadID, callback, messageID);
  _wrappedApiCache.set(api, wrapped);
  return wrapped;
}
global.wrapApiForSafety = wrapApiForSafety;

import fs from "fs-extra";
import path from "path";
import { pathToFileURL } from "url";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
import { buildMessageAPI, buildCommandContext  } from "./utils/context";
import timing from "./utils/timing";
import botEnhancer from "./utils/bot-enhancer";
import cache from "./utils/cache";
import { TOTP } from "totp-generator";
import os from "os";
import { searchVideos, downloadAudio, downloadVideo  } from "./utils/ytEngine";
const fcaModule = require("fca-unofficial");
const login     = fcaModule.login || fcaModule.default;
console.log("[FCA CHECK] resolved from:", require.resolve("fca-unofficial"));
console.log("[FCA CHECK] default apiServer:", JSON.stringify(fcaModule.defaultConfig.apiServer), "| autoLogin:", fcaModule.defaultConfig.autoLogin);
import chalk from "chalk";
import express from "express";
import https from "https";
import http from "http";

try { await import("dotenv/config"); } catch (_) {}

(() => {
  const hasAppState = fs.existsSync(path.join(import.meta.dir, "appstate.json")) || !!process.env.APPSTATE;
  const hasEmailPass = !!(process.env.FB_EMAIL && process.env.FB_PASSWORD);
  if (!hasAppState && !hasEmailPass) {
    console.warn(chalk.yellow(
      "[ENV] ⚠️ لا يوجد appstate.json ولا FB_EMAIL/FB_PASSWORD في البيئة — راجع .env.example"
    ));
  }
  if (!process.env.MONGO_URI) {
    console.warn(chalk.yellow("[ENV] ⚠️ MONGO_URI غير مضبوط — بيانات المستخدمين لن تُحفظ بشكل دائم"));
  }
})();

global.log = {
  info:    msg => console.log(chalk.blue("[INFO]"),    msg),
  warn:    msg => console.log(chalk.yellow("[WARN]"),  msg),
  error:   msg => console.log(chalk.red("[ERROR]"),    msg),
  success: msg => console.log(chalk.green("[SUCCESS]"), msg),
};

// Build the admin/moderator/developer ID sets used for role checks.
function buildRoleSets() {
  global._rolesets = {
    dev:  new Set((global.config.developers || []).map(String)),
    vip:  new Set((global.config.vips       || []).map(String)),
    mod:  new Set((global.config.moderators || []).map(String)),
    adm:  new Set((global.config.admins     || []).map(String)),
  };
}
buildRoleSets();

global.getUserRole = uid => {
  uid = String(uid);
  const r = global._rolesets;
  if (r.dev.has(uid)) return 4;
  if (r.adm.has(uid)) return 3;
  if (r.mod.has(uid)) return 2;
  if (r.vip.has(uid)) return 1;
  return 0;
};

global.setCooldown   = (u, c, t) => global.userCooldowns.set(`${u}:${c}`, Date.now() + t * 1000);
global.checkCooldown = (u, c) => {
  const key = `${u}:${c}`;
  const exp = global.userCooldowns.get(key);
  if (!exp || Date.now() >= exp) {
    global.userCooldowns.delete(key); 
    return null;
  }
  return `⏳ انتظر ${Math.ceil((exp - Date.now()) / 1000)} ث`;
};

try {
  const cfg = JSON.parse(fs.readFileSync(path.join(import.meta.dir, "config.json"), "utf8"));
  global.config = { ...global.config, ...cfg, Prefix: cfg.Prefix || ["."] };
  buildRoleSets(); 
} catch { console.warn("[WARN] Using default config"); }

// Load all command modules from the cmds directory into the registry.
const loadCommands = async () => {
  const dir = path.join(import.meta.dir, "cmds");
  if (!fs.existsSync(dir)) return [];
  global.commands.clear();
  global.eventCommands = [];

  const fileErrors = [];
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".js"));
  console.log(chalk.blue(`[CMDS] 📦 بدء تحميل ${files.length} ملف من مجلد cmds/ (بعد استقرار الاتصال)...`));
  for (const file of files) {
    try {
      const p   = path.join(dir, file);
      const cmd = await import(`${pathToFileURL(p).href}?update=${Date.now()}`);
      const mod = cmd.default || cmd;
      if (mod.config?.name && (mod.onStart || mod.run || mod.execute)) {
        const name = mod.config.name.toLowerCase();
        global.commands.set(name, mod);
        (mod.config.aliases || []).forEach(a => {
          global.commands.set(a.toLowerCase(), mod);
        });
        console.log(chalk.gray(`[CMDS]   ↳ ${file} ✅ (${name})`));
      } else {
        console.log(chalk.gray(`[CMDS]   ↳ ${file} ⏭️ (بلا config.name صالح)`));
      }
      if (mod.onChat || mod.handleEvent) global.eventCommands.push(mod);
    } catch (err) {
      console.warn(chalk.yellow(`[CMDS]   ↳ ${file} ❌ فشل: ${err.message}`));
      fileErrors.push({ file, message: err.message });
    }
  }
  console.log(chalk.blue(`[INFO] تم تحميل ${global.commands.size} أمر بنجاح من أصل ${files.length} ملف`));
  return fileErrors;
};
global.reloadCommands = loadCommands;

try {
  const p = path.join(import.meta.dir, "appstate.json");
  if (fs.existsSync(p)) {
    global.appState = JSON.parse(fs.readFileSync(p, "utf8"));
  } else if (process.env.APPSTATE || process.env.APPSTATE_BOT1) {
    global.appState = JSON.parse(process.env.APPSTATE || process.env.APPSTATE_BOT1);
  }
} catch { }

// Handle an incoming message: dispatch to the matching command.
const handleMessage = async (rawApi, event) => {
  const { threadID, senderID, body, messageReply, messageID } = event;
  const hasAttachment = (event.attachments?.length > 0);
  if (!body?.trim() && !hasAttachment) return;

  
  
  const api = global.wrapApiForSafety(rawApi);

  const messageText = body.trim();

  
  if (messageReply && global.Kagenou.replies?.[messageReply.messageID]) {
    const replyData = global.Kagenou.replies[messageReply.messageID];
    
    if (!replyData.author || replyData.author === senderID) {
      delete global.Kagenou.replies[messageReply.messageID];
      
      
      const cmdForReply = replyData.commandName
        ? global.commands.get(replyData.commandName)
        : null;
      const handler = replyData.onReply || replyData.callback ||
        (cmdForReply?.onReply ? (...a) => cmdForReply.onReply(...a) : null);
      if (typeof handler === "function") {
        const replyMessage = buildMessageAPI(api, threadID, undefined);
        
        handler({ api, event, message: replyMessage, Reply: replyData })
          .catch(e => console.error("[REPLY ERROR]", e.message));
      }
    }
    return;
  }

  
  const parts       = messageText.split(/ +/);
  const commandName = parts[0]?.toLowerCase();
  const args        = parts.slice(1);
  const command     = global.commands.get(commandName);
  if (!command) return;

  
  const role    = global.getUserRole(senderID);
  const reqRole = command.config?.role ?? 0;
  if (role < reqRole) {
    api.sendMessage("⚠️ هذا الأمر للمشرفين فقط", threadID, null, messageID);
    return;
  }

  
  const cd    = command.config?.countDown ?? 3;
  const cdMsg = global.checkCooldown(senderID, commandName);
  if (cdMsg) { api.sendMessage(cdMsg, threadID, null, messageID); return; }
  global.setCooldown(senderID, commandName, cd);

  
  
  (async () => {
    const timer = timing.start(`command:${commandName}`); 
    try {
      const ctx = buildCommandContext({ api, event, args });
      if      (command.onStart) await command.onStart(ctx);
      else if (command.run)     await command.run(ctx);
      else if (command.execute) await command.execute(api, event, args, global.commands, "", global.config.admins, global.appState, t => api.sendMessage(t, threadID, null, messageID), global.usersData, global.globalData);
      timer.end();
    } catch (err) {
      timer.end("(فشل)");
      errorReporter.report(`command:${commandName}`, err);
      api.sendMessage("⚠️ حدث خطأ أثناء تنفيذ الأمر — تم إبلاغ المطوّر تلقائياً.", threadID, null, messageID);
    }
  })();
};

// Handle an incoming message reaction event.
const handleReaction = (api, event) => {
  const msgID = event.messageID;
  if (!msgID) return;

  const entry = global.client.reactionListener[msgID];
  if (!entry) return;

  if (entry.author && event.userID !== entry.author) return;

  Promise.resolve(entry.callback({ api, event }))
    .catch(e => console.error("[REACTION ERR]", e.message));
};

// Route an incoming realtime event to the right handler by type.
const handleEvent = async (rawApi, event) => {
  const api = global.wrapApiForSafety(rawApi);

  const firstWord = event.body?.trim().split(/ +/)[0]?.toLowerCase();

  for (const cmd of global.eventCommands) {
    if (!cmd.onChat) continue;
    const hasAtt = (event.attachments?.length > 0);
    if (!event.messageID || (!event.body && !hasAtt)) continue;
    if (firstWord && global.commands.get(firstWord) === cmd) continue;

    cmd.onChat({
      api, event,
      message: buildMessageAPI(api, event.threadID, event.messageID),
    }).catch(() => {});
  }
};

// Start listening for realtime events, restarting the listener if it drops.
const startListening = (api) => {
  let attempts       = 0;
  let listenerActive = false;

  const listen = () => {

    if (listenerActive) return;
    listenerActive = true;

    api.listenMqtt(async (err, event) => {
      if (err) {

        const fatal = /appstate|not logged in|not-logged-in|401|login/i.test(err.message || "");
        if (!fatal) {
          console.warn(chalk.yellow("[MQTT] ⚠️ تحذير عابر (تُعالجه المكتبة داخلياً):"), err.message);
          return;
        }
        listenerActive = false;
        attempts++;
        console.error(chalk.red(`[MQTT] خطأ قاتل (${attempts}):`, err.message));
        errorReporter.report("mqtt:fatal", err);
        return setTimeout(listen, Math.min(5000 * attempts, 30000));
      }
      attempts = 0;
      try {
        if (["message","message_reply","log","event"].includes(event.type)) {
          
          
          
          handleEvent(api, event).catch(e => console.error("[EVENT ERR]", e.message));
          handleMessage(api, event).catch(e => console.error("[EVENT ERR]", e.message));
        } else if (event.type === "message_reaction") {
          handleReaction(api, event);
        }
      } catch (e) { console.error("[EVENT ERR]", e.message); }
    });
  };
  listen();
  console.log(chalk.green("[SUCCESS] Bot listening..."));
};

// Start the small HTTP server used for health checks/keep-alive.
function startWebServer() {
  const PORT = parseInt(process.env.PORT || "10000");
  const app  = express();

  
  app.get("/", (_req, res) => {
    res.send(`
      <!DOCTYPE html><html lang="ar" dir="rtl">
      <head><meta charset="UTF-8"><title>${global.config.botName}</title></head>
      <body style="font-family:sans-serif;padding:30px;background:#0d1117;color:#c9d1d9">
        <h2>🤖 ${global.config.botName}</h2>
        <p>الحالة: <b style="color:#3fb950">✅ يعمل</b></p>
        <p>⏱️ Uptime: ${Math.floor(process.uptime())} ثانية</p>
        <p>📦 الأوامر: ${global.commands.size}</p>
        <p>🔗 البوت: ${global.botApi ? "متصل" : "جاري الاتصال..."}</p>
      </body></html>
    `);
  });

  
  app.get("/health",     healthHandler);
  app.get("/api/health", healthHandler);

  function healthHandler(_req, res) {
    res.json({
      status:    "ok",
      bot:       global.botApi ? "connected" : "connecting",
      commands:  global.commands.size,
      uptime:    Math.floor(process.uptime()),
      memory:    `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
      timestamp: new Date().toISOString(),
    });
  }

  
  
  
  
  
  (() => {
    app.use(express.json());

    
    app.post("/yt/search", async (req, res) => {
      try {
        const query = (req.body?.query || "").trim();
        const limit = Math.min(parseInt(req.body?.limit || 10), 15);
        if (!query) return res.status(400).json({ error: "query مطلوب" });

        const results = await searchVideos(query, limit);
        res.json({ results });
      } catch (e) {
        console.error("[YT/search]", e.message);
        res.status(500).json({ error: e.message?.slice(0, 300) });
      }
    });

    app.post("/yt/audio", async (req, res) => {
      const url = (req.body?.url || "").trim();
      if (!url) return res.status(400).json({ error: "url مطلوب" });
      let tmpPath = null;
      try {
        const dl = await downloadAudio(url);
        tmpPath  = dl.filePath;

        res.set({
          "Content-Type":        "audio/mpeg",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(dl.title)}.mp3"`,
          "X-Title":             encodeURIComponent(dl.title),
          "X-Duration":          String(dl.duration),
          "X-Uploader":          encodeURIComponent(dl.uploader),
        });
        const stream = fs.createReadStream(tmpPath);
        stream.on("end",   () => fs.remove(tmpPath).catch(() => {}));
        stream.on("error", () => fs.remove(tmpPath).catch(() => {}));
        stream.pipe(res);
      } catch (e) {
        if (tmpPath) fs.remove(tmpPath).catch(() => {});
        console.error("[YT/audio]", e.message);
        res.status(500).json({ error: e.message?.slice(0, 300) });
      }
    });

    
    app.post("/yt/video", async (req, res) => {
      const url = (req.body?.url || "").trim();
      if (!url) return res.status(400).json({ error: "url مطلوب" });
      let tmpPath = null;
      try {
        const dl = await downloadVideo(url);
        tmpPath  = dl.filePath;

        res.set({
          "Content-Type":        "video/mp4",
          "Content-Disposition": `attachment; filename="${encodeURIComponent(dl.title)}.mp4"`,
          "X-Title":             encodeURIComponent(dl.title),
          "X-Duration":          String(dl.duration),
          "X-Uploader":          encodeURIComponent(dl.uploader),
        });
        const stream = fs.createReadStream(tmpPath);
        stream.on("end",   () => fs.remove(tmpPath).catch(() => {}));
        stream.on("error", () => fs.remove(tmpPath).catch(() => {}));
        stream.pipe(res);
      } catch (e) {
        if (tmpPath) fs.remove(tmpPath).catch(() => {});
        console.error("[YT/video]", e.message);
        res.status(500).json({ error: e.message?.slice(0, 300) });
      }
    });

    console.log(chalk.green("[SUCCESS] 🎵 YouTube routes جاهزة (/yt/search, /yt/audio, /yt/video)"));
  })();

  app.listen(PORT, () => {
    console.log(chalk.green(`[SUCCESS] 🌐 Web server على المنفذ ${PORT}`));
  });

  global.expressApp = app;

  
  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  if (externalUrl) {
    setInterval(() => {
      const url = externalUrl.replace(/\/$/, "") + "/health";
      const mod = url.startsWith("https") ? https : http;
      const req = mod.get(url, (r) => {
        r.resume(); 
        if (r.statusCode !== 200) console.warn("[KEEP-ALIVE] ⚠️ status:", r.statusCode);
      });
      req.on("error", (e) => console.warn("[KEEP-ALIVE] ⚠️ خطأ:", e.message));
      req.setTimeout(20000, () => req.destroy());
    }, 10 * 60 * 1000);
    console.log(chalk.cyan(`[KEEP-ALIVE] ✅ بنغ ذاتي مفعّل لـ ${externalUrl}`));
  } else {
    console.warn(chalk.yellow("[KEEP-ALIVE] ⚠️ RENDER_EXTERNAL_URL غير مضبوط — البوت قد ينام بعد 15 دقيقة خمول (Free Plan)"));
  }

  
  
  
  
  
  
  const hfBaseForPing = (process.env.HF_SPACE_URL || "").trim().replace(/\/+$/, "");
  if (hfBaseForPing) {
    setInterval(() => {
      const url = hfBaseForPing + "/ping";
      const mod = url.startsWith("https") ? https : http;
      const req = mod.get(url, (r) => {
        r.resume();
        if (r.statusCode !== 200) console.warn("[KEEP-ALIVE:HF] ⚠️ status:", r.statusCode);
      });
      req.on("error", (e) => console.warn("[KEEP-ALIVE:HF] ⚠️ خطأ:", e.message));
      req.setTimeout(20000, () => req.destroy());
    }, 5 * 60 * 1000);
    console.log(chalk.cyan(`[KEEP-ALIVE:HF] ✅ بنغ ذاتي مفعّل لـ ${hfBaseForPing}`));
  } else {
    console.warn(chalk.yellow("[KEEP-ALIVE:HF] ⚠️ HF_SPACE_URL غير مضبوط — لن يتم إبقاء HF Space صاحياً"));
  }
}

import { connectDB, flushAllAndDisconnect  } from "./db/index";

["SIGTERM", "SIGINT"].forEach(sig => {
  process.on(sig, async () => {
    console.log(chalk.yellow(`[SHUTDOWN] إشارة ${sig} — جاري حفظ البيانات قبل الإغلاق...`));
    try { await flushAllAndDisconnect(); } catch (_) {}
    process.exit(0);
  });
});

// Generate a 2FA (TOTP) login code from the account's secret.
function generate2FACode(secret) {
  if (!secret || secret === "2FA_SECRET_HERE") return null;
  try {
    
    const { otp } = TOTP.generate(secret.replace(/\s+/g, "").toUpperCase(), { digits: 6, period: 30 });
    console.log(chalk.cyan("[2FA] ✅ تم توليد رمز TOTP تلقائياً"));
    return String(otp);
  } catch (err) {
    console.warn(chalk.yellow("[2FA] ⚠️ totp-generator غير متاح:", err.message));
    return null;
  }
}

const BOT_TMP_PREFIXES = ["fb_", "pin_", "tumblr_", "sc_", "sing_", "tts_", "ydl_", "yt_", "yt2_", "yt_a_", "yt_v_"];
// Delete leftover temp files from previous runs on startup.
function cleanupOrphanTempFiles() {
  try {
    const dir = os.tmpdir();
    const now = Date.now();
    let removed = 0;
    for (const name of fs.readdirSync(dir)) {
      if (!BOT_TMP_PREFIXES.some(p => name.startsWith(p))) continue;
      const fp = path.join(dir, name);
      try {
        const stat = fs.statSync(fp);
        if (now - stat.mtimeMs > 60 * 60 * 1000) { 
          fs.removeSync(fp);
          removed++;
        }
      } catch (_) {}
    }
    if (removed) console.log(chalk.cyan(`[CLEANUP] 🗑️ حُذف ${removed} ملف مؤقت يتيم`));
  } catch (e) {
    console.warn(chalk.yellow("[CLEANUP] ⚠️ فشل تنظيف الملفات المؤقتة:", e.message));
  }
}
global.cleanupOrphanTempFiles = cleanupOrphanTempFiles;

// Persist the Facebook login session state to disk.
function saveAppState(state) {
  const filePath = path.join(import.meta.dir, "appstate.json");
  try {
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
    try { fs.chmodSync(filePath, 0o600); } catch (_) {} 
    console.log(chalk.green("[SESSION] 💾 appstate.json محفوظ بنجاح"));
  } catch (err) {
    console.error(chalk.red("[SESSION] ❌ فشل حفظ appstate:", err.message));
  }
}

// Log in to Facebook with the given credentials.
function doLogin(credentials, onSuccess) {
  login(credentials, (err, api) => {
    if (!err) return onSuccess(api);

    const errMsg = err?.error || err?.message || String(err);
    console.error(chalk.red("[LOGIN] ❌ فشل تسجيل الدخول:", errMsg));
    errorReporter.report("login:failed", err instanceof Error ? err : new Error(errMsg));

    
    if (err.error === "login-approval" || errMsg.includes("login-approval")) {
      console.log(chalk.yellow("[2FA] ⚡ فيسبوك يطلب رمز التحقق — جاري التوليد التلقائي..."));
      const code = generate2FACode(FB_2FA_SECRET);
      if (code && err.continue) {
        err.continue(code, (err2, api2) => {
          if (!err2) return onSuccess(api2);
          console.error(chalk.red("[2FA] ❌ فشل رمز 2FA:", err2?.message || err2));
          process.exit(1);
        });
        return;
      }
      console.error(chalk.red("[2FA] ❌ لا يوجد مفتاح 2FA أو لا يمكن المتابعة"));
      process.exit(1);
    }

    process.exit(1);
  });
}

// Set up the bot (commands, listeners, web server) after a successful login.
function onLoginSuccess(api) {
  
  api.setOptions({
    forceLogin:       true,
    listenEvents:     true,
    updatePresence:   false,
    selfListen:       false,
    online:           true,
    autoMarkRead:     false,
    listenTyping:     false,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  });

  console.log(chalk.green("[LOGIN] ✅ الاتصال بفيسبوك مستقر"));

  global.botApi = api;
  botEnhancer(api);

  
  const freshState = api.getAppState();
  if (freshState?.length) {
    saveAppState(freshState);
    global.appState = freshState;
  }

  
  setInterval(() => {
    try {
      const refreshed = api.getAppState();
      if (refreshed?.length) {
        saveAppState(refreshed);
        global.appState = refreshed;
        console.log(chalk.cyan("[SESSION] 🔄 AppState جُدِّد تلقائياً"));
      }
    } catch (_) {}
  }, 2 * 60 * 60 * 1000);

  
  
  
  
  (async () => {
    if (_dbReadyPromise) { try { await _dbReadyPromise; } catch (_) {} }
    startListening(api);
  })();

  
  
  
  
  setInterval(() => {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, data] of Object.entries(global.Kagenou.replies)) {
      if (now - (data.timestamp || 0) > 10 * 60 * 1000) {
        delete global.Kagenou.replies[id]; cleaned++;
      }
    }
    for (const [key, exp] of global.userCooldowns.entries()) {
      if (now >= exp) { global.userCooldowns.delete(key); cleaned++; }
    }
    for (const [uid, data] of global.usersData.entries()) {
      if (data._lastSeen && now - data._lastSeen > 60 * 60 * 1000) {
        global.usersData.delete(uid); cleaned++;
      }
    }
    
    for (const [msgID, ts] of global._reactionTimestamps.entries()) {
      if (now - ts > 10 * 60 * 1000) {
        delete global.client.reactionListener[msgID]; cleaned++;
      }
    }
    
    cleanupOrphanTempFiles();
    
    try { cache.sweep(); } catch (_) {}
    
    try { cleaned += global.cleanupIdleThreadGates(); } catch (_) {}

    
    
    
    if (typeof Bun !== "undefined" && typeof Bun.gc === "function") {
      try { Bun.gc(true); } catch (_) {}
    } else if (typeof global.gc === "function") {
      try { global.gc(); } catch (_) {}
    }

    const mem = process.memoryUsage();
    console.log(chalk.cyan(
      `[CLEANUP] 🧹 حُذف ${cleaned} مدخلة | RSS: ${Math.round(mem.rss/1024/1024)}MB` +
      ` | Heap: ${Math.round(mem.heapUsed/1024/1024)}/${Math.round(mem.heapTotal/1024/1024)}MB`
    ));
  }, 10 * 60 * 1000);

}

let _dbReadyPromise = null;

// Entry point: connect to the DB and log in to start the bot.
const startBot = async () => {
  
  startWebServer();

  
  cleanupOrphanTempFiles();

  
  
  
  
  
  
  
  
  const appStateFile  = path.join(import.meta.dir, "appstate.json");
  const hasAppState   = fs.existsSync(appStateFile) || global.appState?.length > 0;

  if (hasAppState) {
    console.log(chalk.blue("[LOGIN] 🔑 جاري تسجيل الدخول بـ AppState..."));

    login({ appState: global.appState }, (err, api) => {
      if (!err) {
        console.log(chalk.green("[LOGIN] ✅ تسجيل الدخول بـ AppState نجح"));
        return onLoginSuccess(api);
      }

      const errMsg = err?.error || err?.message || String(err);

      
      if (err.error === "login-approval" || errMsg.includes("login-approval")) {
        console.log(chalk.yellow("[2FA] ⚡ AppState يطلب 2FA — جاري التوليد..."));
        const code = generate2FACode(FB_2FA_SECRET);
        if (code && err.continue) {
          err.continue(code, (err2, api2) => {
            if (!err2) {
              console.log(chalk.green("[LOGIN] ✅ 2FA نجح مع AppState"));
              return onLoginSuccess(api2);
            }
            fallbackToEmailLogin(errMsg);
          });
          return;
        }
      }

      
      fallbackToEmailLogin(errMsg);
    });

  } else {
    
    fallbackToEmailLogin("لا يوجد appstate.json");
  }

  
  
  
  
  
  
  loadCommands();
  _dbReadyPromise = connectDB().catch(e => {
    console.error(chalk.red("[DB] ❌ فشل الاتصال (سيُتابع البوت بدون تخزين دائم):"), e.message);
  });
};

// Fall back to email/password login if the saved session state fails.
function fallbackToEmailLogin(reason) {
  console.log(chalk.yellow(`[LOGIN] ⚠️ AppState فشل (${reason?.substring?.(0,80) || reason})`));
  console.log(chalk.blue("[LOGIN] 🔄 الانتقال لتسجيل الدخول بـ Email/Password..."));

  if (!FB_EMAIL || !FB_PASSWORD) {
    console.error(chalk.red("[LOGIN] ❌ بيانات الدخول (Email/Password) غير مضبوطة في .env"));
    process.exit(1);
  }

  doLogin({ email: FB_EMAIL, password: FB_PASSWORD }, (api) => {
    console.log(chalk.green("[LOGIN] ✅ تسجيل الدخول بـ Email/Password نجح"));
    onLoginSuccess(api);
  });
}

startBot();
