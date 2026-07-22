"use strict";

/**
 * كاش بسيط في الذاكرة مع TTL (Time To Live).
 * يُستخدم لتقليل زمن الاستجابة وتقليل استهلاك حصص الـ APIs الخارجية
 * (بحث يوتيوب، ترجمة، إلخ) عند تكرار نفس الطلب خلال فترة قصيرة.
 *
 * الاستخدام:
 *   import cache from "../utils/cache";
 *   const key = `yt_search:${query}`;
 *   let data = cache.get(key);
 *   if (!data) {
 *     data = await doExpensiveSearch(query);
 *     cache.set(key, data, 5 * 60 * 1000); // 5 دقائق
 *   }
 */

const _store = new Map(); // key -> { value, expiresAt } — ترتيب الإدراج = ترتيب LRU
const MAX_ENTRIES = 1500; // سقف أقصى وقائي (خُفِّض من 5000): يمنع نمو غير محدود لو تراكمت مفاتيح كثيرة قبل انتهاء TTL — على حاوية 512MB كل هامش أمان مهم

function get(key) {
  const entry = _store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _store.delete(key);
    return null;
  }
  // ← نقل المفتاح لنهاية الـ Map عند الاستخدام (يجعله "الأحدث استخداماً"
  // فعلياً، لا فقط "الأحدث إدراجاً") — يحسّن دقة الإخلاء عند الامتلاء
  _store.delete(key);
  _store.set(key, entry);
  return entry.value;
}

function set(key, value, ttlMs = 5 * 60 * 1000) {
  if (_store.size >= MAX_ENTRIES && !_store.has(key)) {
    const oldestKey = _store.keys().next().value; // Map يحافظ على ترتيب الإدراج/الاستخدام
    _store.delete(oldestKey);
  }
  _store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

function del(key) {
  _store.delete(key);
}

/** يحذف كل المدخلات المنتهية — يُستحسن استدعاؤها دورياً (مثلاً ضمن دورة التنظيف العامة) */
function sweep() {
  const now = Date.now();
  let removed = 0;
  for (const [key, entry] of _store.entries()) {
    if (now > entry.expiresAt) { _store.delete(key); removed++; }
  }
  return removed;
}

function size() {
  return _store.size;
}

export { get, set, del, sweep, size  };
export default { get, set, del, sweep, size };
