// utils/translator.js
"use strict";

import * as cache from "./cache";

// ← تحميل كسول لكل مكتبة ترجمة على حدة: هذا الملف يُحمَّل عند الإقلاع
// عبر novel.js/novel2.js/animal.js (لأن index.js يستدعي require() لكل
// ملفات cmds/ مقدَّماً)، فلو حمّلنا المكتبتين top-level، تبقيان مقيمتين
// في الذاكرة طوال عمر العملية حتى لو لم يُستخدم أي أمر ترجمة إطلاقاً.
// بهذا الشكل: كل مزوّد لا يُحمَّل فعلياً (import) إلا في أول مرة يصل
// فيها الدور الفعلي إليه ضمن سلسلة fallback تحت.
//
// اختيار المزوّدَين (بعد إزالة MyMemory وGoogle-Vitalets وLibreTranslate):
//   - Google-X (google-translate-api-x): نفس خوادم translate.google.com
//     فعلياً — أعلى دقة عملياً لعامة اللغات (وخاصة العربية)، صيانة
//     نشطة، وحد نصّي 5000 حرف للطلب الواحد (بدل 490 حرفاً في MyMemory
//     مثلاً) — يغطي أي رسالة/فقرة طبيعية بلا تقطيع تقريباً.
//   - Bing: مزوّد مستقل تماماً عن Google (لا يشارك حظر/تبريد معه)،
//     دقة قريبة جداً من Google لمعظم اللغات، وحد نصّي مماثل تقريباً
//     (~5000 حرف) — احتياطي منطقي إن حُظر Google-X مؤقتاً.
async function getGoogleXTranslate()  { return (await import("google-translate-api-x")).translate; }
async function getBingTranslate()     { return (await import("bing-translate-api")).translate; }

const TIMEOUT_MS = 10000;      // مهلة قصوى لأي محرك قبل ما نعتبره "علّق" وننتقل للتالي
const CACHE_TTL_MS = 60 * 60 * 1000; // ساعة
const MAX_TEXT_LEN = 5000;     // حد كلا المزوّدين تقريباً — نص أطول من هذا يُرسَل كما هو دون تقطيع (احتمال ضعيف عملياً)

/**
 * يلف أي Promise بمهلة زمنية — لو المحرك "علّق" بدل ما يرمي خطأ،
 * هذا يفشله صراحة بدل ما يجمّد الأمر كامل (مشكلة كانت موجودة بكل
 * النسخ الثلاث الأصلية).
 */
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: انتهت المهلة بعد ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function isRateLimited(e) {
  if (e?.statusCode === 429 || e?.status === 429 || e?.code === 429) return true;
  if (e?.name === "TooManyRequestsError") return true;
  const msg = String(e?.message || e || "").toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("too many requests") ||
    msg.includes("rate limit") ||
    msg.includes("quota")
  );
}

// بعض المزوّدين يرجّعون HTTP 200 حتى عند رفض النص، مع رسالة خطأ نصية
// بدل ترجمة فعلية. هذه الدالة تكشف هذا النمط لنرفضه صراحة بدل تخزينه
// بالكاش وإرساله للمستخدم كـ"ترجمة" فعلية.
function isProviderErrorText(text) {
  if (!text) return false;
  const t = String(text).toLowerCase();
  return (
    t.includes("query length limit exceeded") ||
    t.includes("max allowed query") ||
    text.includes("تجاوز حد طول الاستعلام") ||
    text.includes("الحد الأقصى المسموح به للاستعلام")
  );
}

/**
 * قائمة المحرّكات بترتيب الأولوية. كل محرك مستقل بحالة حظره الخاصة
 * (blockedUntil) ومدة تبريد خاصة به — حظر محرك ما يوقف تجربة الباقي.
 *
 * لإضافة محرك جديد مستقبلاً: أضف عنصر واحد هنا فقط، بدون تكرار أي
 * منطق تحقق/كاش/حظر (هذا موحّد بالحلقة تحت).
 */
const providers = [
  {
    name: "Google-X",
    blockedUntil: 0,
    cooldownMs: 10 * 60 * 1000,
    maxLen: MAX_TEXT_LEN,
    run: async (text) => {
      const googleXTranslate = await getGoogleXTranslate();
      const res = await withTimeout(googleXTranslate(text, { to: "ar" }), TIMEOUT_MS, "Google-X");
      return res?.text ? String(res.text).trim() : null;
    }
  },
  {
    name: "Bing",
    blockedUntil: 0,
    cooldownMs: 15 * 60 * 1000,
    maxLen: MAX_TEXT_LEN,
    run: async (text) => {
      const bingTranslate = await getBingTranslate();
      const res = await withTimeout(bingTranslate(text, null, "ar"), TIMEOUT_MS, "Bing");
      return res?.translation ? String(res.translation).trim() : null;
    }
  }
];

async function translateToArabic(text) {
  if (!text?.trim()) return text;

  // نص عربي أصلاً (>30% حروف عربية) — لا داعي للترجمة
  if (/[\u0600-\u06FF]/.test(text) && text.match(/[\u0600-\u06FF]/g).length > text.length * 0.3) {
    return text;
  }

  const key = `tr_ar:${text}`;
  const cached = cache.get(key);
  if (cached) return cached;

  for (const provider of providers) {
    if (Date.now() < provider.blockedUntil) continue; // هذا المحرك بفترة تبريد، جرّب التالي مباشرة
    if (provider.maxLen && text.length > provider.maxLen) continue; // النص أطول من حد هذا المزوّد — تخطَّه مباشرة

    try {
      const result = await provider.run(text);
      if (result && !isProviderErrorText(result)) {
        cache.set(key, result, CACHE_TTL_MS);
        return result;
      }
    } catch (e) {
      if (isRateLimited(e)) {
        provider.blockedUntil = Date.now() + provider.cooldownMs;
        console.warn(
          `[TRANSLATOR] حظر مؤقت لـ ${provider.name} (${provider.cooldownMs / 60000} دقيقة) — تحويل للمحرك التالي`
        );
      } else {
        console.warn(`[TRANSLATOR] خطأ في ${provider.name}:`, e.message?.substring(0, 80));
      }
      // نكمل تلقائياً للمحرك التالي بالحلقة
    }
  }

  // كل المحركات فشلت أو محظورة مؤقتاً: نرجع النص الأصلي كأمان للمستخدم
  return text;
}

export { translateToArabic  };
