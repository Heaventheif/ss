
"use strict";

import http from "../utils/fetchHttp";
import fs from "fs-extra";
import os from "os";
import path from "path";

const BASE = "https://yt-dlp-stream.onrender.com/api";

const EMOJI_PAIRS = [
  ["👍", "❤️"], ["😆", "😮"], ["😢", "😡"],
  ["🥰", "👏"], ["🤩", "😘"], ["😍", "😭"],
  ["🤔", "😅"], ["😁", "🥹"], ["🥸", "😎"], ["🙂", "😇"],
];

// ✅ تحميل عبر stream حقيقي مباشرة إلى القرص (بدل تحميل الملف كاملاً
// في الذاكرة عبر arraybuffer ثم كتابته — هذا يقلل استهلاك RAM بشكل
// كبير خصوصاً مع ملفات الفيديو على سيرفر بموارد محدودة).
async function getStream(url) {
  const ext      = url.match(/\.(mp4|mp3|webm|m4a)/i)?.[1] || "mp3";
  const filePath = path.join(os.tmpdir(), `yt2_${Date.now()}.${ext}`);

  const response = await http.get(url, {
    responseType: "stream",
    timeout:      120000,
  });

  const writer = fs.createWriteStream(filePath);
  response.data.pipe(writer);
  await new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  const stat = await fs.stat(filePath);
  if (stat.size === 0)      { await fs.remove(filePath).catch(() => {}); throw new Error("الملف فارغ."); }
  if (stat.size > 26214400) { await fs.remove(filePath).catch(() => {}); throw new Error("الملف أكبر من 25MB."); }

  return { stream: fs.createReadStream(filePath), filePath };
}

async function cleanTemp(filePath) {
  try { if (await fs.pathExists(filePath)) await fs.remove(filePath); } catch (_) {}
}

async function v2(query) {
  const url = `${BASE}/v2/q?=${encodeURIComponent(query)}`;
  const res = await http.get(url, { timeout: 30000 });
  const data = res.data;
  if (Array.isArray(data)) return data[0] || {};
  if (!data || typeof data !== "object") return {};
  return data;
}

async function v3(query, limit = 7) {
  const url = `${BASE}/v3/q?=${encodeURIComponent(query)}&?=${limit}`;
  const res = await http.get(url, { timeout: 25000 });
  const data = res.data;
  if (Array.isArray(data))               return { results: data };
  if (!data || typeof data !== "object") return { results: [] };
  if (Array.isArray(data.results))       return data;
  if (Array.isArray(data.data))          return { results: data.data };
  return { results: [] };
}

function parse(d) {
  if (!d || typeof d !== "object") return { title: "بدون عنوان", author: "", mp4Url: null, mp3Url: null };
  const m = (d.media && typeof d.media === "object" && !Array.isArray(d.media)) ? d.media : {};
  function getUrl(f) {
    if (!f) return null;
    if (typeof f === "string") return f;
    if (typeof f === "object" && typeof f.url === "string") return f.url;
    return null;
  }
  return {
    title:  d.title  || "بدون عنوان",
    author: d.author || d.channel || "",
    mp4Url: getUrl(m.mp4) || getUrl(d.mp4) || null,
    mp3Url: getUrl(m.mp3) || getUrl(d.mp3) || null,
  };
}

// بدون رسالة "جارٍ التحميل" — يحذف القائمة بعد الإرسال
async function downloadAndSend(api, threadID, messageID, query, wantMp4, listMsgId = null) {
  const p   = parse(await v2(query));
  const url = wantMp4 ? p.mp4Url : p.mp3Url;

  if (!url)
    return global.safeSend(api, `❌ الرابط غير متاح.\n💡 جرّب النوع الآخر.`, threadID, null, messageID);

  let filePath = null;
  try {
    const { stream, filePath: fp } = await getStream(url);
    filePath = fp;

    await new Promise((resolve, reject) =>
      global.safeSend(api, 
        {
          body:       `${wantMp4 ? "🎬" : "🎵"} ${p.title}\n📺 ${p.author}`.trim(),
          attachment: stream,
        },
        threadID,
        err => err ? reject(err) : resolve(),
        messageID
      )
    );

    if (listMsgId) { try { await api.unsendMessage(listMsgId, threadID); } catch (_) {} }

  } catch (e) {
    global.safeSend(api, `❌ ${e.response?.data?.error || e.message}`, threadID, null, messageID);
  } finally {
    if (filePath) await cleanTemp(filePath);
  }
}

function buildListText(results, wantMp4) {
  let text = `${wantMp4 ? "🎬" : "🎵"} نتائج البحث:\n${"─".repeat(22)}\n`;
  results.forEach((v, i) => {
    const [mp3E, mp4E] = EMOJI_PAIRS[i];
    text +=
      `${i + 1}. ${v.title}\n` +
      `   ⏱ ${v.duration || "--"}\n` +
      `   ${mp3E} mp3  |  ${mp4E} mp4\n` +
      `${"─".repeat(22)}\n`;
  });
  text += `تفاعل بالإيموجي لاختيار الأغنية\n⏳ تنتهي بعد دقيقتين.`;
  return text;
}

export default {
  config: {
    name:        "yt2",
    aliases:     ["يوتيوب2"],
    version:     "5.1",
    role:        0,
    countDown:   15,
    category:    "download",
    description: "تحميل من يوتيوب عبر yt-dlp-stream — أضف s لعرض قائمة، وmp4 للفيديو",
    usage: [
      "{pn}يوتيوب2 <اسم> — تحميل أول نتيجة مباشرة (MP3)",
      "{pn}يوتيوب2 s <اسم> — عرض قائمة نتائج",
      "{pn}يوتيوب2 mp4 <اسم> — تحميل أول نتيجة مباشرة (MP4)",
      "{pn}يوتيوب2 s mp4 <اسم> — عرض قائمة نتائج (MP4)",
      "{pn}يوتيوب2 <رابط> — تحميل مباشر MP3",
      "{pn}يوتيوب2 mp4 <رابط> — تحميل مباشر MP4",
    ],
  },

  onStart: async ({ api, message, args, event }) => {
    const { threadID, messageID } = event;

    if (!args[0]) return message.reply(
      "📥 يوتيوب دونلودر\n\n" +
      "🎵 yt2 <اسم>         — تحميل مباشر (MP3)\n" +
      "🎬 yt2 mp4 <اسم>     — تحميل مباشر (MP4)\n" +
      "📋 yt2 s <اسم>       — قائمة نتائج (MP3)\n" +
      "📋 yt2 s mp4 <اسم>   — قائمة نتائج (MP4)\n" +
      "🔗 yt2 <رابط>        — تحميل مباشر"
    );

    let remaining = [...args];
    const showList = remaining[0]?.toLowerCase() === "s";
    if (showList) remaining = remaining.slice(1);

    const wantMp4 = remaining[0]?.toLowerCase() === "mp4";
    if (wantMp4) remaining = remaining.slice(1);

    const query = remaining.join(" ").trim();
    if (!query) return message.reply("❌ أرسل اسم الأغنية أو الرابط.");

    const isUrl = /^https?:\/\//i.test(query);
    if (isUrl) return await downloadAndSend(api, threadID, messageID, query, wantMp4);

    if (!showList) {
      try {
        const res = await v3(query, 1);
        if (!res.results?.length)
          return global.safeSend(api, "❌ لم تُعثر على نتائج.", threadID, null, messageID);
        const first = res.results[0];
        return await downloadAndSend(api, threadID, messageID, first.url || first.short_url, wantMp4);
      } catch (e) {
        return global.safeSend(api, `❌ ${e.message}`, threadID, null, messageID);
      }
    }

    try {
      const res = await v3(query, 7);
      if (!res.results?.length)
        return global.safeSend(api, "❌ لم تُعثر على نتائج.", threadID, null, messageID);

      const list = res.results.slice(0, 7);
      const sent = await new Promise((resolve, reject) =>
        global.safeSend(api, buildListText(list, wantMp4), threadID,
          (err, info) => err ? reject(err) : resolve(info), messageID)
      );

      if (sent?.messageID && global.client?.reactionListener) {
        global.client.reactionListener[sent.messageID] = {
          author: event.senderID,
          callback: async ({ api, event: re }) => {
            const reaction = re.reaction;
            const idx = EMOJI_PAIRS.findIndex(([mp3, mp4]) => reaction === mp3 || reaction === mp4);
            if (idx === -1 || idx >= list.length) return;

            const wantMp4R = reaction === EMOJI_PAIRS[idx][1];
            const chosen   = list[idx];

            delete global.client.reactionListener[sent.messageID];
            if (global.Kagenou?.replies) delete global.Kagenou.replies[sent.messageID];

            await downloadAndSend(api, threadID, messageID, chosen.url || chosen.short_url, wantMp4R, sent.messageID);
          },
        };
        setTimeout(() => {
          delete global.client?.reactionListener?.[sent.messageID];
        }, 120000);
      }
    } catch (e) {
      global.safeSend(api, `❌ ${e.response?.data?.error || e.message}`, threadID, null, messageID);
    }
  },
};