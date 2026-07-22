/* jshint esversion: 11 */
"use strict";
process.env.TZ = 'Europe/Berlin';
// ════════════════════════════════════════════════════════════
//  ⚙️  بيانات تسجيل الدخول الاحتياطي
//  تُقرأ حصراً من متغيرات البيئة (.env أو Render → Environment
//  Variables) — لا قيم افتراضية هنا، تفادياً لإغراء أي مطوّر
//  مستقبلي بلصق بيانات حساب حقيقية مباشرة داخل الكود المصدري.
// ════════════════════════════════════════════════════════════
const FB_EMAIL    = process.env.FB_EMAIL    || "";
const FB_PASSWORD = process.env.FB_PASSWORD || "";

// مفتاح المصادقة الثنائية (2FA Secret Key) من إعدادات حسابك
// إذا لم يكن لديك 2FA مفعّل، اتركه فارغاً في .env
const FB_2FA_SECRET = process.env.FB_2FA_SECRET || "";

// ════════════════════════════════════════════════════════════

import errorReporter from "./utils/errorReporter";

// ─── منع EPIPE وأخطاء الشبكة من إسقاط البوت ─────────────────
process.on("uncaughtException", (err) => {
  if (err.code === "EPIPE" || err.code === "ECONNRESET" || err.code === "ETIMEDOUT") return;
  errorReporter.report("uncaughtException", err);
});
process.on("unhandledRejection", (reason) => {
  const msg = reason?.message || String(reason);
  if (msg.includes("EPIPE") || msg.includes("ECONNRESET") || msg.includes("ETIMEDOUT")) return;
  errorReporter.report("unhandledRejection", reason instanceof Error ? reason : new Error(msg));
});

// ─── Globals ─────────────────────────────────────────────────
// reactionListener: نستخدم Proxy ليسجّل تلقائياً وقت كل إدخال (timestamp)
// دون الحاجة لتعديل كل ملف أمر يضيف مستمع تفاعل — هذا يتيح تنظيفه
// دورياً في حال نسي أحد الملفات حذف الإدخال بنفسه عند خطأ غير متوقع.
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

// ─── إرسال مباشر مع فاصل زمني بسيط جداً (بلا طابور معقّد، بلا حدود) ──
// فيسبوك نفسه قد يتجاهل الرسائل بصمت إن أُرسلت متتالية بسرعة كبيرة
// جداً (0 فاصل). هذا فاصل أدنى صغير فقط بين كل رسالتين متتاليتين —
// لا يحجب أو يحدّ عدد الرسائل، فقط يباعد بينها زمنياً قليلاً.
const MIN_SEND_GAP_MS = 350;

// ← طابور مستقل لكل محادثة (threadID) بدل طابور عالمي واحد.
// الطابور العالمي القديم كان يجعل رسالة محادثة A تنتظر خلف رسالة
// محادثة B غير المرتبطة إطلاقاً، رغم أن هدف الفاصل الزمني هو حماية
// نفس المحادثة من إرسال متسارع، لا خنق كل المحادثات المتوازية.
const _threadGates = new Map(); // threadID -> { promise, lastSendAt }

function gatedSend(api, body, threadID, callback, messageID) {
  // ━━━ إصلاح جوهري: تعليق دائري (deadlock) ━━━━━━━━━━━━━━━━━━━━━━━━
  // كل ملفات الأوامر تقريباً (وأيضاً utils/context.js) تستدعي
  // global.safeSend(api, ...) حيث "api" هي أصلاً النسخة "المُغلَّفة"
  // (ctx.api) التي أنتجها wrapApiForSafety أدناه. تلك النسخة المُغلَّفة
  // إذا استُدعي عليها .sendMessage تُعيد توجيه النداء عبر
  // global.safeSend مرة أخرى لنفس الـ threadID — فيصير عندنا استدعاءان
  // متداخلان لنفس طابور المحادثة (gate.promise)، كل واحد منهما ينتظر
  // انتهاء الآخر قبل أن يبدأ = تعليق دائري لا يُحل ولا يُرفض أبداً.
  // النتيجة العملية: الأمر يُنفَّذ (يعالج الطلب، يولّد الرد) لكن الرسالة
  // لا تُرسل أبداً بصمت تام، بلا أي خطأ يظهر في اللوغ.
  //
  // الحل: مهما كان شكل "api" الممرَّر (خام أو مُغلَّف)، نحل الـ.
  // sendMessage الحقيقي مرة واحدة بالضبط عبر __rawApi (مضبوطة في
  // wrapApiForSafety)، بدل الاعتماد على api.sendMessage مباشرة الذي قد
  // يعيد التوجيه للطابور نفسه.
  const rawApi = api.__rawApi || api;

  const key = String(threadID);
  let gate = _threadGates.get(key);
  if (!gate) {
    gate = { promise: Promise.resolve(), lastSendAt: 0 };
    _threadGates.set(key, gate);
  }

  // resultPromise: الوعد الحقيقي اللي بيرجع للمستدعي — لازم ينتظر انتهاء
  // api.sendMessage فعلياً (بما فيه رفع أي مرفقات) قبل ما يتحقق، حتى
  // أي كود بعده (متل finally { fs.remove(tmpFiles) } بـ pin.js) ما
  // يشتغل إلا بعد ما يخلص الإرسال والرفع فعلاً — مو بس بعد جدولته.
  const resultPromise = gate.promise.then(async () => {
    const wait = MIN_SEND_GAP_MS - (Date.now() - gate.lastSendAt);
    if (wait > 0) await new Promise(r => setTimeout(r, wait));
    gate.lastSendAt = Date.now();
    if (messageID !== undefined) return await rawApi.sendMessage(body, threadID, callback, messageID);
    return await rawApi.sendMessage(body, threadID, callback);
  });

  // gate.promise (طابور المباعدة الزمنية لنفس المحادثة) لازم يضل يمشي
  // حتى لو رسالة معينة فشلت — عشان ما نعلّق الرسائل الجاية بعدها بنفس
  // المحادثة. هيك منفصلين: فشل رسالة وحدة ما يوقف الطابور، لكن المستدعي
  // (resultPromise) لسه بياخد نتيجة/خطأ رسالته هو بالضبط وبتوقيتها الصح.
  gate.promise = resultPromise.catch(e => { console.error("[SEND] خطأ:", e.message); });

  return resultPromise;
}

// تنظيف بوابات المحادثات الخاملة (لم تُرسل رسالة خلال 30 دقيقة) —
// يُستدعى من نفس دورة التنظيف الدورية الموجودة أصلاً في onLoginSuccess
global.cleanupIdleThreadGates = () => {
  const now = Date.now();
  let removed = 0;
  for (const [tid, g] of _threadGates.entries()) {
    if (now - g.lastSendAt > 30 * 60 * 1000) { _threadGates.delete(tid); removed++; }
  }
  return removed;
};

global.safeSend = gatedSend;

// تغليف فعلي على api: أي استدعاء مباشر لـ api.sendMessage داخل أي أمر
// (حتى لو نسي المطوّر استخدام global.safeSend) يُعاد توجيهه تلقائياً
// عبر الطابور المحمي (gatedSend) — حماية احتياطية إضافية من السبام.
const _wrappedApiCache = new WeakMap();
function wrapApiForSafety(api) {
  if (_wrappedApiCache.has(api)) return _wrappedApiCache.get(api);
  const wrapped = Object.create(api);
  wrapped.__rawApi = api; // ← مرجع صريح للـ api الخام، يستخدمه gatedSend لكسر أي تعليق دائري
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

// ─── تحقق مبكر من متغيرات البيئة الحساسة ─────────────────────
// لا يوقف البوت (قد يعمل بـ appstate.json فقط دون Email/Password)
// لكنه يحذّر بوضوح بدل اكتشاف الغياب لاحقاً أثناء محاولة الدخول
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

// ─── Logger ──────────────────────────────────────────────────
global.log = {
  info:    msg => console.log(chalk.blue("[INFO]"),    msg),
  warn:    msg => console.log(chalk.yellow("[WARN]"),  msg),
  error:   msg => console.log(chalk.red("[ERROR]"),    msg),
  success: msg => console.log(chalk.green("[SUCCESS]"), msg),
};


// ─── Role Sets (تُبنى مرة واحدة، تُحدَّث عند reload) ──────────
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

// ─── Cooldown (يحذف المنتهي فوراً) ────────────────────────────
global.setCooldown   = (u, c, t) => global.userCooldowns.set(`${u}:${c}`, Date.now() + t * 1000);
global.checkCooldown = (u, c) => {
  const key = `${u}:${c}`;
  const exp = global.userCooldowns.get(key);
  if (!exp || Date.now() >= exp) {
    global.userCooldowns.delete(key); // ← حذف فوري عند الانتهاء
    return null;
  }
  return `⏳ انتظر ${Math.ceil((exp - Date.now()) / 1000)} ث`;
};

// ─── تحميل Config ────────────────────────────────────────────
try {
  const cfg = JSON.parse(fs.readFileSync(path.join(import.meta.dir, "config.json"), "utf8"));
  global.config = { ...global.config, ...cfg, Prefix: cfg.Prefix || ["."] };
  buildRoleSets(); // أعد بناء الـ Sets بعد تحميل config
} catch { console.warn("[WARN] Using default config"); }

// ─── تحميل الأوامر ───────────────────────────────────────────
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

// ─── AppState ────────────────────────────────────────────────
try {
  const p = path.join(import.meta.dir, "appstate.json");
  if (fs.existsSync(p)) {
    global.appState = JSON.parse(fs.readFileSync(p, "utf8"));
  } else if (process.env.APPSTATE || process.env.APPSTATE_BOT1) {
    global.appState = JSON.parse(process.env.APPSTATE || process.env.APPSTATE_BOT1);
  }
} catch { }

// ─── Message Handler ─────────────────────────────────────────
const handleMessage = async (rawApi, event) => {
  const { threadID, senderID, body, messageReply, messageID } = event;
  const hasAttachment = (event.attachments?.length > 0);
  if (!body?.trim() && !hasAttachment) return;

  // نسخة "آمنة" من api: أي api.sendMessage داخل الأوامر يمر تلقائياً
  // عبر طابور safeSend الخاص بالـ threadID (حماية الحساب من السبام)
  const api = global.wrapApiForSafety(rawApi);

  const messageText = body.trim();

  // ─── Reply handler ────────────────────────────────────────
  if (messageReply && global.Kagenou.replies?.[messageReply.messageID]) {
    const replyData = global.Kagenou.replies[messageReply.messageID];
    // لا نحذف الرد حتى نتأكد من التنفيذ
    if (!replyData.author || replyData.author === senderID) {
      delete global.Kagenou.replies[messageReply.messageID];
      // يدعم كلاً من: onReply (yt.js) و callback (أوامر أخرى)
      // إذا لم يكن هناك handler محفوظ، ابحث عن onReply في الأمر نفسه
      const cmdForReply = replyData.commandName
        ? global.commands.get(replyData.commandName)
        : null;
      const handler = replyData.onReply || replyData.callback ||
        (cmdForReply?.onReply ? (...a) => cmdForReply.onReply(...a) : null);
      if (typeof handler === "function") {
        const replyMessage = buildMessageAPI(api, threadID, undefined);
        // بالخلفية — لا يحجب معالجة الأحداث التالية
        handler({ api, event, message: replyMessage, Reply: replyData })
          .catch(e => console.error("[REPLY ERROR]", e.message));
      }
    }
    return;
  }

  // ─── Command routing ──────────────────────────────────────
  const parts       = messageText.split(/ +/);
  const commandName = parts[0]?.toLowerCase();
  const args        = parts.slice(1);
  const command     = global.commands.get(commandName);
  if (!command) return;

  // ─── Role check ───────────────────────────────────────────
  const role    = global.getUserRole(senderID);
  const reqRole = command.config?.role ?? 0;
  if (role < reqRole) {
    api.sendMessage("⚠️ هذا الأمر للمشرفين فقط", threadID, null, messageID);
    return;
  }

  // ─── Cooldown ─────────────────────────────────────────────
  const cd    = command.config?.countDown ?? 3;
  const cdMsg = global.checkCooldown(senderID, commandName);
  if (cdMsg) { api.sendMessage(cdMsg, threadID, null, messageID); return; }
  global.setCooldown(senderID, commandName, cd);

  // ─── Execute (بالخلفية — لا await هنا لحماية التوازي) ────
  // الـ promise تعمل بالخلفية — handleMessage يعود فوراً لاستقبال الطلب التالي
  (async () => {
    const timer = timing.start(`command:${commandName}`); // ← قياس فعلي بدل التخمين
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

// ─── Reaction Handler ──────────────────────────────────────────
const handleReaction = (api, event) => {
  const msgID = event.messageID;
  if (!msgID) return;

  const entry = global.client.reactionListener[msgID];
  if (!entry) return;

  if (entry.author && event.userID !== entry.author) return;

  // بالخلفية
  Promise.resolve(entry.callback({ api, event }))
    .catch(e => console.error("[REACTION ERR]", e.message));
};

// ─── Event Handler ────────────────────────────────────────────
const handleEvent = async (rawApi, event) => {
  const api = global.wrapApiForSafety(rawApi);
  // ━━━ إصلاح السبب الأول للتنفيذ المزدوج ━━━━━━━━━━━━━━━━━━━━
  // إذا كانت الرسالة تبدأ بكلمة تُطابق أمراً معروفاً في global.commands،
  // فسيُعالجه handleMessage عبر onStart — نتجنب استدعاء onChat لنفس الأمر
  const firstWord = event.body?.trim().split(/ +/)[0]?.toLowerCase();

  for (const cmd of global.eventCommands) {
    if (!cmd.onChat) continue;
    const hasAtt = (event.attachments?.length > 0);
    if (!event.messageID || (!event.body && !hasAtt)) continue;
    if (firstWord && global.commands.get(firstWord) === cmd) continue;

    // كل onChat تعمل بالخلفية — لا تنتظر السابقة
    cmd.onChat({
      api, event,
      message: buildMessageAPI(api, event.threadID, event.messageID),
    }).catch(() => {});
  }
};

// ─── MQTT Listener ────────────────────────────────────────────
const startListening = (api) => {
  let attempts       = 0;
  let listenerActive = false; // ← إصلاح السبب الثاني: يمنع تراكم المستمعين

  const listen = () => {
    // ← إذا كان هناك مستمع نشط بالفعل، لا ننشئ آخر
    if (listenerActive) return;
    listenerActive = true;

    api.listenMqtt(async (err, event) => {
      if (err) {
        // ← لا نعيد إنشاء عميل MQTT جديد إلا عند خطأ "قاتل" فعلاً
        // (appstate تالف/منتهي أو عدم تسجيل دخول). المكتبة نفسها تدير
        // إعادة الاتصال داخلياً (_reconnectTimer) للأخطاء العابرة مثل
        // انقطاع شبكة مؤقت — إعادة استدعاء listenMqtt() من هنا لكل
        // خطأ عابر كانت تُنشئ طبقة عميل/مستمع إضافية فوق الآلية
        // الداخلية، فتتراكم الاتصالات مع تكرر انقطاعات الشبكة.
        const fatal = /appstate|not logged in|not-logged-in|401|login/i.test(err.message || "");
        if (!fatal) {
          console.warn(chalk.yellow("[MQTT] ⚠️ تحذير عابر (تُعالجه المكتبة داخلياً):"), err.message);
          return;
        }
        listenerActive = false; // ← نُعلن أن المستمع انتهى قبل إنشاء واحد جديد
        attempts++;
        console.error(chalk.red(`[MQTT] خطأ قاتل (${attempts}):`, err.message));
        errorReporter.report("mqtt:fatal", err);
        return setTimeout(listen, Math.min(5000 * attempts, 30000));
      }
      attempts = 0;
      try {
        if (["message","message_reply","log","event"].includes(event.type)) {
          // كلتا الدالتين fire-and-forget داخلياً (لا تنتظران تنفيذ
          // الأمر فعلياً) — استدعاء بدون await يمنع أي تأخير تتابعي
          // غير ضروري بين الأحداث الواردة من المستمع نفسه
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

// ─── Web Server (Render keep-alive) ──────────────────────────
// يجب أن يبدأ أولاً — Render ينتظر منفذاً مفتوحاً خلال 3-4 دقائق
function startWebServer() {
  const PORT = parseInt(process.env.PORT || "10000");
  const app  = express();

  // الصفحة الرئيسية — تُظهر حالة البوت
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

  // health check — هذا ما يستخدمه Render (healthCheckPath: /api/health)
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

  // ════════════════════════════════════════════════════════
  //  🎵 YouTube Routes — تُستخدم من مصادر خارجية فقط (لم يعد
  //  cmds/yt.js يستدعيها عبر HTTP — أصبح يستخدم utils/ytEngine
  //  مباشرة كدالة، ما يزيل ازدواجية القراءة/الكتابة القديمة)
  // ════════════════════════════════════════════════════════
  (() => {
    app.use(express.json());

    // POST /yt/search
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

    // POST /yt/audio → MP3
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

    // POST /yt/video → MP4
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

  // ─── Keep-Alive: بنغ ذاتي كل 10 دقائق لمنع Render من النوم ────
  const externalUrl = process.env.RENDER_EXTERNAL_URL;
  if (externalUrl) {
    setInterval(() => {
      const url = externalUrl.replace(/\/$/, "") + "/health";
      const mod = url.startsWith("https") ? https : http;
      const req = mod.get(url, (r) => {
        r.resume(); // تفريغ البيانات لإغلاق الاتصال بنجاح
        if (r.statusCode !== 200) console.warn("[KEEP-ALIVE] ⚠️ status:", r.statusCode);
      });
      req.on("error", (e) => console.warn("[KEEP-ALIVE] ⚠️ خطأ:", e.message));
      req.setTimeout(20000, () => req.destroy());
    }, 10 * 60 * 1000);
    console.log(chalk.cyan(`[KEEP-ALIVE] ✅ بنغ ذاتي مفعّل لـ ${externalUrl}`));
  } else {
    console.warn(chalk.yellow("[KEEP-ALIVE] ⚠️ RENDER_EXTERNAL_URL غير مضبوط — البوت قد ينام بعد 15 دقيقة خمول (Free Plan)"));
  }

  // ─── Keep-Alive: بنغ HF Space (الباك-إند Go) كل 5 دقائق ────────
  // بلا هذا، الـ HF Space (g) ينام بعد فترة خمول، وأول طلب بعد النوم
  // (gptx/groq/song/...) يفشل بـ 503 لحين ما تصحو الحاوية بالكامل —
  // هذا هو سبب الأخطاء المتقطعة "الخادم غير متاح حالياً" رغم أن الكود
  // والمفاتيح سليمة. الحل: نفس فكرة keep-alive أعلاه، لكن باتجاه
  // GET {HF_SPACE_URL}/ping بدل /health المحلي.
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

// ─── DB ──────────────────────────────────────────────────────
import { connectDB, flushAllAndDisconnect  } from "./db/index";

// إغلاق سليم: يحفظ آخر تغييرات usersData/globalData قبل إيقاف العملية
// (مثلاً عند إعادة نشر على Render أو إيقاف يدوي)
["SIGTERM", "SIGINT"].forEach(sig => {
  process.on(sig, async () => {
    console.log(chalk.yellow(`[SHUTDOWN] إشارة ${sig} — جاري حفظ البيانات قبل الإغلاق...`));
    try { await flushAllAndDisconnect(); } catch (_) {}
    process.exit(0);
  });
});

// ════════════════════════════════════════════════════════════
//  🔐 توليد رمز 2FA تلقائياً (TOTP)
// ════════════════════════════════════════════════════════════
function generate2FACode(secret) {
  if (!secret || secret === "2FA_SECRET_HERE") return null;
  try {
    // totp-generator@1.x يصدّر class باسم TOTP مع static generate()
    const { otp } = TOTP.generate(secret.replace(/\s+/g, "").toUpperCase(), { digits: 6, period: 30 });
    console.log(chalk.cyan("[2FA] ✅ تم توليد رمز TOTP تلقائياً"));
    return String(otp);
  } catch (err) {
    console.warn(chalk.yellow("[2FA] ⚠️ totp-generator غير متاح:", err.message));
    return null;
  }
}

// ════════════════════════════════════════════════════════════
//  🗑️  تنظيف الملفات المؤقتة اليتيمة (orphaned temp files)
//  بعض ملفات commands تحمّل ملفات مؤقتة في os.tmpdir() وتحذفها بعد
//  الإرسال، لكن عند تعطل غير متوقع (انقطاع الاتصال، استثناء قبل
//  إنشاء الـ stream) قد يبقى الملف على القرص. هذه الدالة تمسح أي
//  ملفات بادئتها معروفة وعمرها أكبر من ساعة، وتُستدعى عند الإقلاع
//  وضمن دورة التنظيف الدورية.
// ════════════════════════════════════════════════════════════
const BOT_TMP_PREFIXES = ["fb_", "pin_", "tumblr_", "sc_", "sing_", "tts_", "ydl_", "yt_", "yt2_", "yt_a_", "yt_v_"];
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
        if (now - stat.mtimeMs > 60 * 60 * 1000) { // أقدم من ساعة
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

// ════════════════════════════════════════════════════════════
//  💾 حفظ AppState على القرص فوراً
// ════════════════════════════════════════════════════════════
function saveAppState(state) {
  const filePath = path.join(import.meta.dir, "appstate.json");
  try {
    fs.writeFileSync(filePath, JSON.stringify(state, null, 2), "utf8");
    try { fs.chmodSync(filePath, 0o600); } catch (_) {} // ← يحمي ملف الجلسة من القراءة من مستخدمين آخرين على نفس الخادم
    console.log(chalk.green("[SESSION] 💾 appstate.json محفوظ بنجاح"));
  } catch (err) {
    console.error(chalk.red("[SESSION] ❌ فشل حفظ appstate:", err.message));
  }
}

// ════════════════════════════════════════════════════════════
//  🔄 الدالة الموحّدة لتسجيل الدخول (appState أو Email/Password)
// ════════════════════════════════════════════════════════════
function doLogin(credentials, onSuccess) {
  login(credentials, (err, api) => {
    if (!err) return onSuccess(api);

    const errMsg = err?.error || err?.message || String(err);
    console.error(chalk.red("[LOGIN] ❌ فشل تسجيل الدخول:", errMsg));
    errorReporter.report("login:failed", err instanceof Error ? err : new Error(errMsg));

    // ─── اكتشاف طلب رمز 2FA ─────────────────────────────
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

// ════════════════════════════════════════════════════════════
//  🚀 تهيئة الـ API بعد نجاح تسجيل الدخول
// ════════════════════════════════════════════════════════════
function onLoginSuccess(api) {
  // ─── إعدادات مقاومة الحظر (Anti-Spam / محاكاة المتصفح) ─
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

  // ─── حفظ الـ AppState الجديد فوراً بعد تسجيل الدخول ───
  const freshState = api.getAppState();
  if (freshState?.length) {
    saveAppState(freshState);
    global.appState = freshState;
  }

  // ─── تجديد الـ AppState دورياً كل ساعتين (قبل انتهائه) ─
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

  // ─── انتظر جاهزية قاعدة البيانات (إن وُجدت) قبل استقبال أي رسائل ──
  // بما أن تسجيل الدخول أصبح يبدأ قبل connectDB() (انظر startBot)،
  // هذا الانتظار الصغير يضمن أن global.db جاهز فعلاً قبل أول رسالة،
  // دون أن يؤخر بدء محاولة الاتصال بفيسبوك نفسها.
  (async () => {
    if (_dbReadyPromise) { try { await _dbReadyPromise; } catch (_) {} }
    startListening(api);
  })();

  // ─── تنظيف الذاكرة كل 10 دقائق ──────────────────────────
  // كانت كل 30 دقيقة — بحاويات 512MB (Render Free) وصلت لـ 97% خلال
  // يوم واحد فقط، فترة أقصر تمنع تراكم الإدخالات المنتهية قبل أن
  // تقترب من حد OOM.
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
    // تنظيف reactionListener المتروك (لم يُحذف يدوياً خلال 10 دقائق)
    for (const [msgID, ts] of global._reactionTimestamps.entries()) {
      if (now - ts > 10 * 60 * 1000) {
        delete global.client.reactionListener[msgID]; cleaned++;
      }
    }
    // تنظيف الملفات المؤقتة اليتيمة في os.tmpdir()
    cleanupOrphanTempFiles();
    // تنظيف الكاش المشترك (utils/cache.js) من المدخلات المنتهية
    try { cache.sweep(); } catch (_) {}
    // تنظيف بوابات إرسال المحادثات الخاملة (utils/context لكل threadID)
    try { cleaned += global.cleanupIdleThreadGates(); } catch (_) {}

    // إجبار Bun على تشغيل GC كامل فوراً بدل انتظار قراره الداخلي —
    // مفيد هنا تحديداً لأننا للتو حذفنا كل تلك المدخلات المنتهية، وبدون
    // هذا قد تبقى محجوزة في الـ heap فترة طويلة رغم أنها غير مُستخدَمة.
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

// ─── DB جاهزة قبل بدء الاستماع الفعلي (لا تؤخر تسجيل الدخول) ──
// connectDB() يبدأ فوراً بالتوازي مع تسجيل الدخول، ونحتفظ بالـ promise
// هنا فقط لننتظره لاحقاً (داخل onLoginSuccess) قبل startListening —
// حتى لا تصل أي رسالة فعلية قبل أن يكون global.db جاهزاً.
let _dbReadyPromise = null;

// ─── Startup ─────────────────────────────────────────────────
const startBot = async () => {
  // ① أول شيء: افتح المنفذ — Render يرفض العملية إذا لم يجد port خلال دقائق
  startWebServer();

  // 🗑️ نظّف أي ملفات مؤقتة متبقية من تشغيل سابق تعطّل فجأة
  cleanupOrphanTempFiles();

  // ════════════════════════════════════════════════════════
  //  ② ابدأ تسجيل الدخول لفيسبوك فوراً — هذه أهم خطوة لتقليل
  //  فترة انقطاع الاتصال بفيسبوك عند إعادة النشر على Render.
  //  login() عملية شبكة (تفاوض مع خوادم فيسبوك) تستغرق عادة
  //  أطول بكثير من تحميل ملفات cmds/*.js أو الاتصال بـ MongoDB،
  //  لذا نطلقها أولاً ونترك البقية تعمل بالتوازي في الخلفية بدل
  //  انتظارها قبل حتى البدء بمحاولة الاتصال.
  // ════════════════════════════════════════════════════════
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

      // ─── طلب 2FA أثناء AppState ────────────────────────
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

      // ─── AppState انتهى أو تالف — انتقل للـ Email ──────
      fallbackToEmailLogin(errMsg);
    });

  } else {
    // لا يوجد AppState — ابدأ مباشرة بـ Email/Password
    fallbackToEmailLogin("لا يوجد appstate.json");
  }

  // ════════════════════════════════════════════════════════
  //  ③ بالتوازي فقط (لا await هنا): تحميل الأوامر + الاتصال
  //  بقاعدة البيانات. هذا لا يؤخر بدء تسجيل الدخول أعلاه إطلاقاً،
  //  لكنه يُنتظر لاحقاً (dbReadyPromise) قبل استقبال أي رسالة فعلية
  //  في onLoginSuccess → startListening.
  // ════════════════════════════════════════════════════════
  loadCommands();
  _dbReadyPromise = connectDB().catch(e => {
    console.error(chalk.red("[DB] ❌ فشل الاتصال (سيُتابع البوت بدون تخزين دائم):"), e.message);
  });
};

// ════════════════════════════════════════════════════════════
//  محاولة ② — تسجيل الدخول بـ Email + Password (Fallback)
// ════════════════════════════════════════════════════════════
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
