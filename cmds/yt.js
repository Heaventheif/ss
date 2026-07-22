
"use strict";

import fs from "fs-extra";
import { searchVideos, downloadAudio, downloadVideo  } from "../utils/ytEngine";

const EMOJI_PAIRS = [
  ["👍", "❤️"], ["😆", "😮"], ["😢", "😡"],
  ["🥰", "👏"], ["🤩", "😘"], ["😍", "😭"],
  ["🤔", "😅"], ["😁", "🥹"], ["🥸", "😎"], ["🙂", "😇"],
];

async function ytSearch(query, limit = 10) {
  const results = await searchVideos(query, limit);
  if (!results?.length) throw new Error("لا توجد نتائج");
  return results;
}

// ← استدعاء مباشر بدل HTTP على النفس (localhost). كان الكود القديم
// يمرّ عبر Express + axios لاستدعاء دالة موجودة أصلاً بنفس عملية
// Node (تسلسل/فك تسلسل + تأخير شبكة بلا أي فائدة فعلية). الآن الملف
// يُكتب على القرص مرة واحدة فقط عبر utils/ytEngine مباشرة.
async function downloadFromHF(ytUrl, wantMp4) {
  const dl = wantMp4 ? await downloadVideo(ytUrl) : await downloadAudio(ytUrl);
  return {
    stream:   fs.createReadStream(dl.filePath),
    filePath: dl.filePath,
    title:    dl.title    || "media",
    duration: dl.duration || 0,
    uploader: dl.uploader || "",
  };
}

async function cleanTemp(p) {
  try { if (p && await fs.pathExists(p)) await fs.remove(p); } catch (_) {}
}

// بدون رسالة "جارٍ التحميل" — يحذف القائمة بعد الإرسال مباشرة
async function downloadAndSend(api, threadID, messageID, ytUrl, wantMp4, listMsgId = null) {
  let filePath = null;
  try {
    const dl  = await downloadFromHF(ytUrl, wantMp4);
    filePath   = dl.filePath;

    const fmtDur = (sec) => {
      const s = parseInt(sec) || 0;
      if (!s) return "";
      const m = Math.floor(s / 60), ss = s % 60;
      return ` ⏱ ${m}:${String(ss).padStart(2, "0")}`;
    };

    const body =
      `${wantMp4 ? "🎬" : "🎵"} ${dl.title}` +
      `${fmtDur(dl.duration)}` +
      `${dl.uploader ? `\n📺 ${dl.uploader}` : ""}` +
      `\n🎚 ${wantMp4 ? "360p" : "128kbps"}`;

    await new Promise((res, rej) =>
      global.safeSend(api, 
        { body, attachment: dl.stream },
        threadID,
        err => err ? rej(err) : res(),
        messageID
      )
    );

    // حذف رسالة القائمة بعد نجاح الإرسال
    if (listMsgId) { try { await api.unsendMessage(listMsgId, threadID); } catch (_) {} }

  } catch (err) {
    let msg = err.message || "خطأ غير معروف";
    if (err.response?.data) {
      try {
        const t = Buffer.isBuffer(err.response.data)
          ? err.response.data.toString()
          : JSON.stringify(err.response.data);
        msg = JSON.parse(t).error || msg;
      } catch (_) {}
    }
    global.safeSend(api, `❌ ${msg.substring(0, 160)}`, threadID, null, messageID);
  } finally {
    await cleanTemp(filePath);
  }
}

function buildListText(results, wantMp4) {
  let text = `${wantMp4 ? "🎬" : "🎵"} نتائج البحث:\n${"─".repeat(22)}\n`;
  results.forEach((v, i) => {
    const [mp3E, mp4E] = EMOJI_PAIRS[i];
    text +=
      `${i + 1}. ${v.title}\n` +
      `   ⏱ ${v.duration || "--"}  📺 ${v.uploader || ""}\n` +
      `   ${mp3E} mp3  |  ${mp4E} mp4\n` +
      `${"─".repeat(22)}\n`;
  });
  text += `تفاعل بالإيموجي لاختيار الأغنية\n⏳ تنتهي بعد دقيقتين`;
  return text;
}

export default {
  config: {
    name:        "yt",
    aliases:     ["يوتيوب1"],
    version:     "6.1",
    role:        0,
    countDown:   15,
    category:    "download",
    description: "تحميل من يوتيوب — أضف s لعرض قائمة، وmp4 للفيديو",
    usage: [
      "{pn}يوتيوب1 <اسم> — تحميل أول نتيجة مباشرة (MP3)",
      "{pn}يوتيوب1 s <اسم> — عرض قائمة نتائج",
      "{pn}يوتيوب1 mp4 <اسم> — تحميل أول نتيجة مباشرة (MP4)",
      "{pn}يوتيوب1 s mp4 <اسم> — عرض قائمة نتائج (MP4)",
      "{pn}يوتيوب1 <رابط> — تحميل مباشر MP3",
      "{pn}يوتيوب1 mp4 <رابط> — تحميل مباشر MP4",
    ],
  },

  onStart: async ({ api, message, args, event }) => {
    const { threadID, messageID } = event;

    if (!args[0]) return message.reply(
      "📥 يوتيوب دونلودر\n\n" +
      "🎵 yt <اسم>          — تحميل مباشر (MP3)\n" +
      "🎬 yt mp4 <اسم>      — تحميل مباشر (MP4)\n" +
      "📋 yt s <اسم>        — قائمة نتائج (MP3)\n" +
      "📋 yt s mp4 <اسم>    — قائمة نتائج (MP4)\n" +
      "🔗 yt <رابط>         — تحميل مباشر\n\n" +
      "🎚 الجودة: صوت 128kbps | فيديو 360p"
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
        const results = await ytSearch(query, 1);
        return await downloadAndSend(api, threadID, messageID, results[0].url, wantMp4);
      } catch (e) {
        return global.safeSend(api, `❌ ${e.message}`, threadID, null, messageID);
      }
    }

    try {
      const results = await ytSearch(query, 10);
      const list    = results.slice(0, 10);

      const sent = await new Promise((res, rej) =>
        global.safeSend(api, buildListText(list, wantMp4), threadID,
          (err, info) => err ? rej(err) : res(info), messageID)
      );

      if (sent?.messageID) {
        if (global.client?.reactionListener) {
          global.client.reactionListener[sent.messageID] = {
            author: event.senderID,
            callback: async ({ api, event: re }) => {
              const reaction = re.reaction;
              const idx = EMOJI_PAIRS.findIndex(([m3, m4]) => reaction === m3 || reaction === m4);
              if (idx < 0 || idx >= list.length) return;

              const wantMp4R = reaction === EMOJI_PAIRS[idx][1];
              const chosen   = list[idx];

              delete global.client.reactionListener[sent.messageID];
              if (global.Kagenou?.replies) delete global.Kagenou.replies[sent.messageID];

              await downloadAndSend(api, threadID, messageID, chosen.url, wantMp4R, sent.messageID);
            },
          };
          setTimeout(() => {
            delete global.client?.reactionListener?.[sent.messageID];
            if (global.Kagenou?.replies) delete global.Kagenou.replies[sent.messageID];
          }, 120000);
        }
      }
    } catch (e) {
      global.safeSend(api, `❌ ${e.message?.substring(0, 150) || "خطأ في البحث"}`, threadID, null, messageID);
    }
  },
};