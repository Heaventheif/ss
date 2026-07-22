// commands/fb.js
"use strict";
// ============================================================
// commands/fb.js — جسر فقط بين المستخدم و plugins/fb (fb.go) على hf-space.
// كل المنطق (فلترة روابط فيسبوك، الاتصال بـ fdown، فحص وجود صوت عبر
// ffprobe، سلّم الجودة) انتقل بالكامل إلى fb.go عبر POST /fb. هذا الملف
// فقط: يكتشف/يستقبل الرابط من الشات، يستدعي hf-space، يفك base64
// الفيديو المُرجَع لملف مؤقت، ويرسله.
// ============================================================

import fs from "fs-extra";
import os from "os";
import path from "path";
import http from "../utils/fetchHttp";
import { getHfBase, getInternalToken } from "../utils/hfClient";
import errorReporter from "../utils/errorReporter";

const FB_REGEX = /https?:\/\/(www\.)?(facebook\.com|fb\.watch|fb\.com)\/(watch|share|reel|video|reels|[\w.]+\/videos?|[\w.]+\/reels?)[^\s]*/i;

function extractFbUrl(text) {
  return text?.match(FB_REGEX)?.[0] || null;
}

// ─── استدعاء fb.go عبر hf-space ─────────────────────────────────────
async function fetchFbVideo(fbUrl, quality) {
  const { data } = await http.post(
    `${getHfBase()}/fb`,
    { url: fbUrl, quality },
    { timeout: 120000, headers: { "Content-Type": "application/json", "X-Internal-Token": getInternalToken() } }
  );
  if (!data?.video_b64) throw new Error(data?.error || "استجابة فارغة");
  return data;
}

// ─── تحميل وإرسال ────────────────────────────────────────────
// تُرجع true عند النجاح و false عند الفشل — لا تكتم الفشل بصمت،
// بل تسمح للمستدعي (onStart / onChat) بتحديد التفاعل المناسب (✅/❌)
async function downloadAndSend(api, event, fbUrl, quality = "worst", label = "") {
  const { threadID } = event;
  let tmpFile;

  try {
    const { video_b64, title } = await fetchFbVideo(fbUrl, quality);
    const buffer = Buffer.from(video_b64, "base64");

    tmpFile = path.join(os.tmpdir(), `fb_${Date.now()}.mp4`);
    await fs.writeFile(tmpFile, buffer);

    await new Promise((res, rej) =>
      global.safeSend(
        api,
        { body: `🎬 ${title || "فيديو فيسبوك"}${label}`.trim(), attachment: fs.createReadStream(tmpFile) },
        threadID,
        (err) => (err ? rej(err) : res())
      )
    );
    return true;

  } catch (e) {
    console.error("[FB→HF]", e.response?.status, e.message?.substring(0, 200));
    errorReporter.report("fb:downloadAndSend", e);
    return false;
  } finally {
    if (tmpFile) fs.remove(tmpFile).catch(() => {});
  }
}

export default {
  config: {
    name:      "fb",
    aliases:   ["فيسبوك"],
    version:   "5.0.0",
    role:      0,
    countDown: 15,
    category:  "download",
    description: "تحميل فيديو من فيسبوك (أو كشفه تلقائياً من رابط بلا أمر) — جسر إلى fb.go",
    usage: [
      "{pn}فيسبوك <رابط فيسبوك> — تحميل بجودة عادية",
      "{pn}فيسبوك hd <رابط فيسبوك> — تحميل بجودة HD",
      "أرسل رابط فيسبوك مباشرة بدون أمر — يُكتشف ويُحمَّل تلقائياً",
    ],
    hidden: true, // مخفي من قائمة help: يعمل تلقائياً عبر كشف الرابط، ليس أمراً يُكتب يدوياً
  },

  // ─── كشف رابط تلقائي بدون أمر ──────────────────────────────
  onChat: async ({ api, event }) => {
    let fbUrl = null;
    for (const att of (event.attachments || [])) {
      if (att.type === "share" && att.url) { fbUrl = att.url; break; }
    }
    if (!fbUrl) fbUrl = extractFbUrl(event.body);
    if (!fbUrl && event.messageReply?.body) fbUrl = extractFbUrl(event.messageReply.body);
    if (!fbUrl) return;

    await downloadAndSend(api, event, fbUrl, "worst");
  },

  onStart: async ({ api, event, args, message }) => {
    if (!args[0]) return message.reply(
      "📥 فيسبوك دونلودر\n\n" +
      ".fb <رابط>      — تحميل عادي\n" +
      ".fb hd <رابط>  — جودة HD\n\n" +
      "💡 أو أرسل رابط فيسبوك مباشرة بدون أمر!"
    );
    const wantHD  = args[0].toLowerCase() === "hd";
    const urlArg  = wantHD ? args[1] : args[0];
    const quality = wantHD ? "720p" : "worst";
    if (!urlArg) return message.reply("❌ أرسل الرابط بعد hd.");
    const fbUrl = extractFbUrl(urlArg) || urlArg;

    const ok = await downloadAndSend(api, event, fbUrl, quality, wantHD ? " · HD" : "");
    if (!ok) throw new Error("فشل تحميل الفيديو من فيسبوك (تحقق من الرابط أو حاول لاحقاً)");
  },
};
