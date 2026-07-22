// fetch الأصلي يدير keep-alive/pooling تلقائياً، فلا حاجة لـ httpsAgent يدوياً
import http from '../utils/fetchHttp';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { getHfBaseOrNull, getInternalToken  } from '../utils/hfClient';
import errorReporter from '../utils/errorReporter';

export default {
  config: {
    name: "sub",
    aliases: ["كابشن"],
    role: 0, // متاح لجميع أعضاء المجموعة
    countDown: 10, // فترة تبريد لمنع إسبام المعالجة الثقيلة
    category: "وسائط",
    description: "إضافة ترجمة (ثابتة أو زمنية) على فيديو عبر الرد عليه، مع تحكم بموضع النص عمودياً",
    usage: [
      "رد على فيديو + {pn}ترجمة2 <النص> — ترجمة ثابتة طوال الفيديو (الموضع الافتراضي 4)",
      "رد على فيديو + {pn}ترجمة2 <رقم الموضع 1-5> <النص> — ترجمة ثابتة بموضع محدد",
      "رد على فيديو + {pn}ترجمة2 <رقم الموضع> 00:01 - 00:03 <النص> — سطر ترجمة زمني بموضع محدد",
      "يمكن تكرار السطر الأخير عدة مرات (سطر لكل ترجمة)، كل سطر بموضعه وتوقيته الخاص",
    ],
  },

  // ملاحظة: البوت لا يستخدم Prefix حالياً ("Prefix": [""])، فأول كلمة في body هي اسم
  // الأمر نفسه مباشرة. نُبقي args في التوقيع تماشياً مع القالب الرسمي للأوامر، لكن لا
  // نستخدمها هنا لأن محرك التوجيه يبني args عبر تقسيم body بالمسافات (بما فيها الأسطر)،
  // وهو ما يفقد الـ \n اللازمة لتنسيق الترجمة الزمنية. نعيد استخراج النص من body الخام بدلاً منه.
  onStart: async ({ api, event, args }) => {
    const { threadID, messageID, type, messageReply, body } = event;

    // 1. التحقق من أن المستخدم قام بالرد على رسالة (Reply) تحتوي على فيديو
    if (type !== "message_reply" || !messageReply || !messageReply.attachments || messageReply.attachments.length === 0) {
      return api.sendMessage("❌ يرجى استخدام الأمر عبر الرد (Reply) على مقطع فيديو!", threadID, messageID);
    }

    const attachment = messageReply.attachments[0];
    if (attachment.type !== "video") {
      return api.sendMessage("❌ الرسالة التي رددت عليها لا تحتوي على فيديو مدعوم!", threadID, messageID);
    }

    // 2. استخراج نص الترجمة من body الخام مباشرة (وليس args) للحفاظ على الأسطر (\n)
    //    الضرورية للترجمة الزمنية — راجع الملاحظة أعلى onStart.
    const rawBody = body || "";
    const bodyMatch = rawBody.match(/^\S+\s([\s\S]*)$/); // كل ما بعد أول كلمة (اسم الأمر)
    const subText = bodyMatch ? bodyMatch[1].trim() : "";

    if (!subText) {
      return api.sendMessage(
        "💡 يرجى كتابة نص الترجمة بعد الأمر.\n\n" +
        "🔹 ترجمة ثابتة (موضع افتراضي 4):\nsub النص هنا\n\n" +
        "🔹 ترجمة ثابتة بموضع محدد (1 إلى 5):\nsub 3 النص هنا\n\n" +
        "🔹 ترجمة زمنية بموضع محدد:\nsub\n2 00:01 - 00:03 أهلاً بكم\n5 00:04 - 00:07 في مجموعتنا\n\n" +
        "📍 مواضع العمود (Y): 1=أعلى الشاشة، 2، 3=المنتصف، 4 (افتراضي)، 5=أسفل الشاشة",
        threadID, messageID
      );
    }

    // 3. تحليل النص إلى "cues" (مقاطع ترجمة) — كل سطر = مقطع مستقل بموضعه وتوقيته
    let cues;
    try {
      cues = parseSubtitleCues(subText);
    } catch (parseErr) {
      return api.sendMessage(`❌ خطأ في تحليل صيغة الترجمة: ${parseErr.message}`, threadID, messageID);
    }

    if (!cues.length) {
      return api.sendMessage("❌ لم أستطع فهم أي سطر ترجمة صالح من النص المُدخل.", threadID, messageID);
    }

    // --- رسالة حالة واحدة تُعدَّل لاحقاً بدل تركها معلّقة في الشات ---
    let statusMsgId = null;
    try {
      const sent = await new Promise((resolve, reject) =>
        api.sendMessage(
          "⏳ يتم تحميل الفيديو ومعالجته عبر Hugging Face Space، يرجى الانتظار...",
          threadID,
          (err, info) => (err ? reject(err) : resolve(info)),
          messageID
        )
      );
      statusMsgId = sent?.messageID;
    } catch (_) {}

    const updateStatus = async (text) => {
      try {
        if (statusMsgId) await api.editMessage(text, statusMsgId, threadID);
        else await api.sendMessage(text, threadID, messageID);
      } catch (_) {}
    };

    const HF_SPACE_URL = getHfBaseOrNull();
    const INTERNAL_TOKEN = getInternalToken();

    if (!HF_SPACE_URL) {
      return updateStatus("❌ خطأ في الإعدادات: لم يتم ضبط رابط HF_SPACE_URL في متغيرات البيئة الخاصة بالبوت.");
    }

    const uniqueId = Date.now();
    const tempFilePath = path.join(os.tmpdir(), `subtitled_${uniqueId}.mp4`);

    try {
      // 4. إنشاء عملية الترجمة على الـ Space — نرسل الـ cues المُحلَّلة بدل نص خام
      const createResponse = await http.post(`${HF_SPACE_URL}/subtitler/create`, {
        video_url: attachment.url,
        cues,
      }, {
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Token": INTERNAL_TOKEN
        }
      });

      const { job_id } = createResponse.data;

      // 5. الـ Polling - الـ endpoint هذا يرجع JSON فقط دائماً الآن، لا يوجد أي تضارب مع الفيديو
      let jobStatus = null;
      let attempts = 0;
      const maxAttempts = 30; // الحد الأقصى للانتظار (~60 ثانية)

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        attempts++;

        const statusResponse = await http.get(`${HF_SPACE_URL}/subtitler/status/${job_id}`, {
          headers: { "X-Internal-Token": INTERNAL_TOKEN },
          responseType: 'json'
        });

        jobStatus = statusResponse.data;

        if (jobStatus.status === "error") {
          throw new Error(jobStatus.reason || "حدث خطأ غير معروف أثناء معالجة الميديا داخل الـ Space.");
        }
        if (jobStatus.status === "done") {
          break;
        }
      }

      if (!jobStatus || jobStatus.status !== "done") {
        throw new Error("تجاوزت عملية المعالجة الوقت المحدد المسموح به (Timeout).");
      }

      // 6. تحميل الفيديو الناتج من الـ endpoint المخصص للتحميل فقط
      const downloadResponse = await http.get(`${HF_SPACE_URL}${jobStatus.download_url}`, {
        headers: { "X-Internal-Token": INTERNAL_TOKEN },
        responseType: 'stream'
      });

      const writer = fs.createWriteStream(tempFilePath);
      downloadResponse.data.pipe(writer);

      await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      // 7. حذف رسالة الحالة (بدل تركها) ثم إرسال الفيديو المترجم عبر الطابور الآمن safeSend
      if (statusMsgId) {
        try { await api.unsendMessage(statusMsgId); } catch (_) {}
      }

      await new Promise((resolve, reject) => {
        global.safeSend(
          api,
          {
            body: "✅ تم دمج الترجمة على الفيديو بنجاح!",
            attachment: fs.createReadStream(tempFilePath)
          },
          threadID,
          (err) => (err ? reject(err) : resolve()),
          messageID
        );
      });

    } catch (error) {
      console.error("Error in sub command:", error.message);
      errorReporter.report("sub:process", error);
      await updateStatus("❌ فشل معالجة الفيديو — تم إبلاغ المطوّر.");
    } finally {
      if (await fs.exists(tempFilePath)) {
        await fs.remove(tempFilePath);
      }
    }
  }
};

// ═══════════════════════════════════════════════════════════════
// منطق تحليل صيغة الترجمة (Parsing Logic)
// ═══════════════════════════════════════════════════════════════
//
// الصيغة المدعومة لكل سطر (كل عنصر اختياري إلا النص):
//
//   [رقم الموضع 1-5]  [mm:ss - mm:ss]  النص
//
// أمثلة صالحة لنفس السطر:
//   "النص فقط"                          → موضع افتراضي 4، توقيت ثابت (كل الفيديو)
//   "3 النص"                            → موضع 3 (المنتصف)، توقيت ثابت
//   "00:01 - 00:03 النص"                → موضع افتراضي 4، توقيت محدد
//   "2 00:01 - 00:03 النص"              → موضع 2، توقيت محدد
//   "2 00:01 - 00:03 | النص"            → الفاصل "|" اختياري، يبقى مدعوماً للتوافق مع الصيغة القديمة
//
// كل سطر في النص الكامل (مفصول بـ \n) يُعامل كمقطع ترجمة (cue) مستقل.

const DEFAULT_POSITION = 4; // بند 1 من المتطلبات: الافتراضي = 4 عند غياب رقم الموضع
const VALID_POSITIONS = new Set([1, 2, 3, 4, 5]);

// نمط الوقت: mm:ss أو h:mm:ss (نسمح بخانة ساعات اختيارية لمرونة أكبر)
const TIME_RE = /^(\d{1,2}:)?\d{1,2}:\d{2}$/;

/**
 * يحوّل نص "mm:ss" أو "h:mm:ss" إلى عدد ثوانٍ صحيح.
 */
function timeToSeconds(t) {
  const parts = t.split(":").map(Number);
  if (parts.some(Number.isNaN)) throw new Error(`صيغة وقت غير صالحة: "${t}"`);
  let seconds = 0;
  for (const p of parts) seconds = seconds * 60 + p;
  return seconds;
}

/**
 * يحلّل سطراً واحداً من نص الترجمة ويستخرج منه:
 *   - position: رقم من 1 إلى 5 (افتراضي DEFAULT_POSITION إن لم يُذكر)
 *   - startSec / endSec: بالثواني، أو null لكليهما إذا كان السطر ترجمة ثابتة (بند 2)
 *   - text: النص الفعلي المتبقي بعد إزالة الموضع والتوقيت
 */
function parseSubtitleLine(line) {
  let rest = line.trim();
  if (!rest) return null;

  let position = null;
  let startSec = null;
  let endSec = null;

  // --- 1) رقم الموضع (إن وُجد) في بداية السطر ---
  const posMatch = rest.match(/^([1-5])\s+(.+)$/s);
  if (posMatch) {
    const candidate = parseInt(posMatch[1], 10);
    // نتأكد أن الباقي بعد الرقم منطقي (ليس رقماً آخر جزءاً من وقت مثلاً)
    if (VALID_POSITIONS.has(candidate)) {
      position = candidate;
      rest = posMatch[2].trim();
    }
  }

  // --- 2) نطاق زمني (إن وُجد): mm:ss - mm:ss ---
  const timeMatch = rest.match(/^((?:\d{1,2}:)?\d{1,2}:\d{2})\s*-\s*((?:\d{1,2}:)?\d{1,2}:\d{2})\s*\|?\s*(.*)$/s);
  if (timeMatch) {
    const [, startRaw, endRaw, remaining] = timeMatch;
    if (TIME_RE.test(startRaw) && TIME_RE.test(endRaw)) {
      startSec = timeToSeconds(startRaw);
      endSec = timeToSeconds(endRaw);
      if (endSec <= startSec) {
        throw new Error(`وقت النهاية يجب أن يكون بعد وقت البداية: "${line.trim()}"`);
      }
      rest = remaining.trim();
    }
  }

  const text = rest.trim();
  if (!text) {
    throw new Error(`السطر لا يحتوي على نص ترجمة بعد الموضع/التوقيت: "${line.trim()}"`);
  }

  return {
    position: position ?? DEFAULT_POSITION, // بند 1: افتراضي 4 عند عدم التحديد
    start: startSec, // null = ثابت من بداية الفيديو (بند 2)
    end: endSec,     // null = ثابت حتى نهاية الفيديو (بند 2)
    text,
  };
}

/**
 * يحلّل نص الترجمة الكامل (قد يحتوي عدة أسطر، كل سطر = مقطع ترجمة مستقل)
 * ويُعيد مصفوفة من الـ cues الجاهزة للإرسال للـ backend.
 */
function parseSubtitleCues(fullText) {
  const lines = fullText.split("\n").map(l => l.trim()).filter(Boolean);
  const cues = [];
  for (const line of lines) {
    const cue = parseSubtitleLine(line);
    if (cue) cues.push(cue);
  }
  return cues;
}
