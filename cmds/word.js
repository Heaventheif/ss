

"use strict";

import http from "../utils/fetchHttp";

const MAX_ATTEMPTS = 8;
const WORD_LENGTH  = 5;

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL   = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const FALLBACK_WORDS = [
  "مكتبة", "حديقة", "مدرسة", "حقيبة", "سيارة", "دراجة", "رواية", "جريدة",
  "فراشة", "نافذة", "بوابة", "مزرعة", "محفظة", "مغسلة", "بطاقة", "سفارة",
  "حاسوب", "تلفاز", "زيتون", "مهندس", "مبرمج", "بحيرة", "جزيرة", "مفتاح",
];

// Strip diacritics/elongation from Arabic text for comparison.
function normalizeArabic(str) {
  return String(str)
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "")
    .replace(/[أإآى]/g, "ا")
    .replace(/ة/g, "ه")
    .trim();
}

const ARABIC_WORD_RE = /^[\u0621-\u064A\u0640\u064B-\u0652\u0670]+$/;

// Check whether a word looks like a valid Arabic game word.
function isValidWordCandidate(raw) {
  if (!raw || typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (!ARABIC_WORD_RE.test(trimmed)) return false;
  
  
  const withoutDiacritics = trimmed.replace(/[\u064B-\u0652\u0670\u0640]/g, "");
  if (withoutDiacritics.startsWith("ال")) return false;
  if (normalizeArabic(trimmed).length !== WORD_LENGTH) return false;
  return true;
}

const GAME_KEY   = (threadID) => `kalima500_game_${threadID}`;
const RECENT_KEY = (threadID) => `kalima500_recent_${threadID}`;

// Load the active word-game state for a thread.
function getGame(threadID) {
  return global.globalData?.get(GAME_KEY(threadID)) || null;
}
// Save the word-game state for a thread.
function setGame(threadID, game) {
  global.globalData?.set(GAME_KEY(threadID), game);
}
// Clear the word-game state for a thread.
function deleteGame(threadID) {
  global.globalData?.delete(GAME_KEY(threadID));
}
// Get the list of recently used words for a thread.
function getRecentWords(threadID) {
  return global.globalData?.get(RECENT_KEY(threadID)) || [];
}
// Record a word as recently used for a thread.
function rememberWord(threadID, word) {
  const used = getRecentWords(threadID);
  global.globalData?.set(RECENT_KEY(threadID), [word, ...used].slice(0, 15));
}

const startingThreads = new Set();

// Ask Groq for a new secret word, avoiding recently used ones.
async function fetchWordFromGroq(avoidWords) {
  const apiKey = (process.env.GROQ_API_KEY || "").trim();
  if (!apiKey) return null;

  const avoidNote = avoidWords.length
    ? `تجنّب تماماً استخدام أي من هذه الكلمات (استُخدمت مؤخراً): ${avoidWords.join("، ")}.`
    : "";

  const systemPrompt =
    "أنت مولّد كلمات للعبة تخمين عربية شبيهة بـ Wordle. مهمتك الوحيدة: إرجاع " +
    'كائن JSON بالشكل التالي فقط، بلا أي نص أو شرح قبله أو بعده: {"word":"..."}\n' +
    "شروط الكلمة إلزامية بلا استثناء:\n" +
    "- اسم عربي فصيح شائع الاستخدام (ممنوع الأفعال، وممنوع أسماء الأعلام/الأماكن الحقيقية).\n" +
    "- مكوّنة من 5 أحرف عربية بالضبط بعد حذف أي تشكيل (الحركات لا تُحسب حرفاً).\n" +
    "- بلا أداة التعريف (يمنع أن تبدأ بـ \"ال\").\n" +
    "- بلا أي ضمير متصل في نهايتها (مثل ه/ك/ي/كم/هم كضمير ملكية).\n" +
    "- اكتب الكلمة نفسها بلا أي تشكيل، وبلا علامات ترقيم.\n" +
    "- اختر كلمة مختلفة عشوائياً في كل مرة، لا تكرر نفس الاختيارات الشائعة.";

  const userPrompt = `أعطني الآن كلمة عشوائية واحدة جديدة تحقق الشروط. ${avoidNote}`.trim();

  try {
    const { data } = await http.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 1.1,
        max_tokens: 60,
        response_format: { type: "json_object" },
      },
      {
        timeout: 15000,
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
      }
    );

    const content = data?.choices?.[0]?.message?.content;
    if (!content) return null;

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (_) {
      
      const m = content.match(/[\u0621-\u064A]+/);
      parsed = m ? { word: m[0] } : null;
    }

    const candidate = (parsed?.word || parsed?.كلمة || "").toString().trim();
    return candidate || null;
  } catch (e) {
    console.warn("[كلمة500] فشل الاتصال بـ Groq:", e.message?.substring(0, 120));
    return null;
  }
}

// Pick a new secret word for a thread's game.
async function pickWord(threadID) {
  const used = getRecentWords(threadID);
  const usedNormalized = used.map(normalizeArabic);

  const candidate = await fetchWordFromGroq(used.slice(0, 8));
  if (
    candidate &&
    isValidWordCandidate(candidate) &&
    !usedNormalized.includes(normalizeArabic(candidate))
  ) {
    rememberWord(threadID, candidate);
    return candidate;
  }

  let pool = FALLBACK_WORDS.filter(w => !usedNormalized.includes(normalizeArabic(w)));
  if (pool.length === 0) pool = FALLBACK_WORDS;
  const fallback = pool[Math.floor(Math.random() * pool.length)];
  rememberWord(threadID, fallback);
  return fallback;
}

// Compare a guess to the secret word letter by letter.
function evaluateGuess(normalizedSecret, normalizedGuess) {
  const secretChars = normalizedSecret.split("");
  const guessChars  = normalizedGuess.split("");
  const marks       = new Array(WORD_LENGTH).fill(null);
  const remaining   = {};

  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guessChars[i] === secretChars[i]) {
      marks[i] = "green";
    } else {
      remaining[secretChars[i]] = (remaining[secretChars[i]] || 0) + 1;
    }
  }

  
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (marks[i]) continue;
    const ch = guessChars[i];
    if (remaining[ch] > 0) {
      marks[i] = "yellow";
      remaining[ch]--;
    } else {
      marks[i] = "red";
    }
  }

  return {
    green:  marks.filter(m => m === "green").length,
    yellow: marks.filter(m => m === "yellow").length,
    red:    marks.filter(m => m === "red").length,
  };
}

// Format one guess attempt's feedback line for display.
function formatFeedbackLine(attemptNo, rawGuess, result) {
  return (
    `${attemptNo}/${MAX_ATTEMPTS} — «${rawGuess}»  ` +
    `🟢${result.green}  🟡${result.yellow}  🔴${result.red}`
  );
}

const RULES_TEXT =
  "🎮 لعبة كلمة 500\n\n" +
  "هناك كلمة عربية سرية مكوّنة من 5 أحرف بالضبط. أمامكم كمجموعة 8 محاولات " +
  "لتخمينها. بعد كل محاولة يعطيكم البوت 3 أرقام فقط (بلا كشف الأماكن):\n\n" +
  "🟢 أخضر — عدد الأحرف الصحيحة في مكانها الصحيح تماماً\n" +
  "🟡 أصفر — عدد الأحرف الموجودة في الكلمة لكن بمكان مختلف\n" +
  "🔴 أحمر — عدد الأحرف غير الموجودة في الكلمة إطلاقاً\n\n" +
  "ملاحظة: إذا كررت حرفاً في تخمينك ولم يكن مكرراً في الكلمة السرية، " +
  "يُحتسب مرة واحدة فقط (أخضر أو أصفر) والباقي أحمر.\n\n" +
  "طريقة اللعب:\n" +
  "• كلمة500 بدء — يبدأ جولة جديدة\n" +
  "• بعدها اكتب أي كلمة عربية من 5 أحرف مباشرة (بلا أمر) لتخمينها\n" +
  "• كلمة500 وقف — لإنهاء الجولة الحالية وكشف الكلمة\n" +
  "• كلمة500 — لعرض حالة الجولة الحالية";

// Start a new word-guessing game in a thread.
async function startGame(threadID) {
  const secret = await pickWord(threadID);
  const game = {
    secret,
    normalizedSecret: normalizeArabic(secret),
    attempts: 0,
    history: [],
    startedAt: Date.now(),
  };
  setGame(threadID, game);
  return game;
}

// Build the status text shown for an active game.
function statusText(game) {
  if (!game) {
    return "لا توجد جولة نشطة حالياً.\nاكتب: كلمة500 بدء — لبدء جولة جديدة.";
  }
  const lines = [
    `🎯 جولة نشطة — المحاولة ${game.attempts}/${MAX_ATTEMPTS}`,
    game.history.length ? game.history.join("\n") : "لا توجد محاولات بعد — اكتب أي كلمة عربية من 5 أحرف.",
  ];
  return lines.join("\n");
}

export default {
  config: {
    name: "word",
    aliases: ["word500", "كلمه500", "كلمة٥٠٠"],
    category: "ألعاب وترفيه",
    description: "لعبة تخمين كلمة عربية سرية من 5 أحرف خلال 8 محاولات، مع تلميحات ملوّنة (🟢🟡🔴) على غرار Wordle — كلمة كل جولة تُولَّد عشوائياً عبر Groq API",
    usage: [
      "{pn}كلمة500 — يعرض حالة الجولة الحالية أو طريقة البدء",
      "{pn}كلمة500 بدء — يبدأ جولة جديدة بكلمة عشوائية جديدة من Groq",
      "كلمة ابدأ — طريقة بديلة لبدء الجولة بلا كتابة اسم الأمر",
      "{pn}كلمة500 وقف — ينهي الجولة الحالية ويكشف الكلمة السرية",
      "{pn}كلمة500 مساعدة — يعرض قواعد اللعبة كاملة",
      "أثناء وجود جولة نشطة: اكتب أي كلمة عربية من 5 أحرف مباشرة لتخمينها (بلا أمر)",
    ],
    role: 0,
    countDown: 2,
  },

  
  // Command entry point: start a new word-guessing game.
  onStart: async ({ api, event, args, message }) => {
    const { threadID, messageID } = event;
    const sub = (args[0] || "").trim().toLowerCase();

    if (["مساعدة", "help", "قواعد"].includes(sub)) {
      return message.reply(RULES_TEXT);
    }

    if (["وقف", "ايقاف", "إيقاف", "stop", "الغاء", "إلغاء"].includes(sub)) {
      const game = getGame(threadID);
      if (!game) return message.reply("لا توجد جولة نشطة لإيقافها.");
      deleteGame(threadID);
      return message.reply(
        `🛑 تم إنهاء الجولة.\n` +
        `الكلمة السرية كانت: «${game.secret}»\n` +
        `عدد المحاولات المستخدَمة: ${game.attempts}/${MAX_ATTEMPTS}`
      );
    }

    if (["بدء", "ابدأ", "ابدا", "start", "جديدة"].includes(sub) || !sub) {
      const existing = getGame(threadID);
      if (existing) {
        if (!sub) return message.reply(statusText(existing));
        return message.reply(
          "⚠️ توجد جولة نشطة بالفعل في هذه المجموعة.\n" +
          `المحاولة الحالية: ${existing.attempts}/${MAX_ATTEMPTS}\n` +
          "اكتب: كلمة500 وقف — لإنهائها أولاً إن أردت جولة جديدة."
        );
      }
      if (startingThreads.has(threadID)) {
        return message.reply("⏳ جارٍ اختيار كلمة الجولة الآن، لحظة من فضلك...");
      }
      startingThreads.add(threadID);
      try {
        await startGame(threadID);
      } finally {
        startingThreads.delete(threadID);
      }
      return message.reply(
        "🎮 بدأت الجولة!\n" +
        `كلمة سرية عربية من ${WORD_LENGTH} أحرف — أمامكم ${MAX_ATTEMPTS} محاولات.\n` +
        "اكتب أي كلمة عربية من 5 أحرف مباشرة (بلا أمر) لتخمينها.\n" +
        "اكتب: كلمة500 مساعدة — لمعرفة القواعد كاملة."
      );
    }

    return message.reply(statusText(getGame(threadID)));
  },

  
  // Handle a guess submitted during an active word game.
  onChat: async ({ api, event, message }) => {
    const { threadID, body } = event;
    if (!body?.trim()) return;
    const raw = body.trim();

    
    const normalizedTrigger = normalizeArabic(raw.toLowerCase()).replace(/\s+/g, " ");
    if (["كلمه ابدا", "ابدا كلمه"].includes(normalizedTrigger)) {
      if (getGame(threadID) || startingThreads.has(threadID)) return; 
      startingThreads.add(threadID);
      try {
        await startGame(threadID);
      } finally {
        startingThreads.delete(threadID);
      }
      return message.reply(
        "🎮 بدأت الجولة!\n" +
        `كلمة سرية عربية من ${WORD_LENGTH} أحرف — أمامكم ${MAX_ATTEMPTS} محاولات.\n` +
        "اكتب أي كلمة عربية من 5 أحرف مباشرة لتخمينها."
      );
    }

    
    const game = getGame(threadID);
    if (!game) return;

    
    if (!ARABIC_WORD_RE.test(raw)) return;

    const normalizedGuess = normalizeArabic(raw);

    if (normalizedGuess.length !== WORD_LENGTH) {
      
      return message.reply(`⚠️ يجب أن تكون الكلمة مكوّنة من ${WORD_LENGTH} أحرف بالضبط (محاولتك: ${normalizedGuess.length}).`);
    }

    game.attempts += 1;
    const result = evaluateGuess(game.normalizedSecret, normalizedGuess);
    game.history.push(formatFeedbackLine(game.attempts, raw, result));
    setGame(threadID, game); 

    
    if (result.green === WORD_LENGTH) {
      deleteGame(threadID);
      return message.reply(
        `🎉 إجابة صحيحة! الكلمة كانت «${game.secret}»\n` +
        `تم الحل خلال ${game.attempts}/${MAX_ATTEMPTS} محاولات. 🏆\n\n` +
        "اكتب: كلمة500 بدء — للعب جولة جديدة."
      );
    }

    
    if (game.attempts >= MAX_ATTEMPTS) {
      deleteGame(threadID);
      return message.reply(
        `${formatFeedbackLine(game.attempts, raw, result)}\n\n` +
        `💔 انتهت المحاولات! الكلمة السرية كانت: «${game.secret}»\n` +
        "اكتب: كلمة500 بدء — لجولة جديدة."
      );
    }

    
    return message.reply(
      `${formatFeedbackLine(game.attempts, raw, result)}\n` +
      `(تبقّى ${MAX_ATTEMPTS - game.attempts} محاولات)`
    );
  },
};
