# 🤖 SunkenBot v2 — منظومة بوت متعددة الاستضافة

<div align="center">

**بوت فيسبوك ماسنجر مدعوم بطبقة API موحّدة من خدمات الذكاء الاصطناعي والوسائط**

![bun](https://img.shields.io/badge/bun-1.3.4-green?logo=bun)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express)
![HuggingFace](https://img.shields.io/badge/HuggingFace-API%20Space-yellow?logo=huggingface)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

</div>

---

## 📋 نظرة عامة على المنظومة

المشروع مكوَّن من **مكوّنين منفصلين يعملان معاً**:

| المكوّن | المستودع | الدور |
|---|---|---|
| **SunkenBot** | `ss` (هذا المستودع) | بوت Userbot يسجّل دخولاً لحساب فيسبوك ويتفاعل داخل المجموعات بالأوامر |
| **Sunken Bot API** | `hf-space` | خادم FastAPI موحَّد على Hugging Face Spaces يقدّم خدمات الذكاء الاصطناعي والوسائط عبر نظام plugins |

```
مستخدم في مجموعة فيسبوك
        │  (gemini, groq, chess, sub, pin, novel2 ...)
        ▼
SunkenBot   (bun Userbot)
        │  HTTP POST + header: X-Internal-Token
        ▼
Sunken Bot API  (Hugging Face Space — FastAPI)
        │
        ├── Groq / Gemini / GPT-4o / Cerebras / HF Inference
        ├── تحميل فيديو فيسبوك، ترجمة فيديو، صور Pinterest، روايات...
        ▼
الرد يعود إلى البوت → يُرسل للمجموعة
```

البوت (هذا المستودع) هو الواجهة التي يتعامل معها المستخدمون مباشرة داخل فيسبوك، بينما **Hugging Face Space** يعمل كـ Backend داخلي يقدّم كل المنطق الثقيل (نماذج AI، كشط الوسائط، إلخ) عبر REST API. الأوامر التي تستدعي هذا الـ API مباشرة هي: `chess`, `fb`, `gemini`, `groq`, `manga2`, `novel2`, `pin`, `song`, `sub` — وكلها تمر عبر نقطة وصول موحّدة واحدة: `utils/hfClient.js`. بقية الأوامر (تحميل يوتيوب، ترجمة نصوص، شطرنج محلي... إلخ) تعمل محلياً داخل هذا المستودع فقط، أو عبر مزوّدين خارجيين مباشرين (Cerebras، GitHub Models، Gemini للـ TTS، RapidAPI...).

> ℹ️ تفاصيل `hf-space` (بنية الـ plugins، الـ middleware، إلخ) موثَّقة في مستودعه الخاص — راجعها هناك مباشرة، فهذا الملف يوثّق فقط ما تم التحقق منه فعلياً في كود هذا المستودع.

---

## 🔑 لا يوجد Prefix حالياً

البوت في إعداده الحالي **لا يتطلب أي بادئة (Prefix)** قبل اسم الأمر — أي أن كتابة اسم الأمر مباشرة (مثل `help` أو `gemini سؤالك`) تكفي لتنفيذه، بشرط ألا تكون مطابقة لكلام عادي غير مقصود. هذا مضبوط عبر `"Prefix": [""]` في `config.json`.

لو أردت لاحقاً فرض بادئة (مثل `!`) لتقليل الردود العرضية على كلام الأصدقاء، غيّر القيمة في `config.json` إلى مصفوفة تحتوي رمزاً غير فارغ، مثل `["!"]` — لكن هذا **يتطلب أيضاً تعديل منطق التوجيه في `index.js`** (قسم Command routing، حول السطر الذي يحلّل `messageText.split(/ +/)`)، فالكود الحالي لا يقرأ `Prefix` من `config.json` في التوجيه الفعلي؛ هذا قرار متعمَّد حالياً بناءً على طلب صاحب المشروع.

---

## 🔐 حماية API الداخلي بـ X-Internal-Token

نظراً لأن Hugging Face Space يُعرَّض كنقطة HTTP عامة، فإن أي شخص يعرف رابط الـ Space يستطيع نظرياً استدعاء الـ endpoints مباشرة دون المرور بالبوت. لإغلاق هذه الثغرة، كل طلب من هذا المستودع إلى `hf-space` يُرفَق تلقائياً بترويسة `X-Internal-Token`.

- **مصدر التوكن من جهة البوت**: متغيّر البيئة `INTERNAL_TOKEN` في `.env`.
- يجب أن تكون القيمة **مطابقة تماماً** لقيمة `INTERNAL_TOKEN` المضبوطة على `hf-space` (كـ Secret في إعداداته)، وإلا سترجع كل الطلبات `401 Unauthorized`.
- **جميع** الأوامر التي تستدعي `hf-space` تمر عبر `utils/hfClient.js` (نقطة واحدة تقرأ `HF_SPACE_URL`/`INTERNAL_TOKEN` من البيئة فقط، بلا أي رابط أو placeholder مكتوب داخل الكود): `commands/chess.js`, `commands/fb.js`, `commands/gemini.js`, `commands/groq.js`, `commands/manga2.js`, `commands/novel2.js`, `commands/pin.js`, `commands/song.js`, `commands/sub.js`.

نمط الإرسال المستخدَم:
```js
const http = require("./utils/fetchHttp"); // بديل axios مبني على fetch الأصلي
const { getHfBase, getInternalToken } = require("./utils/hfClient");
http.post(`${getHfBase()}/endpoint`, payload,
  { headers: { "Content-Type": "application/json", "X-Internal-Token": getInternalToken() } });
```

---

## 🧩 SunkenBot — تفاصيل هذا المستودع

بوت bun يعمل كـ **Userbot** داخل مجموعات فيسبوك ماسنجر، عبر نسخة **مُعدَّلة ومُضمَّنة محلياً (vendored)** من `fca-unofficial` (موجودة في `vendor/fca-unofficial`، وليست تبعية مسحوبة من npm) — نسخة داخلية خاصة معطَّل فيها التحديث التلقائي (`autoUpdate: false` في `fca-config.json`).

> ⚠️ **تذكير**: تسجيل الدخول غير الرسمي يخالف شروط استخدام فيسبوك بحد ذاته — استخدم دائماً حساباً مخصصاً للبوت وليس حسابك الشخصي.

### أبرز حمايات هذه النسخة

- **طابور إرسال منفصل لكل محادثة** (`gatedSend` في `index.js`، بفاصل أدنى 350ms بين كل رسالتين متتاليتين لنفس الـ `threadID`) — بدل طابور عالمي واحد، فلا تنتظر رسالة في محادثة، رسائل محادثات أخرى غير مرتبطة.
- كل استدعاء `api.sendMessage` يمر تلقائياً عبر هذا الطابور (تغليف `api` عبر `wrapApiForSafety`)، حتى لو نسي أمر معيّن استخدامه صراحة.
- **محاكاة سلوك بشري** (`utils/bot-enhancer.js` + `utils/humanizer.js`): تأخير "تفكير" ومؤشر كتابة (Typing Indicator) بمدة تتناسب مع طول الرسالة الواردة والرد قبل الإرسال الفعلي.
- **Cooldown لكل مستخدم ولكل أمر** يُضبط عبر `config.countDown` في كل ملف أمر (افتراضياً 3 ثوانٍ إن لم يُحدَّد).
- **نظام صلاحيات** بـ 5 مستويات: مطوّرين (4) → مميّزين/VIP (3) → مراقبين (2) → مشرفين (1) → الجميع (0)، مضبوط عبر `config.json` (`developers`, `vips`, `moderators`, `admins`).
- ربط `usersData`/`globalData` بـ MongoDB عبر Mongoose (اختياري عبر `MONGO_URI`) — بدونه تعمل البيانات في الذاكرة فقط بلا حفظ دائم؛ الكتابة تتم دفعة واحدة (batch) كل 5 دقائق بدل كل تفاعل لتقليل الضغط على القاعدة.
- **تجديد جلسة الدخول (AppState) تلقائياً كل ساعتين** وحفظها فوراً (انظر قسم الجلسة أدناه).
- **تقرير أخطاء مُجمَّع بالبريد** (`utils/errorReporter.js`): كل خطأ يُطبع في console فوراً (يظهر في سجلات الاستضافة مباشرة)، ويُرسَل أيضاً كتقرير دوري مُجمَّع لبريد المطوّر إن كانت إعدادات SMTP مضبوطة (اختياري بالكامل — بدونه يبقى كل شيء في console فقط).
- **كاش داخلي بـ TTL** (`utils/cache.js`) يقلل تكرار طلبات خارجية مكلفة (بحث يوتيوب، ترجمة نصوص...).
- تنظيف دوري كل 30 دقيقة (ردود منتهية، cooldowns منتهية، طوابير محادثات خاملة، ملفات مؤقتة يتيمة في مجلد النظام المؤقت).

### أبرز الأوامر (حسب الملفات الفعلية في `cmds/`)

| الفئة | أمثلة |
|---|---|
| ذكاء اصطناعي | `gpt` (Cerebras)، `gptx` (GPT-4o عبر GitHub Models)، `groq`، `gemini` (كلاهما عبر `hf-space`) |
| وسائط وتحميل | `yt`، `yt2`، `ydl`، `sc`، `song` (بحث SoundCloud بالاسم + إرسال أول نتيجة كملف صوتي، عبر `hf-space` — جسر فقط، لا مكتبة محلية)، `tts` (Gemini TTS مباشرة)، `pin`، `pinterest`، `random`، `fb` (تحميل فيديو فيسبوك عبر `hf-space`)، `comic`، `sub` (إضافة ترجمة نصية على فيديو عبر `hf-space`) |
| ألعاب ومحتوى | `chess` (عبر `hf-space`)، `novel` (قارئ روايات محلي، 5 مصادر بالتوازي + ترجمة تلقائية)، `novel2` (عبر `hf-space`)، `quran`، `animal` (حقائق قطط/كلاب)، `manga`، `manga2` (عبر `hf-space`) |
| أدوات عامة | `help`، `tr` (ترجمة نصوص، عدة محركات مع fallback)، `uid`، `gid`، `unsend` |
| إدارة (مشرفين) | `kick`، `adduser`، `up` (إعادة تحميل الأوامر Hot-Reload + إحصاءات) |

القائمة الكاملة والتفصيلية لكل أمر تظهر مباشرة عبر أمر `help` داخل البوت نفسه (كل بياناتها تُقرأ تلقائياً من `config` كل ملف أمر — راجع **[`cmds/README.md`](./cmds/README.md)**).

---

## ⚙️ الإعداد والتشغيل

### جلسة الدخول — AppState

جلسة الدخول تُقرأ من **مصدرين ممكنين**، بالترتيب التالي:

1. **ملف `appstate.json`** في جذر المشروع، إن وُجد — له الأولوية دائماً.
2. وإلا: **متغيّر البيئة `APPSTATE`** (أو `APPSTATE_BOT1`)، كنص JSON.

إن لم يوجد أي منهما، يحاول البوت تسجيل الدخول احتياطياً بـ `FB_EMAIL`/`FB_PASSWORD` (ومفتاح `FB_2FA_SECRET` إن كان الحساب يستخدم التحقق بخطوتين، مع توليد رمز TOTP تلقائياً).

**مهم:** بعد أي تسجيل دخول ناجح (سواء بدأ من appstate.json، من `APPSTATE`، أو من Email/Password)، وكذلك عند كل تجديد تلقائي للجلسة (كل ساعتين)، يقوم البوت **بحفظ/الكتابة فوق ملف `appstate.json`** على القرص دائماً (بصلاحيات `0600`)، بغض النظر عن المصدر الأصلي. هذا يعني:
- على استضافة بقرص دائم (مثل Termux أو VPS)، هذا يبقي appstate.json محدَّثاً تلقائياً — مفيد.
- على استضافة بقرص مؤقت/يُعاد تصفيره عند كل نشر (مثل Render)، أفضل الاعتماد على متغيّر `APPSTATE` وتحديثه يدوياً بين الحين والآخر من نسخة appstate.json المحفوظة محلياً إن أردت جلسة تعمل أطول دون الحاجة لإعادة تسجيل الدخول بالإيميل.

### ملف .env

انسخ القائمة التالية إلى ملف باسم `.env` في جذر المشروع (وليس على تخزين مشترك/سحابي) واملأ فقط ما تحتاجه فعلاً:

| المتغيّر | الاستخدام |
|---|---|
| `APPSTATE` / `APPSTATE_BOT1` | جلسة الدخول كنص JSON (تُستخدم فقط إن غاب `appstate.json`) |
| `FB_EMAIL` / `FB_PASSWORD` | دخول احتياطي (فقط إن غاب appstate.json و`APPSTATE` معاً) |
| `FB_2FA_SECRET` | مفتاح التحقق بخطوتين (اختياري، لتوليد رمز TOTP تلقائياً) |
| `MONGO_URI` | قاعدة بيانات دائمة للمستخدمين/globalData عبر Mongoose (موصى بها بشدة) |
| `PORT` | منفذ خادم keep-alive المحلي (افتراضي 10000) |
| `INTERNAL_TOKEN` | يُرفق تلقائياً كـ `X-Internal-Token` عند استدعاء `hf-space` |
| `HF_SPACE_URL` | رابط Hugging Face Space الذي تستدعيه أوامر `chess/fb/gemini/groq/manga2/novel2/pin/song/sub` |
| `GEMINI_API_KEY` / `_2` / `_3` / `_4` | مفاتيح Gemini (تناوب عند نفاد الحصة) — تُستخدم محلياً في `tts.js` فقط (وليس في `gemini.js`، الذي يمر عبر `hf-space`) |
| `CEREBRAS_API_KEY` | مزوّد GPT-OSS عبر Cerebras (يُستخدم داخل `gpt.js`) |
| `GITHUB_MODELS_TOKEN` | GPT-4o عبر GitHub Models (يُستخدم داخل `gptx.js`) |
| `FERDEV_API_KEY` / `2` / `3` | خدمة Ferdev (تناوب عند نفاد الحصة) — تُستخدم في `pinterest.js` |
| `RAPIDAPI_KEY` | يُستخدم في `adduser.js` و `uid.js` |
| `FB_GRAPH_ACCESS_TOKEN` | يُستخدم في `adduser.js` و `uid.js` كطريقة بديلة عبر Graph API |
| `TUMBLR_API_KEY` | محتوى عشوائي من Tumblr (`random`) |
| `RENDER_EXTERNAL_URL` | فقط إن كانت الاستضافة على Render (يفعّل ping دوري للـ keep-alive) |
| `DEV_ALERT_EMAIL` | إيميل المطوّر المستلم لتقارير الأخطاء الدورية (اختياري بالكامل) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` | إعدادات خادم SMTP لإرسال تقارير الأخطاء (لا فائدة منها بدون `DEV_ALERT_EMAIL`) |
| `ERROR_REPORT_INTERVAL_MS` | الفاصل الزمني بين كل تقرير أخطاء بريدي (افتراضياً 30 دقيقة) |
| `FCA_LOG_THEME` | تخصيص شكل سجلات مكتبة `fca-unofficial` المضمَّنة محلياً (اختياري) |

> لم يعد المشروع يستخدم `GIPHY_API_KEY` (كان في نسخة سابقة ولم يعد مُستدعى في أي ملف حالياً).

### التشغيل

```bash
bun install
# اضبط APPSTATE في .env (أو ضع ملف appstate.json في الجذر، أو اضبط FB_EMAIL/FB_PASSWORD كبديل احتياطي)
# املأ .env بالقيم التي تحتاجها فعلاً
bun start           # تشغيل عادي
bun run dev          # مع hot-reload (bun --watch) أثناء التطوير فقط
```

### الاستضافة

يعمل المشروع على أي بيئة تدعم bun، سواء استضافة سحابية (مثل Render — عبر خادم Express داخلي يفتح `PORT` فوراً عند الإقلاع مع مسار `/health` و`/api/health` كـ health check، وضبط متغيرات البيئة من لوحة التحكم) أو استضافة محلية (مثل Termux على أندرويد، باستخدام `tmux` لإبقاء العملية في الخلفية و`termux-wake-lock` لمنع النظام من إيقافها). التفاصيل تعتمد على بيئتك تحديداً.

---

## ➕ إضافة أمر جديد

أنشئ ملفاً جديداً في `cmds/`، مثلاً `cmds/mycommand.js`:

```js
// cmds/mycommand.js
"use strict";

module.exports = {
  config: {
    name: "mycommand",        // إلزامي — اسم الأمر كما يُكتب (لا يوجد Prefix حالياً)
    aliases: ["alias1"],      // اختياري — أسماء بديلة لنفس الأمر
    role: 0,                  // 0 الجميع | 1 مشرف | 2 مراقب | 3 مميّز(VIP) | 4 مطوّر — افتراضي 0
    countDown: 5,             // اختياري — مهلة التبريد بالثواني بين استخدامين لنفس المستخدم — افتراضي 3
    category: "أدوات",        // اختياري — التصنيف الذي يظهر تحته في help
    description: "وصف مختصر لما يفعله الأمر",
    hidden: false,            // اختياري — true لإخفائه عن قائمة help مع بقائه فعّالاً
    usage: [                  // اختياري (لكن موصى به بشدة) — كل طرق استخدام الأمر، تظهر في help <اسم_الأمر>
      "{pn}mycommand <نص> — يرد بنفس النص",
    ],
  },

  // دالة إلزامية بأحد هذه الأسماء بالضبط: onStart (الأكثر استخداماً)، أو run، أو execute
  // لأوامر بلا اسم/شرط استدعاء صريح (تعمل على أي رسالة) استخدم onChat بدلاً من ذلك
  onStart: async ({ api, event, args, message }) => {
    const { threadID, messageID } = event;
    // args = الكلمات بعد اسم الأمر، مثال: "mycommand مرحبا" → args = ["مرحبا"]
    await message.reply("مرحباً! الأمر شغال ✅");
  }
};
```

**القواعد التي يفرضها مُحمِّل الأوامر عند القراءة:**

| العنصر | الإلزامية | الدور |
|---|---|---|
| الملف داخل `cmds/*.js` | إلزامي | يُحمَّل تلقائياً عند تشغيل البوت (وعند `.up` لاحقاً بلا إعادة تشغيل) — لا حاجة لتسجيله يدوياً في `index.js` |
| `module.exports.config.name` | إلزامي | يحدد اسم استدعاء الأمر |
| `module.exports.onStart` (أو `run` / `execute` / `onChat`) | إلزامي | الدالة التي تُنفَّذ عند استدعاء الأمر |
| `aliases` / `role` / `countDown` / `category` / `description` / `usage` / `hidden` | اختياري | تحسّن تجربة `help` وتمنع إساءة الاستخدام، الأمر يعمل بدونها بإعدادات افتراضية (role: 0, countDown: 3) |

**قائمة `help` لا تحتوي أي بيانات مكتوبة يدوياً عن أي أمر بعينه** — كل ما يظهر في `help` و`help <اسم_الأمر>` (الوصف، التصنيف، طرق الاستخدام، البدائل، الكولداون، الصلاحية) يُقرأ تلقائياً من `config` الخاص بملف الأمر نفسه. راجع **[`cmds/README.md`](./cmds/README.md)** للقالب الرسمي الكامل الذي يجب أن يتبعه أي ملف أمر جديد.

- إن احتاج الأمر استدعاء `hf-space`، استورد `getHfBase`/`getInternalToken` من `utils/hfClient.js` وأرفقهما كما في `cmds/groq.js` أو `cmds/gemini.js` (راجع قسم الأمان أعلاه) — لا تكتب رابط `hf-space` أو التوكن مباشرة في ملف الأمر.
- لأي طلب HTTP خارجي، استخدم `utils/fetchHttp.js` بدل axios (المشروع لا يعتمد axios كـ dependency أصلاً) — واجهته متطابقة تقريباً (`http.get`, `http.post`, `http({ method, url, ... })`) فلا حاجة لتعلّم شكل جديد.
- استخدم `api.sendMessage` أو `message.reply` العادية دائماً — التغليف التلقائي في `index.js` يمرّرها عبر طابور الإرسال الآمن (لكل محادثة على حدة) لحماية الحساب من الحظر.
- لتسجيل أي خطأ غير متوقع دون إرسال تفاصيله التقنية للمستخدم، استخدم `require("../utils/errorReporter").report("command:mycommand", err)` بدل `console.error` مباشرة — هذا يضمن ظهوره أيضاً في تقرير الأخطاء البريدي إن كان مفعّلاً.
- **ممنوع إرسال رسائل حالة وسيطة** (مثل "🔍 جاري البحث..."، "⏳ جاري التحميل...") أثناء تنفيذ الأمر. أرسل النتيجة النهائية مباشرة (الملف/النص/الوسائط)، وأرسل رسالة فقط عند فشل حقيقي (مدخل ناقص، لا نتائج، خطأ). هذا يقلل الرسائل المرسلة لكل استخدام ويحافظ على نظافة المحادثة.

---

## 📜 الترخيص

MIT.
