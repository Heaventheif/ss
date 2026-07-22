"use strict";

/**
 * أداة قياس زمني بسيطة — تسجّل مدة كل مرحلة رئيسية (استقبال، تنفيذ
 * الأمر، استدعاء API خارجي، إرسال) وتطبعها في console (Render Logs)
 * برقم دقيق بالمللي ثانية، بدل التخمين حول أين يذهب الوقت فعلياً.
 *
 * الاستخدام البسيط (قياس أمر كامل):
 *   import t from "../utils/timing";.start(`command:${commandName}`);
 *   ... تنفيذ الأمر ...
 *   t.end(); // يطبع: [TIMING] command:yt: 842ms
 *
 * الاستخدام المفصّل (عدة مراحل داخل نفس الأمر):
 *   import t from "../utils/timing";.start("yt:download");
 *   t.mark("search");        // من البداية حتى هنا
 *   const r = await search();
 *   t.mark("download");      // من آخر mark حتى هنا
 *   await download(r);
 *   t.end();                 // يطبع كل المراحل + الإجمالي
 */

function start(label) {
  const t0 = Date.now();
  let lastMark = t0;
  const marks = [];

  return {
    /** يسجّل نقطة زمنية باسم معيّن (المدة منذ آخر mark أو البداية) */
    mark(name) {
      const now = Date.now();
      marks.push({ name, ms: now - lastMark });
      lastMark = now;
    },
    /** يطبع الملخص الكامل: كل المراحل (إن وُجدت) + الإجمالي */
    end(extra = "") {
      const total = Date.now() - t0;
      if (marks.length) {
        const breakdown = marks.map(m => `${m.name}=${m.ms}ms`).join(", ");
        console.log(`[TIMING] ${label}: ${total}ms (${breakdown})${extra ? " " + extra : ""}`);
      } else {
        console.log(`[TIMING] ${label}: ${total}ms${extra ? " " + extra : ""}`);
      }
      return total;
    },
  };
}

export { start  };
export default { start };
