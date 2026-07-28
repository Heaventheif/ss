
"use strict";

import * as cache from "./cache";

// Lazily load the google-translate-api-x translate function.
async function getGoogleXTranslate()  { return (await import("google-translate-api-x")).translate; }
// Lazily load the bing-translate-api translate function.
async function getBingTranslate()     { return (await import("bing-translate-api")).translate; }

const TIMEOUT_MS = 10000;      
const CACHE_TTL_MS = 60 * 60 * 1000; 
const MAX_TEXT_LEN = 5000;     

// Reject a promise if it doesn't resolve within the given timeout.
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label}: انتهت المهلة بعد ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

// Check whether an error indicates a translation-provider rate limit.
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

// Check whether translated text is actually a provider error message.
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

// Translate text to Arabic, falling back between providers on failure.
async function translateToArabic(text) {
  if (!text?.trim()) return text;

  
  if (/[\u0600-\u06FF]/.test(text) && text.match(/[\u0600-\u06FF]/g).length > text.length * 0.3) {
    return text;
  }

  const key = `tr_ar:${text}`;
  const cached = cache.get(key);
  if (cached) return cached;

  for (const provider of providers) {
    if (Date.now() < provider.blockedUntil) continue; 
    if (provider.maxLen && text.length > provider.maxLen) continue; 

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
      
    }
  }

  
  return text;
}

export { translateToArabic  };
