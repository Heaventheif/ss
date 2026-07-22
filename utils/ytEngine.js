// utils/ytEngine.js
"use strict";

/**
 * منطق تحميل/بحث يوتيوب المشترك — تم استخراجه من index.js ليُستدعى
 * كدالة مباشرة من داخل نفس عملية Node (بدون أي طلب HTTP لنفسه عبر
 * localhost). هذا يزيل الازدواجية القديمة في cmds/yt.js التي كانت:
 *   index.js يكتب الملف على القرص (stream)
 *     → يرسله عبر HTTP response (stream)
 *       → yt.js يستقبله بـ arraybuffer (تحميل كامل بالذاكرة!)
 *         → يكتبه على القرص مرة ثانية
 *           → يعيد قراءته كـ stream ليرسله لفيسبوك
 * الآن: index.js/yt.js يستدعيان downloadAudio/downloadVideo مباشرة،
 * فيبقى الملف يُكتب مرة واحدة فقط على القرص عبر stream حقيقي.
 */

import fs from "fs-extra";
import os from "os";
import path from "path";
import http from "./fetchHttp";
import * as cache from "./cache";

// ← تحميل كسول: هذا الملف يُحمَّل عند الإقلاع (عبر yt.js/yt2.js ضمن
// حلقة تحميل cmds/ في index.js)، فلا نحمّل مكتبات يوتيوب الفعلية إلا
// عند أول استخدام حقيقي لبحث أو تحميل يوتيوب.
async function getYtScraper() { return await import("@vreden/youtube_scraper"); }
async function getYouTube()   { return (await import("youtube-sr")).YouTube; }

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function fmtDur(sec) {
  if (!sec) return "--";
  const m = Math.floor(sec / 60), s = sec % 60, h = Math.floor(m / 60);
  return h ? `${h}:${String(m % 60).padStart(2, "0")}:${String(s).padStart(2, "0")}`
           : `${m}:${String(s).padStart(2, "0")}`;
}

/** تحميل ملف عبر stream حقيقي (بدون تحميله كاملاً في الذاكرة) */
async function streamToFile(url, destPath) {
  const response = await http.get(url, {
    responseType: "stream",
    timeout: 5 * 60 * 1000,
    headers: { "User-Agent": USER_AGENT },
  });
  const writer = fs.createWriteStream(destPath);
  response.data.pipe(writer);
  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
  const stat = await fs.stat(destPath);
  if (!stat.size) throw new Error("الملف المُنزَّل فارغ");
}

async function searchVideos(query, limit = 10) {
  const cacheKey = `yt_search:${query.toLowerCase()}:${limit}`;
  const cached   = cache.get(cacheKey);
  if (cached) return cached;

  const YouTube = await getYouTube();
  const found = await YouTube.search(query, { limit, type: "video", safeSearch: false });
  if (!found?.length) throw new Error("لا توجد نتائج");

  const results = found.slice(0, limit).map(v => ({
    id:       v.id || "",
    title:    v.title || "بدون عنوان",
    url:      v.url || `https://www.youtube.com/watch?v=${v.id}`,
    duration: v.durationFormatted || fmtDur(Math.floor((v.duration || 0) / 1000)) || "--",
    uploader: v.channel?.name || "",
    thumb:    v.thumbnail?.url || "",
  }));
  cache.set(cacheKey, results, 5 * 60 * 1000);
  return results;
}

async function downloadAudio(ytUrl) {
  const ytScraper = await getYtScraper();
  const data = await ytScraper.ytmp3(ytUrl, 128);
  if (!data.status || !data.download?.url) throw new Error(data.message || "فشل استخراج رابط الصوت");

  const meta     = data.metadata || {};
  const filePath = path.join(os.tmpdir(), `yt_a_${Date.now()}.mp3`);
  await streamToFile(data.download.url, filePath);

  return {
    filePath,
    title:    meta.title || "audio",
    duration: meta.seconds || 0,
    uploader: meta.author?.name || meta.channel || "",
  };
}

async function downloadVideo(ytUrl) {
  const ytScraper = await getYtScraper();
  const data = await ytScraper.ytmp4(ytUrl, 360);
  if (!data.status || !data.download?.url) throw new Error(data.message || "فشل استخراج رابط الفيديو");

  const meta     = data.metadata || {};
  const filePath = path.join(os.tmpdir(), `yt_v_${Date.now()}.mp4`);
  await streamToFile(data.download.url, filePath);

  return {
    filePath,
    title:    meta.title || "video",
    duration: meta.seconds || 0,
    uploader: meta.author?.name || meta.channel || "",
  };
}

export { searchVideos, downloadAudio, downloadVideo, fmtDur, streamToFile  };
