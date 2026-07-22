import http from "../utils/fetchHttp";

// ═══════════════════════════════════════════════════════════════
// فهرسة السور الـ 114 كاملة: [الاسم القياسي, أسماء بديلة اختيارية]
// الفهرس (index) في المصفوفة = رقم السورة - 1
// ═══════════════════════════════════════════════════════════════
const SURAHS = [
  ["الفاتحة"],
  ["البقرة"],
  ["آل عمران", "ال عمران"],
  ["النساء"],
  ["المائدة"],
  ["الأنعام", "الانعام"],
  ["الأعراف", "الاعراف"],
  ["الأنفال", "الانفال"],
  ["التوبة", "براءة"],
  ["يونس"],
  ["هود"],
  ["يوسف"],
  ["الرعد"],
  ["إبراهيم", "ابراهيم"],
  ["الحجر"],
  ["النحل"],
  ["الإسراء", "الاسراء", "بني إسرائيل"],
  ["الكهف"],
  ["مريم"],
  ["طه"],
  ["الأنبياء", "الانبياء"],
  ["الحج"],
  ["المؤمنون", "المومنون"],
  ["النور"],
  ["الفرقان"],
  ["الشعراء"],
  ["النمل"],
  ["القصص"],
  ["العنكبوت"],
  ["الروم"],
  ["لقمان"],
  ["السجدة"],
  ["الأحزاب", "الاحزاب"],
  ["سبأ", "سبا"],
  ["فاطر"],
  ["يس"],
  ["الصافات"],
  ["ص"],
  ["الزمر"],
  ["غافر"],
  ["فصلت"],
  ["الشورى"],
  ["الزخرف"],
  ["الدخان"],
  ["الجاثية"],
  ["الأحقاف", "الاحقاف"],
  ["محمد"],
  ["الفتح"],
  ["الحجرات"],
  ["ق"],
  ["الذاريات"],
  ["الطور"],
  ["النجم"],
  ["القمر"],
  ["الرحمن"],
  ["الواقعة"],
  ["الحديد"],
  ["المجادلة"],
  ["الحشر"],
  ["الممتحنة"],
  ["الصف"],
  ["الجمعة"],
  ["المنافقون"],
  ["التغابن"],
  ["الطلاق"],
  ["التحريم"],
  ["الملك"],
  ["القلم"],
  ["الحاقة"],
  ["المعارج"],
  ["نوح"],
  ["الجن"],
  ["المزمل"],
  ["المدثر"],
  ["القيامة"],
  ["الإنسان", "الانسان", "الدهر"],
  ["المرسلات"],
  ["النبأ", "النبا"],
  ["النازعات"],
  ["عبس"],
  ["التكوير"],
  ["الانفطار"],
  ["المطففين"],
  ["الانشقاق"],
  ["البروج"],
  ["الطارق"],
  ["الأعلى", "الاعلى"],
  ["الغاشية"],
  ["الفجر"],
  ["البلد"],
  ["الشمس"],
  ["الليل"],
  ["الضحى"],
  ["الشرح", "الانشراح"],
  ["التين"],
  ["العلق"],
  ["القدر"],
  ["البينة"],
  ["الزلزلة"],
  ["العاديات"],
  ["القارعة"],
  ["التكاثر"],
  ["العصر"],
  ["الهمزة"],
  ["الفيل"],
  ["قريش"],
  ["الماعون"],
  ["الكوثر"],
  ["الكافرون"],
  ["النصر"],
  ["المسد", "اللهب"],
  ["الإخلاص", "الاخلاص"],
  ["الفلق"],
  ["الناس"],
];

/**
 * يطبّع نصاً عربياً للمقارنة: يحذف التشكيل، يوحّد أشكال الألف والهمزات،
 * ويحذف المسافات الزائدة — لتسهيل مطابقة اسم السورة كما يكتبه المستخدم.
 */
function normalizeArabic(text) {
  return text
    .replace(/[\u064B-\u0652\u0670\u0640]/g, "") // تشكيل + تطويل
    .replace(/[أإآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

// بناء فهرس بحث سريع: (اسم مُطبَّع) → رقم السورة (1-114)
const SURAH_NAME_INDEX = new Map();
SURAHS.forEach((names, i) => {
  const surahNumber = i + 1;
  for (const name of names) {
    SURAH_NAME_INDEX.set(normalizeArabic(name), surahNumber);
    // نسمح أيضاً بالمطابقة بدون "ال" التعريف في البداية (مثلاً "كهف" بدل "الكهف")
    const normalized = normalizeArabic(name);
    if (normalized.startsWith("ال")) {
      SURAH_NAME_INDEX.set(normalized.slice(2), surahNumber);
    }
  }
});

/**
 * يحاول تحويل نص (اسم سورة أو رقمها) إلى رقم سورة صالح (1-114).
 * يعيد null إن تعذّرت المطابقة.
 */
function resolveSurahNumber(raw) {
  const trimmed = raw.trim();

  // دعم الرقم مباشرة للتوافق مع الاستخدام القديم (quran 18 1-14)
  if (/^\d+$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    return n >= 1 && n <= 114 ? n : null;
  }

  return SURAH_NAME_INDEX.get(normalizeArabic(trimmed)) ?? null;
}

const MAX_MESSAGE_LENGTH = 10000; // الحد الأقصى لطول الرسالة الواحدة قبل التقسيم

/**
 * يقسّم مصفوفة من "كتل الآيات" النصية إلى رسائل، كل رسالة لا تتجاوز
 * MAX_MESSAGE_LENGTH حرفاً، دون تقسيم أي كتلة آية واحدة في منتصفها.
 */
function splitIntoMessages(header, blocks) {
  const messages = [];
  let current = header;

  for (const block of blocks) {
    // +1 لحساب سطر فاصل بين الكتل
    if (current.length + block.length + 1 > MAX_MESSAGE_LENGTH) {
      messages.push(current.trimEnd());
      current = ""; // الرسائل التالية بدون إعادة الهيدر لتفادي التكرار الزائد
    }
    current += block;
  }
  if (current.trim()) messages.push(current.trimEnd());

  return messages;
}

export default {
  config: {
    name: "quran",
    aliases: ["قران"],
    version: "3.0.0",
    author: "Shadow Garden",
    countDown: 5,
    role: 0,
    nonPrefix: true,
    category: "أدوات",
    description: "جلب آيات قرآنية مع تفسيرها الميسر باستخدام اسم السورة",
    usage: [
      "{pn}قران <اسم السورة> <رقم الآية> — مثال: {pn}قران البقرة 255",
      "{pn}قران <اسم السورة> <من-إلى> — مثال: {pn}قران الكهف 1-14",
      "{pn}قران <رقم السورة> <رقم/نطاق الآية> — الصيغة الرقمية القديمة لا تزال مدعومة",
    ],
  },

  onStart: async function ({ api, event, args, message }) {
    const { threadID, messageID } = event;
    const input = args.join(" ").trim();

    const usageText =
      "📖 **أمر القرآن والتفسير**\n\n" +
      "🔍 الاستخدام:\n" +
      "  quran <اسم السورة> <رقم الآية>\n" +
      "  quran <اسم السورة> <من-إلى>\n\n" +
      "💡 أمثلة:\n" +
      "  quran البقرة 255 (آية الكرسي)\n" +
      "  quran الفاتحة 1\n" +
      "  quran الكهف 1-14\n" +
      "  quran الناس 1-6\n\n" +
      "📊 عدد السور: 114 (يمكن كتابة الاسم بأو بدون \"ال\" التعريف)";

    if (!input) {
      return message.reply(usageText);
    }

    // --- تحليل المدخل: كل ما قبل آخر كلمة = اسم/رقم السورة، آخر كلمة = رقم الآية أو نطاقها ---
    const parts = input.split(/\s+/);
    const lastToken = parts[parts.length - 1];
    const rangeMatch = lastToken.match(/^(\d+)(?:-(\d+))?$/);

    if (!rangeMatch || parts.length < 2) {
      return message.reply(
        "⚠️ **الصيغة خاطئة!**\n\n" +
        "📝 الاستخدام الصحيح:\n" +
        "  quran <اسم السورة> <رقم الآية أو من-إلى>\n\n" +
        "💡 أمثلة:\n" +
        "  quran البقرة 255\n" +
        "  quran الكهف 1-14"
      );
    }

    const surahRaw = parts.slice(0, -1).join(" ");
    const surahNum = resolveSurahNumber(surahRaw);

    if (!surahNum) {
      return message.reply(
        `❌ لم أتعرف على اسم السورة "${surahRaw}".\n` +
        "💡 تأكد من كتابة الاسم بشكل صحيح (مثال: الكهف، البقرة، يس)، أو استخدم رقم السورة (1-114)."
      );
    }

    let startAyah = parseInt(rangeMatch[1], 10);
    let endAyah = rangeMatch[2] ? parseInt(rangeMatch[2], 10) : startAyah;

    if (startAyah < 1) {
      return message.reply("❌ رقم الآية يجب أن يكون أكبر من 0");
    }
    if (endAyah < startAyah) {
      return message.reply("❌ نهاية النطاق يجب أن تكون بعد بدايته (مثال: 1-14 وليس 14-1)");
    }

    try {
      // نجلب السورة كاملة (كلا الطبعتين) بطلب واحد، ثم نقصّ النطاق المطلوب محلياً —
      // أخفّ وأسرع من طلب كل آية على حدة عند وجود نطاق طويل.
      const apiUrl = `https://api.alquran.cloud/v1/surah/${surahNum}/editions/quran-uthmani,ar.muyassar`;

      console.log(`[QURAN] 📖 السورة ${surahNum} - الآيات ${startAyah}-${endAyah}`);

      const response = await http.get(apiUrl, {
        timeout: 15000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!response.data || response.data.code !== 200 || !Array.isArray(response.data.data) || response.data.data.length < 2) {
        throw new Error("استجابة غير صالحة من الخادم");
      }

      const [ayahEdition, tafsirEdition] = response.data.data;
      const ayahs = ayahEdition?.ayahs;
      const tafsirAyahs = tafsirEdition?.ayahs;

      if (!Array.isArray(ayahs) || !Array.isArray(tafsirAyahs)) {
        throw new Error("بيانات غير مكتملة من الخادم");
      }

      const totalAyahs = ayahs.length;
      if (startAyah > totalAyahs) {
        throw new Error(`سورة ${ayahEdition.name} تحتوي ${totalAyahs} آية فقط`);
      }
      // نُقيّد النهاية بعدد آيات السورة الفعلي بدل رفض الطلب بالكامل
      endAyah = Math.min(endAyah, totalAyahs);

      const surahName = ayahEdition.name || "غير معروف";
      const surahEnglishName = ayahEdition.englishName || "";
      const revelationType = ayahEdition.revelationType === "Meccan" ? "مكية 🕋" : "مدنية 🕌";

      const rangeLabel = startAyah === endAyah ? `الآية ${startAyah}` : `الآيات ${startAyah}-${endAyah}`;

      const header =
        `✨ **﴿ ${surahName} - ${rangeLabel} ﴾** \n` +
        `━─━─━─「◽」─━─━─━\n` +
        `🕌 السورة: ${surahName} (${surahEnglishName}) | ${revelationType}\n` +
        `━─━─━─「◽」─━─━─━\n\n`;

      // --- بناء كتلة نصية مستقلة لكل آية (نص + تفسير) ---
      const blocks = [];
      for (let n = startAyah; n <= endAyah; n++) {
        const ayahText = ayahs[n - 1]?.text || "";
        const tafsirText = tafsirAyahs[n - 1]?.text || "تعذر جلب التفسير الميسر لهذه الآية.";

        blocks.push(
          `۝ **الآية ${n}:**\n` +
          `« ${ayahText} »\n` +
          `📖 التفسير: ${tafsirText}\n\n`
        );
      }

      // --- تقسيم النتيجة إلى عدة رسائل إن تجاوز طولها الحد المسموح ---
      const messages = splitIntoMessages(header, blocks);
      const multiPart = messages.length > 1;

      for (let i = 0; i < messages.length; i++) {
        const partLabel = multiPart ? `\n\n(الجزء ${i + 1}/${messages.length})` : "";
        await global.safeSend(api, messages[i] + partLabel, threadID, null, messageID);
        // فاصل بسيط بين الرسائل المتعددة لتفادي إرسالها دفعة واحدة بشكل مربك
        if (i < messages.length - 1) {
          await new Promise((r) => setTimeout(r, 600));
        }
      }

      console.log(`[QURAN] ✅ تم إرسال: ${surahName} - ${rangeLabel} (${messages.length} رسالة)`);

    } catch (error) {
      console.error(`[QURAN] ❌ خطأ:`, {
        message: error.message,
        code: error.code,
        status: error.response?.status,
      });

      let errorMsg = "حدث خطأ أثناء جلب الآيات";

      if (error.response?.status === 404) {
        errorMsg = `❌ لم يتم العثور على السورة أو الآيات المطلوبة.`;
      } else if (error.code === "ECONNABORTED") {
        errorMsg = "⏱️ انتهت مهلة الاتصال بالخادم";
      } else if (error.code === "ENOTFOUND") {
        errorMsg = "🌐 لا يوجد اتصال بالإنترنت";
      } else if (error.message) {
        errorMsg = `❌ ${error.message.substring(0, 150)}`;
      }

      await message.reply(errorMsg);
    }
  },
};
