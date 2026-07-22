"use strict";
// ════════════════════════════════════════════════════════════════
//  cmds/help.js
//  ─────────────────────────────────────────────────────────────
//  هذا الملف لا يحتوي على أي بيانات خاصة بأمر معيّن (لا وصف، لا
//  تصنيف، لا طرق استخدام). كل هذه المعلومات تُقرأ حصراً من داخل
//  config الخاص بكل ملف أمر — وتُبنى محلياً هنا (buildCommandMeta)
//  بلا أي اعتماد على ملف خارجي، فلا حاجة لـ utils/commandMeta.js.
//
//  لإضافة أمر جديد وجعله يظهر بشكل صحيح هنا، راجع القالب الموثّق
//  في: cmds/README.md
//
//  الشيء الوحيد المسموح تعديله هنا يدوياً هو CATEGORY_SECTIONS:
//  وهو فقط ترتيب/تسمية "الأقسام" المعروضة في القائمة الرئيسية
//  (مجرد عرض/تجميع)، وليس بيانات عن أي أمر بعينه.
// ════════════════════════════════════════════════════════════════

// ⚠️ يجب أن تطابق هذه الأرقام بالضبط ترقيم global.getUserRole في index.js
// (dev=4, adm=3, mod=2, vip=1, user=0). أي تعديل على ترتيب الأدوار هناك
// يجب أن يُطبَّق هنا أيضاً وإلا ستعرض .help تسمية صلاحية خاطئة (مضلِّلة
// وليست خطأ أمنياً بحد ذاتها — الفحص الفعلي للصلاحية يبقى صحيحاً، لكن
// المستخدم/المطوّر سيرى اسم رتبة غير مطابق لما يُطبَّق فعلياً).
const ROLE_NAMES = {
  0: "الجميع",
  1: "المميزون",
  2: "المراقبون",
  3: "المشرفون",
  4: "المطورون",
};
function roleName(role) {
  return ROLE_NAMES[role] ?? "غير محدد";
}

// البادئة الفعلية المستخدمة في البوت فارغة (بدون أي رمز مثل +)، لذا
// لا نعرض أي بادئة في الأمثلة/الاستخدام — نستبدل {pn} بلا شيء.
const DISPLAY_PREFIX = "";
function applyPrefixPlaceholder(str) {
  return String(str).replace(/\{pn\}/g, DISPLAY_PREFIX);
}

// ── اختيار اسم الاستدعاء المعروض للأمر: نفضّل دائماً اسماً عربياً ──
// (أول alias يحتوي على حروف عربية). إن لم يوجد أي alias عربي، نُبقي
// الاسم الأصلي (name) كحل أخير فقط.
const ARABIC_RE = /[\u0600-\u06FF]/;
function pickDisplayName(name, aliases) {
  const arabicAlias = (aliases || []).find(a => ARABIC_RE.test(a));
  return arabicAlias || name;
}

function extractUsage(cfg) {
  if (Array.isArray(cfg.usage) && cfg.usage.length) {
    return cfg.usage.map(applyPrefixPlaceholder);
  }
  if (typeof cfg.usage === "string" && cfg.usage.trim()) {
    return cfg.usage
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean)
      .map(applyPrefixPlaceholder);
  }
  return [];
}

function extractDescription(cfg) {
  return cfg.description || "⚠️ لا يوجد وصف";
}

// يستبدل كل ظهور للاسم التقني الإنجليزي للأمر (ككلمة كاملة) داخل نص
// الاستخدام باسمه العربي المعروض، حتى تظهر الأمثلة بالعربي فقط.
function replaceNameWithDisplay(text, rawName, displayName) {
  if (!rawName || rawName === displayName) return text;
  const re = new RegExp(`\\b${rawName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
  return text.replace(re, displayName);
}

/**
 * يبني كائن meta موحّداً لأمر واحد اعتماداً على config الخاص به فقط.
 * @param {object} mod - وحدة الأمر كاملة (require شدة الملف)
 * @returns {object|null}
 */
function buildCommandMeta(mod) {
  const cfg = mod?.config;
  if (!cfg?.name) return null;

  const name = String(cfg.name).toLowerCase();
  const aliases = cfg.aliases || [];
  return {
    name,
    displayName: pickDisplayName(name, aliases),
    aliases,
    category: (cfg.category || "غير مصنف").trim(),
    description: extractDescription(cfg),
    usage: extractUsage(cfg).map(u => replaceNameWithDisplay(u, name, pickDisplayName(name, aliases))),
    role: cfg.role ?? 0,
    roleLabel: roleName(cfg.role ?? 0),
    countDown: cfg.countDown ?? 3,
    hidden: cfg.hidden === true,
  };
}

// ── ترتيب وتسمية الأقسام في القائمة الرئيسية ────────────────────
// المفتاح = العنوان المعروض. القيمة = كل قيم "category" (من ملفات
// الأوامر نفسها) التي تندرج تحت هذا القسم. لا تحتاج لتعديل هذا إلا
// عند إضافة تصنيف (category) جديد كلياً غير موجود من قبل.
const CATEGORY_SECTIONS = {
  "الذكاء الاصطناعي": ["ذكاء اصطناعي", "gemini", "gptx", "groq", "gpt"],
  "الوسائط والتحميل": [
    "media", "وسائط", "download",
    "yt", "ydl", "yt2", "sc", "sing", "tts", "pinterest", "random",
  ],
  "المانجا والروايات": ["مانجا", "manga", "novel"],
  "الألعاب والترفيه": ["games", "fun", "chess", "animal"],
  "الإدارة والإشراف": ["admin", "إشراف", "إدارة", "kick", "adduser", "up"],
  "الأدوات العامة": ["أدوات", "tools", "help", "tr", "gid", "uid", "quran", "unsend"],
};

export default {
  config: {
    name: "help",
    aliases: ["مساعدة"],
    version: "6.0",
    role: 0,
    countDown: 3,
    category: "أدوات",
    description: "عرض قائمة جميع الأوامر مصنفة، أو تفاصيل أمر محدد",
    usage: [
      "مساعدة — قائمة الأوامر مصنفة حسب القسم",
      "مساعدة <اسم_الأمر> — شرح كامل لطريقة استخدام أمر معيّن",
      "مساعدة الكل — قائمة مسطّحة بكل الأوامر",
    ],
    hidden: true, // القائمة لا تُدرج نفسها ضمن نفسها
  },

  onStart: async ({ api, event, args }) => {
    const { threadID, messageID } = event;

    // ── بناء meta لكل أمر مباشرة من global.commands + global.eventCommands ──
    // (المصدر الوحيد — بلا إعادة قراءة للمجلد هنا): global.commands يغطي
    // الأوامر العادية (onStart/run/execute)، وglobal.eventCommands يغطي
    // الأوامر بلا بادئة التي تُفعَّل عبر onChat (مثل sing.js). نبني Map
    // ثانوية للفهرسة باسم الأمر الأساسي فقط (مرة واحدة، بلا تكرار aliases).
    const registry = new Map();
    const allMods = [...global.commands.values(), ...(global.eventCommands || [])];
    for (const mod of allMods) {
      const meta = buildCommandMeta(mod);
      if (!meta) continue;
      if (!registry.has(meta.name)) registry.set(meta.name, meta);
    }

    // ── تفاصيل أمر محدد: help <command> ──────────────────────────
    if (args.length > 0 && args[0].toLowerCase() !== "all" && args[0] !== "الكل") {
      const query = args[0].toLowerCase();
      // ابحث بالاسم الأساسي أولاً، ثم بأي alias
      let cmd = registry.get(query);
      if (!cmd) {
        for (const c of registry.values()) {
          if (
            c.displayName.toLowerCase() === query ||
            c.aliases.map(a => a.toLowerCase()).includes(query)
          ) { cmd = c; break; }
        }
      }
      if (!cmd) {
        return global.safeSend(api, `❌ الأمر "${query}" غير موجود`, threadID, null, messageID);
      }
      return global.safeSend(api, formatCommandDetail(cmd), threadID, null, messageID);
    }

    // ── قائمة مسطّحة: help all ───────────────────────────────────
    if (args[0]?.toLowerCase() === "all" || args[0] === "الكل") {
      const names = [...registry.values()]
        .filter(c => !c.hidden)
        .map(c => c.displayName)
        .sort();
      let msg = `📋 جميع الأوامر (${names.length}):\n━━━━━━━━━━━━━━━━━━━━\n`;
      names.forEach((n, i) => { msg += `${i + 1}. ${n}\n`; });
      return global.safeSend(api, msg, threadID, null, messageID);
    }

    // ── القائمة الرئيسية المصنفة ─────────────────────────────────
    return global.safeSend(api, formatMainList(registry), threadID, null, messageID);
  },
};

// ── تنسيق تفاصيل أمر واحد (مطابق لصيغة "sub. :الأمر" الأصلية) ─────
function formatCommandDetail(cmd) {
  const LINE = "━━━━━━━━━━━━━━━━━━━━";
  let info =
    `📌 الأمر: ${cmd.displayName}\n${LINE}\n` +
    `📂 التصنيف : ${cmd.category}\n` +
    `📝 الوصف   : ${cmd.description}\n`;

  if (cmd.usage.length) {
    info += `🧭 طريقة الاستخدام :\n` + cmd.usage.map(u => `  • ${u}`).join("\n") + "\n";
  }
  // نعرض بقية البدائل (عدا الاسم المعروض نفسه، وعدا الاسم التقني الأصلي)
  const otherAliases = [cmd.name, ...cmd.aliases]
    .filter(a => a.toLowerCase() !== cmd.displayName.toLowerCase());
  if (otherAliases.length) {
    info += `🔗 البدائل  : ${otherAliases.join(" | ")}\n`;
  }
  info +=
    `⏱ كولداون  : ${cmd.countDown} ثانية\n` +
    `🔐 الصلاحية: ${cmd.roleLabel}`;

  return info;
}

// ── تنسيق القائمة الرئيسية المصنفة ────────────────────────────────
function formatMainList(registry) {
  const visible = [...registry.values()].filter(c => !c.hidden);
  const LINE = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

  let message = `${LINE}\n   قائمة الأوامر  (${visible.length} أمر)\n${LINE}`;

  const used = new Set();

  for (const [sectionTitle, items] of Object.entries(CATEGORY_SECTIONS)) {
    const present = [];
    for (const item of items) {
      const key = item.toLowerCase();
      const byName = registry.get(key);
      if (byName && !byName.hidden && !used.has(byName.name)) {
        present.push(byName);
        continue;
      }
      for (const cmd of visible) {
        if (cmd.category.toLowerCase() === key && !used.has(cmd.name)) present.push(cmd);
      }
    }
    if (!present.length) continue;

    message += `\n\n  ${sectionTitle}\n${LINE}\n`;
    for (const cmd of present) {
      if (used.has(cmd.name)) continue;
      message += ` ${cmd.displayName} — ${cmd.description}\n`;
      used.add(cmd.name);
    }
  }

  // ── أوامر لم تُدرج ضمن أي قسم في CATEGORY_SECTIONS ──────────────
  // هذا يعني أن قيمة category في ملف الأمر لا تطابق أي قسم معروف —
  // لا يُسقط الأمر، فقط يُعرض تحت "أوامر أخرى" مع تحذير في console
  // ليلاحظ المطوّر الأمر بسرعة (خطأ إملائي محتمل في category).
  const other = visible.filter(c => !used.has(c.name));
  if (other.length) {
    message += `\n\n  أوامر أخرى\n${LINE}\n`;
    for (const cmd of other) {
      message += ` ${cmd.displayName} — ${cmd.description}\n`;
      console.warn(`[help] الأمر '${cmd.name}' لم يُطابق أي قسم في CATEGORY_SECTIONS (category الحالية: "${cmd.category}").`);
    }
  }

  const selfName = pickDisplayName("help", ["مساعدة", "الاوامر"]);
  message +=
    `\n${LINE}\n` +
    `  ${selfName} <أمر>  ←  تفاصيل وطرق استخدام الأمر\n` +
    `  ${selfName} الكل   ←  القائمة البسيطة\n` +
    `${LINE}`;

  return message;
}
