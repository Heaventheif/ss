"use strict";

/**
 * مصدر واحد لقراءة رابط HF Space وتوكن الاتصال الداخلي — من متغيرات
 * البيئة (process.env) فقط، بلا أي رابط أو placeholder مكتوب بالكود.
 *
 * كانت 5 ملفات (fb.js, gemini.js, sub.js, novel2.js, pin.js) تقرأ نفس
 * المتغير HF_SPACE_URL كل واحد بسلوكه الخاص عند الغياب:
 *   - بعضها يرمي خطأ واضح (جيد)
 *   - fb.js كان يستخدم رابطاً حقيقياً مثبَّتاً بالكود كـ fallback
 *   - novel2.js و pin.js كانا يستخدمان placeholder وهمياً لم يُستبدل
 *     (مثل "https://YOUR-SPACE.hf.space") فيفشل الطلب بصمت على نطاق
 *     غير موجود بدل رسالة واضحة.
 * الآن: نقطة واحدة، بلا أي رابط بالكود، وسلوك واحد موحّد عند الغياب.
 */

/**
 * @returns {string} رابط HF Space بدون / زائدة في النهاية
 * @throws {Error} إن لم يكن HF_SPACE_URL مضبوطاً في متغيرات البيئة
 */
function getHfBase() {
  const url = (process.env.HF_SPACE_URL || "").trim();
  if (!url) {
    throw new Error("HF_SPACE_URL غير مضبوط في متغيرات البيئة (Environment Variables)");
  }
  return url.replace(/\/+$/, "");
}

/**
 * نسخة لا ترمي خطأ — تُعيد null بدل ذلك، مفيدة عند رغبتك بمعالجة
 * الغياب برسالة مخصصة للمستخدم بدل استثناء عام.
 */
function getHfBaseOrNull() {
  try { return getHfBase(); } catch (_) { return null; }
}

function getInternalToken() {
  return process.env.INTERNAL_TOKEN || "";
}

export { getHfBase, getHfBaseOrNull, getInternalToken  };
