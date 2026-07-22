// cmds/song.js
"use strict";

import fs from "fs";
import os from "os";
import path from "path";
import { report } from "../utils/errorReporter";
import { getHfBase, getInternalToken } from "../utils/hfClient";
import http from "../utils/fetchHttp";

// ملاحظة: هذا الأمر لم يعد يعرف أي شيء عن SoundCloud API نفسه (بحث،
// resolve، transcodings، روابط تنزيل/بث...) — كل ذلك انتقل بالكامل إلى
// hf-space (plugins/soundcloud في Go، عبر POST /soundcloud/song). الملف هنا
// جسر فقط: يرسل نص البحث، يستقبل ملف mp3 جاهزاً (مع الميتاداتا والغلاف
// موسومين بالفعل)، ويرسله للمستخدم.

async function fetchSong(query) {
  const { data } = await http.post(
    `${getHfBase()}/soundcloud/song`,
    { query },
    { timeout: 120000, headers: { "Content-Type": "application/json", "X-Internal-Token": getInternalToken() } }
  );
  if (!data.audio_base64) throw new Error(data.error || "استجابة فارغة");
  return data;
}

export default {
  config: {
    name: "song",
    aliases: ["اغنية"],
    role: 0,
    countDown: 5,
    category: "وسائط وتحميل",
    description: "يبحث عن أغنية باسمها على SoundCloud ويرسل أول نتيجة كملف صوتي",
    hidden: false,
    usage: ["{pn}اغنية <اسم الأغنية> — يبحث عن الأغنية ويرسل أول نتيجة مطابقة كملف صوتي"],
  },

  onStart: async ({ event, args, message }) => {
    const query = (args || []).join(" ").trim();
    if (!query) {
      await message.reply("❌ اكتب اسم الأغنية بعد الأمر، مثال: song Alan Walker Faded");
      return;
    }

    let tempDir;
    try {
      const { audio_base64, title, artist } = await fetchSong(query);
      const buffer = Buffer.from(audio_base64, "base64");

      // مجلد مؤقت فريد لكل طلب — يمنع تضارب الملفات بين استخدامين متزامنين
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "song-"));
      const safeTitle = (title || "song").replace(/[\\/:*?"<>|]/g, "");
      const filePath = path.join(tempDir, `${safeTitle}.mp3`);
      fs.writeFileSync(filePath, buffer);

      await message.reply({
        body: `🎵 ${title || query}\n👤 ${artist || "غير معروف"}`,
        attachment: fs.createReadStream(filePath),
      });
    } catch (err) {
      report("command:song", err);
      const notFound = err?.response?.status === 404;
      await message.reply(notFound ? "❌ لم أجد أي نتيجة مطابقة لهذه الأغنية." : "❌ حدث خطأ أثناء البحث أو التحميل، حاول مجدداً لاحقاً.");
    } finally {
      if (tempDir) {
        fs.rm(tempDir, { recursive: true, force: true }, () => {});
      }
    }
  },
};
