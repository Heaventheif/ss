

import http from '../utils/fetchHttp';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';

const BRIDGE_URL = (process.env.HF_SPACE_URL || '').replace(/\/+$/, '');
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || '';
const SOURCE = '3asq';

const BATCH_SIZE = 15;         
const BATCH_DELAY_MS = 1500;   
const DOWNLOAD_CONCURRENCY = 6;
const POLL_INTERVAL_MS = 2000;
const POLL_TIMEOUT_MS = 120 * 1000; 

const bridgeHeaders = INTERNAL_TOKEN ? { 'X-Internal-Token': INTERNAL_TOKEN } : {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Start a manga-download job on the backend for a manga/chapter.
async function createJob(manga, chapter) {
  const { data } = await http.post(
    `${BRIDGE_URL}/manga-bridge/jobs`,
    { source: SOURCE, manga, chapter },
    { headers: bridgeHeaders, timeout: 15000 }
  );
  return data.job_id;
}

// Poll a manga-download job until it finishes or fails.
async function pollJob(jobId) {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const { data } = await http.get(`${BRIDGE_URL}/manga-bridge/jobs/${jobId}`, {
      headers: bridgeHeaders,
      timeout: 15000,
    });
    if (data.status === 'done' || data.status === 'error') return data;
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error('انتهت مهلة انتظار الكشط — الحاوية الخارجية لم تستجب في الوقت المناسب (تأكد إنها شغالة وبتعمل poll على الجسر).');
}

// Download one page image produced by a finished job.
async function downloadJobImage(jobId, idx) {
  const res = await http.get(`${BRIDGE_URL}/manga-bridge/jobs/${jobId}/image/${idx}`, {
    responseType: 'arraybuffer',
    headers: bridgeHeaders,
    timeout: 25000,
  });
  const filePath = path.join(os.tmpdir(), `manga2_${jobId}_${idx}.jpg`);
  await fs.writeFile(filePath, res.data);
  return filePath;
}

// Download all page images from a job with a concurrency limit.
async function downloadAllWithLimit(jobId, count, limit = DOWNLOAD_CONCURRENCY) {
  const results = new Array(count).fill(null);
  let nextIndex = 0;

    // Worker: keep pulling the next page index until the queue is empty.
  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= count) return;
      try {
        results[i] = await downloadJobImage(jobId, i);
      } catch (e) {
        console.error('[manga2] فشل تحميل صورة من الجسر:', i, e.message);
        results[i] = null;
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, count) }, worker);
  await Promise.all(workers);
  return results;
}

export default {
  config: {
    name: "manga2",
    aliases: ["مانجا2"],
    role: 0,
    countDown: 15,
    category: "مانجا وروايات",
    description: "كشط وإرسال صور فصل من مانجا العاشق (عبر جسر خارجي يتخطى حظر Cloudflare)",
    usage: ["{pn}مانجا2 <اسم المانجا> <رقم الفصل> — مثال: {pn}مانجا2 one piece 234"],
  },

  // Command entry point: run a manga-download job and send the resulting pages.
  onStart: async ({ api, event, args }) => {
    const { threadID, messageID } = event;

    if (args.length < 2) {
      return global.safeSend(
        api,
        `⚠️ الاستخدام:\n.manga2 <اسم المانجا> <رقم الفصل>\n\n📌 مثال: .manga2 one piece 234\n📌 مثال: .manga2 kingdom 1`,
        threadID, null, messageID
      );
    }

    if (!BRIDGE_URL) {
      return global.safeSend(
        api,
        `❌ لم يتم ضبط MANGA_BRIDGE_URL في متغيرات البيئة.`,
        threadID, null, messageID
      );
    }

    const chapterNumber = args[args.length - 1];
    const rawMangaName = args.slice(0, -1).join(' ').trim();

    try {
      
      const jobId = await createJob(rawMangaName, chapterNumber);

      
      const result = await pollJob(jobId);

      if (result.status === 'error') {
        return global.safeSend(
          api,
          `❌ فشل الكشط من الحاوية الخارجية:\n${result.error || 'خطأ غير معروف'}`,
          threadID, null, messageID
        );
      }

      const count = result.image_count || 0;
      if (count === 0) {
        return global.safeSend(api, `❌ لم يتم العثور على أي صور في هذا الفصل.`, threadID, null, messageID);
      }

      
      const downloaded = await downloadAllWithLimit(jobId, count);
      const validFiles = downloaded.filter(Boolean);

      if (!validFiles.length) {
        return global.safeSend(api, `❌ فشل تحميل صور هذا الفصل من الجسر. حاول مرة أخرى.`, threadID, null, messageID);
      }

      
      let allSent = true;
      for (let i = 0; i < validFiles.length; i += BATCH_SIZE) {
        const batch = validFiles.slice(i, i + BATCH_SIZE);
        const isFirst = i === 0;
        try {
          
          
          await new Promise((resolve, reject) => {
            global.safeSend(
              api,
              { attachment: batch.map((f) => fs.createReadStream(f)) },
              threadID,
              (err) => (err ? reject(err) : resolve()),
              isFirst ? messageID : null
            );
          });
        } catch (e) {
          allSent = false;
          console.error('[manga2] فشل إرسال دفعة صور:', e.message);
        }
        if (i + BATCH_SIZE < validFiles.length) {
          await sleep(BATCH_DELAY_MS);
        }
      }

      await Promise.allSettled(validFiles.map((f) => fs.remove(f)));

      
      if (!allSent || validFiles.length !== count) {
        await global.safeSend(
          api,
          `⚠️ تم إرسال جزء من الفصل فقط (${validFiles.length}/${count}).`,
          threadID, null, null
        );
      }

    } catch (error) {
      console.error('[manga2] خطأ:', error.message);
      let errorMsg = `❌ حدث خطأ:\n`;
      if (error.code === 'ECONNABORTED') errorMsg += `انتهت المهلة. حاول مرة أخرى.`;
      else if (error.response) errorMsg += `الجسر رد بـ ${error.response.status}`;
      else errorMsg += error.message;
      await global.safeSend(api, errorMsg, threadID, null, messageID);
    }
  }
};
