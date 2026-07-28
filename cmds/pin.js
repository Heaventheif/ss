"use strict";

import http from "../utils/fetchHttp";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { getHfBaseOrNull, getInternalToken  } from "../utils/hfClient";
import errorReporter from "../utils/errorReporter";

const DOWNLOAD_CONCURRENCY = 6; 

// Download all Pinterest images with a concurrency limit.
async function downloadAllWithLimit(images, tmpDir, limit = DOWNLOAD_CONCURRENCY) {
  const downloaded = [];
  let idx = 0;

    // Worker: keep pulling the next image index until the queue is empty.
  async function worker() {
    while (idx < images.length) {
      const i = idx++;
      const img = images[i];
      const imgUrl = img.url;
      if (!imgUrl) continue;

      try {
        const res = await http.get(imgUrl, {
          responseType: "arraybuffer",
          timeout: 20000,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
              "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Referer": "https://www.pinterest.com/",
            "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
          },
        });

        const imgBuffer = Buffer.from(res.data);
        if (!imgBuffer || imgBuffer.length < 1000) continue;

        const ext = imgUrl.includes(".png") ? "png" : imgUrl.includes(".webp") ? "webp" : "jpg";
        const fileName = `pin_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
        const tmpFile = path.join(tmpDir, fileName);
        await fs.writeFile(tmpFile, imgBuffer); 

        downloaded.push(tmpFile);
      } catch (imgErr) {
        
        console.warn("[pin] فشل تحميل صورة:", imgErr.message);
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, images.length) }, worker));
  return downloaded;
}

export default {
  config: {
    name: "pin",
    aliases: ["صور 2"],
    role: 0,
    countDown: 10,
    category: "وسائط وتحميل",
    description: "بحث عن صور عالية الدقة من Pinterest",
    usage: [
      '{pn}بينتريست1 <كلمة البحث> <العدد> — مثال: بينتريست1 cars 12',
      '{pn}بينتريست1 "<كلمة البحث>" <العدد> — مثال: بينتريست1 "sunset" 10',
      '{pn}بينتريست1 <كلمة البحث> — بدون تحديد عدد (افتراضي 5 صور)، مثال: بينتريست1 minimalist bedroom',
    ],
  },

  // Command entry point: search Pinterest and send matching images.
  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    
    const raw = args.join(" ").trim();
    if (!raw) {
      return api.sendMessage('❌ الصيغة: pin اسم الصورة العدد\nمثال: pin cars 12', threadID, messageID);
    }

    
    const quotedMatch = raw.match(/["“]([^"”]+)["”]\s*(.*)$/);

    let query = "";
    let rest = "";

    if (quotedMatch) {
      query = quotedMatch[1].trim();
      rest = quotedMatch[2].trim();
    } else {
      const parts = raw.split(/\s+/);
      const last = parts[parts.length - 1];
      if (parts.length > 1 && /^-?\d+$/.test(last)) {
        rest = last;
        query = parts.slice(0, -1).join(" ");
      } else {
        query = raw;
        rest = "";
      }
    }

    const numMatch = rest.match(/-?(\d+)/);
    const count = numMatch ? Math.min(Math.max(parseInt(numMatch[1]), 1), 20) : 5;

    query = query.trim();

    if (!query) {
      return api.sendMessage('❌ أدخل اسم الصورة للبحث.\nمثال: pin cars 12', threadID, messageID);
    }

    const HF_SPACE_URL = getHfBaseOrNull();
    if (!HF_SPACE_URL) {
      errorReporter.report("pin:config", new Error("HF_SPACE_URL غير مضبوط في متغيرات البيئة"));
      return api.sendMessage("❌ الخدمة غير مهيأة حالياً، تم إبلاغ المطوّر.", threadID, messageID);
    }

    const tmpFiles = []; 
    try {
      const { data } = await http.post(
        `${HF_SPACE_URL}/pinterest`,
        { query, limit: count, quality: "original", fallback_ferdev: true },
        { timeout: 30000, headers: { "Content-Type": "application/json", "X-Internal-Token": getInternalToken() } }
      );

      if (!data.success || !data.images || data.images.length === 0) {
        return api.sendMessage(
          `😕 لم أجد صوراً لكلمة "${query}".\nالسبب: ${data.error || "لا نتائج"}\n\n💡 جرّب كلمة مختلفة.`,
          threadID, messageID
        );
      }

      const images = data.images;
      const tmpDir = os.tmpdir();
      const BATCH_SIZE = 15; 

      
      const downloaded = await downloadAllWithLimit(images, tmpDir);
      tmpFiles.push(...downloaded);

      if (downloaded.length === 0) {
        const urls = images.map((img, i) => `${i + 1}. ${img.url}`).join("\n");
        return api.sendMessage(`⚠️ تعذّر تحميل أي صورة. إليك الروابط:\n\n${urls}`, threadID, messageID);
      }

      
      for (let i = 0; i < downloaded.length; i += BATCH_SIZE) {
        const batch = downloaded.slice(i, i + BATCH_SIZE);
        try {
          const sendResult = await api.sendMessage(
            { body: "", attachment: batch.map(f => fs.createReadStream(f)) },
            threadID
          );

          console.log(`[pin] نتيجة الإرسال:`, JSON.stringify(sendResult));
          if (!sendResult?.messageID) {
            console.warn("[pin] ⚠️ لم يُرجع فيسبوك messageID فعلياً — قد تكون الرسالة رُفضت بصمت رغم عدم وجود خطأ ظاهر.");
          }
        } catch (batchErr) {
          console.warn("[pin] فشل إرسال دفعة:", batchErr.message);
        }
        if (i + BATCH_SIZE < downloaded.length) {
          await new Promise(r => setTimeout(r, 1200));
        }
      }

    } catch (error) {
      console.error("[pin] خطأ:", error.message);
      errorReporter.report("pin:onStart", error);
      return api.sendMessage("❌ حدث خطأ أثناء البحث — تم إبلاغ المطوّر.", threadID, messageID);
    } finally {
      
      
      
      await Promise.allSettled(tmpFiles.map(f => fs.remove(f)));
    }
  }
};
