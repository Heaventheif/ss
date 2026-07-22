"use strict";

/**
 * أمر: manga
 * الاستخدام: manga <اسم المانجا> <رقم الفصل> [لغة اختيارية: ar/en/ja]
 * مثال:      manga one piece 13
 *            manga one piece 13 en
 *
 * يبحث في MangaDex عن المانجا، يحدد أفضل نتيجة مطابقة، يجلب الفصل
 * المطلوب (بأولوية لغة عربي > إنجليزي > ياباني > أي لغة متاحة)،
 * ثم يرسل جميع صفحاته كصور دفعات (10 لكل دفعة).
 */

import http from "../utils/fetchHttp";
import fs from "fs-extra";
import os from "os";
import path from "path";
import cache from "../utils/cache.js";

const API_BASE       = "https://api.mangadex.org";
const MAX_PER_GROUP  = 15;               // حد الصور لكل دفعة إرسال (حد مسنجر 16)
const SEARCH_TTL     = 30 * 60 * 1000;   // 30 دقيقة
const AGGREGATE_TTL  = 10 * 60 * 1000;   // 10 دقائق
const MIN_MATCH_SCORE = 0.60;            // أدنى نسبة تشابه مقبولة

// أولوية اللغات عند عدم تحديد المستخدم للغة
const LANG_PRIORITY = ["ar", "en", "ja"];

// اختصارات لغة قد يكتبها المستخدم في نهاية الأمر
const LANG_ALIASES = {
  ar: "ar", arabic: "ar", عربي: "ar", عربية: "ar",
  en: "en", eng: "en", english: "en", انجليزي: "en", إنجليزي: "en",
  ja: "ja", jp: "ja", japanese: "ja", ياباني: "ja",
};

const LANG_LABELS = { ar: "العربية", en: "الإنجليزية", ja: "اليابانية" };

const HEADERS = { "User-Agent": "SunkenBot/2.0 (manga command)" };

// ─── أدوات مساعدة عامة ─────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// تحويل نص إلى ثنائيات حروف (bigrams) لحساب التشابه
function bigrams(str) {
  const s = str.toLowerCase().replace(/\s+/g, " ").trim();
  const out = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.substring(i, i + 2));
  return out;
}

// نسبة تشابه (Dice's Coefficient) بين نصين — بديل مبسّط لمكتبة string-similarity
function similarity(a, b) {
  if (!a || !b) return 0;
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (na === nb) return 1;
  const bgA = bigrams(na);
  const bgB = bigrams(nb);
  if (!bgA.length || !bgB.length) return 0;
  const mapB = new Map();
  for (const bg of bgB) mapB.set(bg, (mapB.get(bg) || 0) + 1);
  let matches = 0;
  for (const bg of bgA) {
    const count = mapB.get(bg) || 0;
    if (count > 0) {
      matches++;
      mapB.set(bg, count - 1);
    }
  }
  return (2 * matches) / (bgA.length + bgB.length);
}

// تنظيف اسم المانجا المُدخل من المستخدم
function cleanQuery(raw) {
  return raw
    .replace(/["'`ʼ’]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// جلب كل عناوين المانجا (الرئيسي + البدائل) كمصفوفة نصوص
function collectTitles(manga) {
  const titles = [];
  const attrs = manga.attributes || {};
  if (attrs.title) titles.push(...Object.values(attrs.title));
  if (Array.isArray(attrs.altTitles)) {
    for (const alt of attrs.altTitles) titles.push(...Object.values(alt));
  }
  return titles.filter(Boolean);
}

function bestTitle(manga) {
  const attrs = manga.attributes || {};
  return (
    attrs.title?.en ||
    attrs.title?.ja ||
    Object.values(attrs.title || {})[0] ||
    "بدون عنوان"
  );
}

// ─── المرحلة الرابعة/الخامسة/السادسة: البحث واختيار أفضل نتيجة ───

async function searchManga(query) {
  const cacheKey = `manga_search:${query}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const res = await http.get(`${API_BASE}/manga`, {
    params: {
      title: query,
      limit: 20,
      "order[relevance]": "desc",
      "contentRating[]": ["safe", "suggestive", "erotica"],
    },
    headers: HEADERS,
    timeout: 15000,
  });

  const results = res.data?.data || [];
  cache.set(cacheKey, results, SEARCH_TTL);
  return results;
}

function pickBestManga(query, candidates) {
  let best = null;
  let bestScore = 0;
  for (const manga of candidates) {
    const titles = collectTitles(manga);
    let score = 0;
    for (const t of titles) score = Math.max(score, similarity(query, cleanQuery(t)));
    if (score > bestScore) {
      bestScore = score;
      best = manga;
    }
  }
  return { manga: best, score: bestScore };
}

// ─── المرحلة السابعة/الثامنة: البحث المباشر عن الفصل عبر /chapter ───
//
// لم نعد نعتمد على /manga/{id}/aggregate إطلاقًا لاختيار نسخة اللغة، لأن
// aggregate يجمّع الفصول بطريقة قد لا تُدرج كل اللغات ضمن id/others لنفس
// رقم الفصل (وهذا كان سبب اختيار الإسبانية رغم توفر العربية). البديل هنا:
// استعلام مباشر لـ /chapter بفلاتر manga + chapter + translatedLanguage،
// ثم فلترة/ترتيب النتائج يدويًا لاختيار أدق نسخة.

const CHAPTER_FETCH_LIMIT = 100; // نجلب كل النسخ المتاحة بنفس الرقم/اللغة دفعة واحدة بدل limit=1
const CHAPTER_QUERY_TTL   = 5 * 60 * 1000; // كاش قصير لاستعلامات الفصل (5 دقائق)

// يبني صيغ محتملة لرقم الفصل كما قد يُخزَّن في MangaDex:
// "13" يجب أن يقبل أيضًا "13.0"، والعكس، لكن لا يقبل "130" أو "213".
// نعتمد على صيغتين فقط (بدون/مع ".0") تغطي الغالبية العظمى من الحالات،
// وأي مطابقة نهائية تُتحقق عدديًا لاحقًا في isExactChapterMatch() كحارس أمان إضافي.
function buildChapterCandidates(chapterNumberStr) {
  const raw = String(chapterNumberStr).trim();
  const candidates = new Set([raw]);

  if (!raw.includes(".")) {
    candidates.add(`${raw}.0`);
  } else if (raw.endsWith(".0")) {
    candidates.add(raw.slice(0, -2));
  }

  return [...candidates];
}

// مطابقة عددية صارمة: 13 يساوي 13.0 لكنه لا يساوي 130 أو 213.
// هذا يحل محل أي استخدام لـ includes()/parseFloat() التقريبي في المنطق القديم.
function isExactChapterMatch(attrChapter, targetNum) {
  if (attrChapter === null || attrChapter === undefined) return false;
  const n = Number(attrChapter);
  return !Number.isNaN(n) && n === targetNum;
}

// يستبعد النتائج غير الصالحة للقراءة داخل البوت:
// - فصول خارجية (externalUrl): لا تحتوي صفحات قابلة للتحميل من MangaDex.
// - فصول بلا صفحات (pages === 0): غالبًا محذوفة أو منسوخة جزئيًا.
function isReadableChapter(attrs) {
  if (!attrs) return false;
  if (attrs.externalUrl) return false;
  if (typeof attrs.pages === "number" && attrs.pages <= 0) return false;
  return true;
}

// من بين نتائج /chapter الخام لنفس رقم/لغة الفصل، يختار الأنسب:
// تطابق عددي دقيق + قابل للقراءة + الأحدث (readableAt) عند تعدد الترجمات.
function pickBestChapterResult(rawResults, targetNum) {
  const valid = (rawResults || []).filter(
    (item) => item?.attributes && isExactChapterMatch(item.attributes.chapter, targetNum) && isReadableChapter(item.attributes)
  );
  if (!valid.length) return null;

  valid.sort((a, b) => {
    const da = new Date(a.attributes.readableAt || a.attributes.publishAt || 0).getTime();
    const db = new Date(b.attributes.readableAt || b.attributes.publishAt || 0).getTime();
    return db - da; // الأحدث أولاً
  });

  const best = valid[0];
  return { id: best.id, lang: best.attributes.translatedLanguage };
}

// استعلام خام واحد إلى /chapter بفلتر رقم فصل معيّن (+لغة اختيارية)
async function queryChaptersRaw(mangaId, chapterFilter, lang) {
  const cacheKey = `manga_chapter_query:${mangaId}:${chapterFilter}:${lang || "any"}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const params = {
    manga: mangaId,
    chapter: chapterFilter,
    limit: CHAPTER_FETCH_LIMIT,
    "order[readableAt]": "desc",
    "contentRating[]": ["safe", "suggestive", "erotica", "pornographic"],
  };
  if (lang) params["translatedLanguage[]"] = [lang];

  const res = await http.get(`${API_BASE}/chapter`, {
    params,
    headers: HEADERS,
    timeout: 15000,
  });

  const data = Array.isArray(res.data?.data) ? res.data.data : [];
  cache.set(cacheKey, data, CHAPTER_QUERY_TTL);
  return data;
}

// يجرّب كل صيغ رقم الفصل المحتملة (13 / 13.0) للغة واحدة، ويدمج النتائج
// قبل اختيار الأفضل. هذا يغطي طلب "لا تستخدم limit=1، اجمع النتائج ثم اختر".
async function findBestChapterForLanguage(mangaId, chapterCandidates, lang, targetNum) {
  // الصيغ المختلفة لرقم الفصل (13 / 13.0 / ...) مستقلة تماماً عن بعضها —
  // ما في سبب نستناهم بالتتابع. نطلقهم كلهم بنفس اللحظة ونجمع النتائج
  // بعد ما يخلصوا كلهم (allSettled عشان فشل صيغة وحدة ما يوقف الباقي).
  const settled = await Promise.allSettled(
    chapterCandidates.map(candidate => queryChaptersRaw(mangaId, candidate, lang))
  );
  const combined = [];
  for (const outcome of settled) {
    if (outcome.status === "fulfilled" && outcome.value.length) {
      combined.push(...outcome.value);
    }
    // فشل صيغة واحدة (rejected) يُتجاهل بصمت، تماماً كالسلوك السابق
  }
  return pickBestChapterResult(combined, targetNum);
}

// الملاذ الأخير عند عدم توفر رقم الفصل بأي من الصيغ ولا بأي لغة من الأولوية:
// نجلب أقرب فصل رقميًا (فرق مطلق أصغر) من نفس المانجا، مهما كانت لغته،
// حتى لا يفشل الأمر كليًا إن كان الفصل مرقّمًا بصيغة غير متوقعة (مثل "13-omake").
// يُستخدم فقط إذا لم توجد أي نتيجة أخرى مطابقة تمامًا (وفق الشرط رقم 7).
async function findNearestChapterAsLastResort(mangaId, targetNum) {
  try {
    const res = await http.get(`${API_BASE}/chapter`, {
      params: {
        manga: mangaId,
        limit: CHAPTER_FETCH_LIMIT,
        "order[chapter]": "asc",
        "contentRating[]": ["safe", "suggestive", "erotica", "pornographic"],
      },
      headers: HEADERS,
      timeout: 15000,
    });

    const data = Array.isArray(res.data?.data) ? res.data.data : [];
    const readable = data.filter((item) => isReadableChapter(item?.attributes));
    if (!readable.length) return null;

    let nearest = null;
    let nearestDiff = Infinity;
    for (const item of readable) {
      const n = Number(item.attributes.chapter);
      if (Number.isNaN(n)) continue;
      const diff = Math.abs(n - targetNum);
      if (diff < nearestDiff) {
        nearestDiff = diff;
        nearest = item;
      }
    }
    if (!nearest) return null;
    return { id: nearest.id, lang: nearest.attributes.translatedLanguage };
  } catch (_) {
    return null;
  }
}

// نقطة الدخول الرئيسية لاختيار الفصل واللغة الصحيحين.
// عربي فقط دائمًا (ما لم يحدد المستخدم لغة أخرى صراحةً) — بدون أي رجوع
// تلقائي للغة بديلة (إسبانية أو غيرها) وبدون ملاذ أخير بأقرب رقم فصل.
// إن لم يتوفر الفصل باللغة المطلوبة، تُرجَع النتيجة فارغة والمستدعي يبلّغ
// المستخدم أن الفصل غير متوفر بتلك اللغة تحديدًا.
async function resolveChapter(mangaId, chapterNumberStr, requestedLang) {
  const targetNum = Number(chapterNumberStr);
  const chapterCandidates = buildChapterCandidates(chapterNumberStr);
  const lang = requestedLang || "ar";

  const selected = await findBestChapterForLanguage(mangaId, chapterCandidates, lang, targetNum);

  console.log({
    mangaId,
    chapter: chapterNumberStr,
    requestedLanguage: lang,
    selectedLanguage: selected?.lang || null,
    chapterId: selected?.id || null,
  });

  if (selected) {
    return { chapterId: selected.id, lang: selected.lang, availableLangs: [selected.lang] };
  }

  return { chapterId: null, availableLangs: [] };
}

// ─── المرحلة الحادية عشر/الثانية عشر: At-Home Server وبناء الروابط ───

async function buildPageUrls(chapterId) {
  const res = await http.get(`${API_BASE}/at-home/server/${chapterId}`, {
    headers: HEADERS,
    timeout: 15000,
  });

  const baseUrl = res.data?.baseUrl;
  const chapter = res.data?.chapter;
  if (!baseUrl || !chapter?.hash || !Array.isArray(chapter.data)) return [];

  return chapter.data.map((file) => `${baseUrl}/data/${chapter.hash}/${file}`);
}

// ─── المرحلة الرابعة عشر: تحميل وإرسال الصور على دفعات ───

async function downloadImage(url, index) {
  const ext = path.extname(url).split("?")[0] || ".jpg";
  const filePath = path.join(os.tmpdir(), `manga_${Date.now()}_${index}${ext}`);
  const res = await http.get(url, {
    responseType: "arraybuffer",
    timeout: 20000,
    headers: HEADERS,
  });
  await fs.writeFile(filePath, res.data);
  return filePath;
}

// ─── تحميل بتزامن محدود ─────────────────────────────────────
// بدل فتح كل الطلبات دفعة واحدة (Promise.allSettled على مصفوفة كاملة قد
// تصل 80-100 صفحة)، نُبقي عدداً محدوداً من الطلبات النشطة في نفس الوقت.
// هذا يقلّل الضغط على الذاكرة/الشبكة بشكل كبير على الأجهزة محدودة الموارد
// (مثل Termux)، مع الحفاظ على ترتيب النتائج الأصلي عبر الفهرس (index).
const DOWNLOAD_CONCURRENCY = 6;

async function downloadAllWithLimit(pageUrls, limit = DOWNLOAD_CONCURRENCY) {
  const results = new Array(pageUrls.length).fill(null);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= pageUrls.length) return;
      try {
        results[i] = await downloadImage(pageUrls[i], i);
      } catch (_) {
        results[i] = null;
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, pageUrls.length) }, worker);
  await Promise.all(workers);
  return results;
}

// ─── ميزة مدمجة من أمر mf السابق: نطاقات الفصول العربية المتوفرة/المفقودة ───
// تُستخدم عندما يكتب المستخدم "manga <اسم المانجا>" بدون رقم فصل — بدل رفض
// الطلب، نعرض له نطاقات الفصول المترجمة للعربية المتوفرة والمفقودة.

const AGG_LANG = "ar"; // اللغة الوحيدة المدعومة في وضع البحث عن النطاقات
const MAX_RUNS_SHOWN = 10; // أقصى عدد نطاقات "متوفرة" نعرضها بالتفصيل قبل التلخيص
const MAX_GAPS_SHOWN = 8;  // أقصى عدد فجوات "مفقودة" نعرضها بالتفصيل قبل التلخيص

// يجلب aggregate مفلترة بالعربية فقط (translatedLanguage[]=ar)، فيرجع كل
// الفصول المترجمة للعربية تحديدًا (مجمّعة داخل مجلدات/volumes الخام).
async function fetchAggregate(mangaId) {
  const cacheKey = `manga_aggregate:${mangaId}:${AGG_LANG}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const res = await http.get(`${API_BASE}/manga/${mangaId}/aggregate`, {
    params: { "translatedLanguage[]": [AGG_LANG] },
    headers: HEADERS,
    timeout: 15000,
  });

  const volumes = res.data?.volumes || {};
  cache.set(cacheKey, volumes, AGGREGATE_TTL);
  return volumes;
}

// يسحب كل أرقام الفصول (كأرقام) من بنية volumes المتشعبة، بغض النظر عن
// توزيعها على المجلدات (volumes)، بما فيها مجلد "none" (بلا مجلد).
function extractChapterNumbers(volumes) {
  const numbers = [];
  for (const volKey of Object.keys(volumes || {})) {
    const chapters = volumes[volKey]?.chapters || {};
    for (const chKey of Object.keys(chapters)) {
      const n = Number(chapters[chKey]?.chapter);
      if (!Number.isNaN(n)) numbers.push(n);
    }
  }
  return numbers;
}

// يحسب النطاقات المتتالية المتوفرة والفجوات (الفصول الناقصة) بينها، بالاعتماد
// فقط على أرقام الفصول الصحيحة (أعداد كاملة). الفصول الفرعية العشرية (13.5
// مثلاً) تُتجاهل تمامًا في هذا الحساب.
function findRuns(numbers) {
  const ints = [...new Set(numbers.filter((n) => Number.isInteger(n)))].sort((a, b) => a - b);
  const runs = [];
  const gaps = [];
  if (!ints.length) return { runs, gaps };

  let start = ints[0];
  let prev = ints[0];
  for (let i = 1; i < ints.length; i++) {
    const cur = ints[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    runs.push({ from: start, to: prev });
    gaps.push({ from: prev + 1, to: cur - 1 });
    start = cur;
    prev = cur;
  }
  runs.push({ from: start, to: prev });

  return { runs, gaps };
}

function formatRuns(runs) {
  const shown = runs.slice(0, MAX_RUNS_SHOWN).map((r) =>
    r.from === r.to ? `الفصل ${r.from} موجود` : `من ${r.from} الى ${r.to} موجودة`
  );
  let text = shown.join("\n");
  if (runs.length > MAX_RUNS_SHOWN) text += `\n(و${runs.length - MAX_RUNS_SHOWN} نطاق آخر)`;
  return text;
}

function formatMissing(gaps) {
  if (!gaps.length) return null;
  const shown = gaps.slice(0, MAX_GAPS_SHOWN).map((g) => (g.from === g.to ? `${g.from}` : `${g.from}-${g.to}`));
  let text = shown.join("، ");
  if (gaps.length > MAX_GAPS_SHOWN) text += ` (و${gaps.length - MAX_GAPS_SHOWN} فجوة أخرى)`;
  return text;
}

// وضع البحث عن النطاقات فقط (بدون رقم فصل): يبحث عن المانجا، يجلب فصولها
// العربية المتوفرة، ويعرض النطاقات الموجودة/المفقودة بنفس أسلوب أمر mf السابق.
async function runChapterRangeSearch({ api, threadID, messageID, rawName, mangaQuery }) {
  let statusMsgId = null;
  try {
    statusMsgId = await new Promise((resolve) => {
      global.safeSend(
        api,
        `⏳ جاري البحث عن المانجا...\n📖 ${rawName}`,
        threadID,
        (err, info) => resolve(err ? null : info?.messageID || null),
        messageID
      );
    });
  } catch (_) {}

  const updateStatus = async (text) => {
    try {
      if (statusMsgId) await api.editMessage(text, statusMsgId);
      else global.safeSend(api, text, threadID, null, messageID);
    } catch (_) {
      global.safeSend(api, text, threadID, null, messageID);
    }
  };

  try {
    let candidates;
    try {
      candidates = await searchManga(mangaQuery);
    } catch (err) {
      throw { userMsg: "❌ تعذر الاتصال بخادم المانجا.\nحاول لاحقاً." };
    }

    if (!candidates.length) {
      throw { userMsg: "❌ لم يتم العثور على مانجا بهذا الاسم." };
    }

    const { manga, score } = pickBestManga(mangaQuery, candidates);
    if (!manga || score < MIN_MATCH_SCORE) {
      throw { userMsg: "❌ لم أتمكن من العثور على المانجا." };
    }

    const mangaId = manga.id;
    const mangaTitle = bestTitle(manga);

    await updateStatus(`🔍 وجدت: ${mangaTitle}\n📄 جاري جلب الفصول المترجمة للعربية...`);

    let volumes;
    try {
      volumes = await fetchAggregate(mangaId);
    } catch (err) {
      throw { userMsg: "❌ تعذر الاتصال بخادم المانجا.\nحاول لاحقاً." };
    }

    const numbers = extractChapterNumbers(volumes);
    if (!numbers.length) {
      throw { userMsg: "❌ لا توجد أي فصول مترجمة للعربية لهذه المانجا." };
    }

    numbers.sort((a, b) => a - b);
    const { runs, gaps } = findRuns(numbers);

    let msg = `مانجا ${mangaTitle} الفصول المترجمة للعربية المرفوعة :\n`;

    if (runs.length) {
      msg += formatRuns(runs);
      const missingText = formatMissing(gaps);
      if (missingText) msg += `\nالفصول المفقودة ${missingText}`;
    } else {
      msg += `فصول خاصة فقط (${numbers[0]} - ${numbers[numbers.length - 1]})`;
    }

    await updateStatus(msg);
  } catch (err) {
    const userMsg = err?.userMsg || `❌ حدث خطأ غير متوقع: ${err?.message?.substring(0, 80) || ""}`;
    try {
      if (statusMsgId) await api.editMessage(userMsg, statusMsgId);
      else global.safeSend(api, userMsg, threadID, null, messageID);
    } catch (_) {
      global.safeSend(api, userMsg, threadID, null, messageID);
    }
  }
}

export default {
  config: {
    name: "manga",
    aliases: ["مانجا"],
    version: "2.0.0",
    author: "Sunken",
    countDown: 15,
    role: 0,
    category: "media",
    description: "قراءة فصول المانجا (صور)، أو عرض نطاق الفصول العربية المتوفرة/المفقودة إن لم يُذكر رقم فصل",
    usage: [
      "{pn}مانجا1 <اسم المانجا> <رقم الفصل> — مثال: {pn}مانجا1 one piece 13",
      "{pn}مانجا1 <اسم المانجا> <رقم الفصل> <لغة> — مثال: {pn}مانجا1 one piece 13 en",
      "{pn}مانجا1 <اسم المانجا> <رقم الفصل> ar — مثال: {pn}مانجا1 attack on titan 5 ar",
      "{pn}مانجا1 <اسم المانجا> (بدون رقم فصل) — يعرض نطاقات الفصول العربية المتوفرة/المفقودة، مثال: {pn}مانجا1 one piece",
    ],
  },

  onStart: async function ({ api, event, args }) {
    const { threadID, messageID } = event;

    // ─── المرحلة الثانية: تحليل الأمر ───
    if (!args.length) {
      return global.safeSend(
        api,
        "📖 قارئ المانجا\n\n" +
          "📝 الاستخدام: manga [اسم المانجا] [رقم الفصل]\n\n" +
          "💡 مثال:\n  manga one piece 13\n  manga one piece 13 en",
        threadID,
        null,
        messageID
      );
    }

    // استخراج لغة اختيارية من آخر كلمة (ar/en/ja...)
    let workingArgs = [...args];
    let requestedLang = null;
    if (workingArgs.length >= 3) {
      const maybeLang = LANG_ALIASES[workingArgs[workingArgs.length - 1].toLowerCase()];
      if (maybeLang) {
        requestedLang = maybeLang;
        workingArgs = workingArgs.slice(0, -1);
      }
    }

    const lastToken = workingArgs[workingArgs.length - 1];
    const isChapterNumber = lastToken && /^\d+(\.\d+)?$/.test(lastToken);

    // لا يوجد رقم فصل في نهاية الأمر → وضع البحث عن نطاقات الفصول العربية
    // المتوفرة/المفقودة (الميزة المدمجة من أمر mf السابق)، بدل رفض الطلب.
    if (!isChapterNumber) {
      const rawName = workingArgs.join(" ").trim();
      const mangaQuery = cleanQuery(rawName);
      if (!mangaQuery) {
        return global.safeSend(
          api,
          "📖 قارئ المانجا\n\n" +
            "📝 الاستخدام:\n" +
            "  manga [اسم المانجا] [رقم الفصل] — لقراءة فصل معيّن\n" +
            "  manga [اسم المانجا] — لعرض نطاقات الفصول العربية المتوفرة\n\n" +
            "💡 مثال:\n  manga one piece 13\n  manga one piece",
          threadID,
          null,
          messageID
        );
      }
      return runChapterRangeSearch({ api, threadID, messageID, rawName, mangaQuery });
    }

    const chapterNumber = lastToken;
    const rawName = workingArgs.slice(0, -1).join(" ").trim();

    if (!rawName) {
      return global.safeSend(
        api,
        "📖 قارئ المانجا\n\n" +
          "📝 الاستخدام: manga [اسم المانجا] [رقم الفصل]\n\n" +
          "💡 مثال:\n  manga one piece 13",
        threadID,
        null,
        messageID
      );
    }

    // ─── المرحلة الثالثة: تنظيف البيانات ───
    const mangaQuery = cleanQuery(rawName);
    if (!mangaQuery) {
      return global.safeSend(api, "❗ يرجى تحديد رقم الفصل.", threadID, null, messageID);
    }

    // بلا رسائل حالة/تقدّم — البوت يرسل المخرج النهائي (الصور) فقط
    const updateStatus = async () => {};

    try {
      // ─── المرحلة الرابعة/الخامسة/السادسة ───
      let candidates;
      try {
        candidates = await searchManga(mangaQuery);
      } catch (err) {
        throw { userMsg: "❌ تعذر الاتصال بخادم المانجا.\nحاول لاحقاً." };
      }

      if (!candidates.length) {
        throw { userMsg: "❌ لم يتم العثور على مانجا بهذا الاسم." };
      }

      const { manga, score } = pickBestManga(mangaQuery, candidates);
      if (!manga || score < MIN_MATCH_SCORE) {
        throw { userMsg: "❌ لم أتمكن من العثور على المانجا." };
      }

      const mangaId = manga.id;
      const mangaTitle = bestTitle(manga);

      await updateStatus(`🔍 وجدت: ${mangaTitle}\n📄 جاري البحث عن الفصل ${chapterNumber}...`);

      // ─── المرحلة السابعة إلى العاشرة: البحث عن الفصل واختيار اللغة ───
      let chapterId, lang, availableLangs;
      try {
        ({ chapterId, lang, availableLangs } = await resolveChapter(
          mangaId,
          chapterNumber,
          requestedLang
        ));
      } catch (err) {
        throw { userMsg: "❌ تعذر الاتصال بخادم المانجا.\nحاول لاحقاً." };
      }

      if (!chapterId) {
        const langLabel = LANG_LABELS[requestedLang || "ar"] || requestedLang;
        throw { userMsg: `❌ الفصل ${chapterNumber} غير متوفر بـ${langLabel}.` };
      }

      await updateStatus(`📥 جاري تجهيز صفحات الفصل ${chapterNumber}...\n📖 ${mangaTitle}`);

      // ─── المرحلة الحادية عشر/الثانية عشر: At-Home Server وبناء الروابط ───
      let pageUrls;
      try {
        pageUrls = await buildPageUrls(chapterId);
      } catch (err) {
        throw { userMsg: "❌ تعذر الاتصال بخادم المانجا.\nحاول لاحقاً." };
      }

      // ─── المرحلة الثالثة عشر: التحقق من الصور ───
      if (!pageUrls.length) {
        throw { userMsg: "❌ الفصل لا يحتوي على صفحات." };
      }

      await updateStatus(
        `📥 جاري تحميل ${pageUrls.length} صفحة...\n📖 ${mangaTitle}\n📄 الفصل ${chapterNumber}`
      );

      // تحميل الصور بتزامن محدود (محاولات مستقلة، فشل صورة لا يوقف الباقي)
      const downloaded = await downloadAllWithLimit(pageUrls);

      const validFiles = downloaded.filter(Boolean);
      if (!validFiles.length) {
        throw { userMsg: "❌ فشل تحميل صفحات الفصل. حاول مرة أخرى." };
      }

      // ─── المرحلة الرابعة عشر: إرسال الصور على دفعات ───
      let allSent = true;
      const totalGroups = Math.ceil(validFiles.length / MAX_PER_GROUP);
      for (let i = 0; i < validFiles.length; i += MAX_PER_GROUP) {
        const group = validFiles.slice(i, i + MAX_PER_GROUP);
        const groupNum = Math.floor(i / MAX_PER_GROUP) + 1;
        const isFirst = i === 0;

        const body =
          totalGroups > 1
            ? `📖 ${mangaTitle} — الفصل ${chapterNumber} (${groupNum}/${totalGroups})`
            : `📖 ${mangaTitle} — الفصل ${chapterNumber}`;

        try {
          // ننتظر تأكيد الإرسال الفعلي عبر الـ callback، وليس فقط رجوع
          // الـ Promise من الطابور الخارجي (الذي يتحلّل بعد فاصل زمني
          // ثابت صغير، لا بعد اكتمال الرفع الفعلي). بدون هذا، دفعة لاحقة
          // أصغر (أسرع رفعاً) قد تصل قبل دفعة أولى أكبر فيختل ترتيب صفحات
          // الفصل عند وصولها للمستخدم.
          await new Promise((resolve, reject) => {
            global.safeSend(
              api,
              { body, attachment: group.map((f) => fs.createReadStream(f)) },
              threadID,
              (err) => (err ? reject(err) : resolve()),
              isFirst ? messageID : null
            );
          });
        } catch (err) {
          allSent = false;
        }
        if (i + MAX_PER_GROUP < validFiles.length) await sleep(600);
      }

      await Promise.allSettled(validFiles.map((f) => fs.remove(f)));

      // بلا رسالة نهاية عند النجاح الكامل — الصور نفسها هي المخرج النهائي.
      // نبلّغ فقط عند نقص فعلي في الإرسال (معلومة ضرورية، ليست رسالة حالة).
      if (!allSent || validFiles.length !== pageUrls.length) {
        global.safeSend(
          api,
          "⚠️ تم إرسال جزء من الفصل فقط.\nيمكنك إعادة المحاولة.",
          threadID,
          null,
          null
        );
      }
    } catch (err) {
      const userMsg = err?.userMsg || `❌ حدث خطأ غير متوقع: ${err?.message?.substring(0, 80) || ""}`;
      global.safeSend(api, userMsg, threadID, null, messageID);
    }
  },
};

