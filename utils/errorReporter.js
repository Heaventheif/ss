"use strict";

/**
 * أداة تجميع وإبلاغ الأخطاء (Error Reporter)
 * ─────────────────────────────────────────────────────────────
 * بدل إرسال نص الخطأ التقني مباشرة للمستخدم عبر فيسبوك (مزعج ويكشف
 * تفاصيل داخلية) أو ابتلاعه بصمت (لا يعرف المطور أن هناك مشكلة):
 *
 *   1. كل خطأ يُطبع فوراً في console (يظهر في Render Logs مباشرة).
 *   2. يُضاف أيضاً لطابور في الذاكرة (بحد أقصى لمنع تراكم غير محدود).
 *   3. كل فترة زمنية محددة (ERROR_REPORT_INTERVAL_MS)، تُجمَّع كل
 *      الأخطاء المتراكمة في تقرير واحد ويُرسَل بريدياً لإيميل المطور
 *      (DEV_ALERT_EMAIL) — إن كانت إعدادات SMTP مضبوطة في env.
 *
 * الإعداد (كله اختياري — بدونه تبقى الأخطاء في console/Render logs فقط):
 *   DEV_ALERT_EMAIL          — إيميل المطور المستلم للتقرير
 *   SMTP_HOST, SMTP_PORT     — خادم SMTP للإرسال
 *   SMTP_USER, SMTP_PASS     — بيانات اعتماد SMTP
 *   SMTP_SECURE              — "true" لاستخدام TLS مباشر (منفذ 465 عادة)
 *   ERROR_REPORT_INTERVAL_MS — الفاصل بين كل تقرير (افتراضياً 30 دقيقة)
 */

const MAX_BUFFER = 200; // سقف أمان: لا يمنع الذاكرة من النمو غير محدود إن تعطّل الإرسال طويلاً
const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;

const _buffer = []; // { time, context, message, stack }
let _transporter = null;
let _transporterInitAttempted = false;

function isEmailConfigured() {
  return !!(process.env.DEV_ALERT_EMAIL && process.env.SMTP_HOST);
}

/** يُنشئ transporter مرة واحدة فقط (كسول — عند أول حاجة فعلية للإرسال) */
async function getTransporter() {
  if (_transporter || _transporterInitAttempted) return _transporter;
  _transporterInitAttempted = true;
  try {
    const nodemailer = (await import("nodemailer")).default;
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587", 10),
      secure: process.env.SMTP_SECURE === "true",
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
    });
  } catch (e) {
    console.warn("[ErrorReporter] ⚠️ فشل تهيئة nodemailer — التقارير ستبقى في console/Render logs فقط:", e.message);
    _transporter = null;
  }
  return _transporter;
}

/**
 * يُسجَّل كل خطأ فوراً في console (Render logs) ويُضاف لطابور التقرير
 * الدوري. هذا هو ما تستدعيه بقية الملفات بدل إرسال الخطأ للمستخدم.
 *
 * @param {string} context - وصف مختصر لمكان الخطأ (مثلاً "command:pinterest")
 * @param {Error|string} err
 */
function report(context, err) {
  const message = err?.message || String(err);
  const stack = err?.stack || "";

  console.error(`[ERROR] [${context}]`, message);

  _buffer.push({ time: new Date().toISOString(), context, message, stack: stack.slice(0, 500) });
  if (_buffer.length > MAX_BUFFER) _buffer.shift(); // نحافظ على الأحدث عند الامتلاء
}

function buildReportText(entries) {
  const lines = [`تقرير أخطاء SunkenBot — ${entries.length} خطأ منذ آخر تقرير`, "═".repeat(40)];
  for (const e of entries) {
    lines.push(`\n[${e.time}] ${e.context}\n${e.message}`);
    if (e.stack) lines.push(e.stack);
  }
  return lines.join("\n");
}

/** يُرسل كل ما تراكم في الطابور كتقرير واحد، ثم يُفرغه — يُستدعى دورياً */
async function flush() {
  if (!_buffer.length) return;

  // لا يوجد إعداد بريد: الأخطاء موجودة فعلاً في console/Render logs،
  // فقط نُفرغ الطابور لمنع تراكمه للأبد بلا فائدة إضافية
  if (!isEmailConfigured()) {
    _buffer.length = 0;
    return;
  }

  const transporter = await getTransporter();
  if (!transporter) { _buffer.length = 0; return; }

  const entries = _buffer.splice(0, _buffer.length); // نأخذ نسخة ونُفرغ الطابور فوراً
  try {
    await transporter.sendMail({
      from: process.env.SMTP_USER || "noreply@sunkenbot.local",
      to: process.env.DEV_ALERT_EMAIL,
      subject: `🐛 SunkenBot — ${entries.length} خطأ جديد`,
      text: buildReportText(entries),
    });
    console.log(`[ErrorReporter] 📧 أُرسل تقرير بـ ${entries.length} خطأ لـ ${process.env.DEV_ALERT_EMAIL}`);
  } catch (e) {
    console.warn("[ErrorReporter] ⚠️ فشل إرسال تقرير الأخطاء بريدياً:", e.message);
    // نعيد الإدخالات للطابور (بحد MAX_BUFFER) بدل فقدانها لمحاولة لاحقة
    _buffer.unshift(...entries.slice(-MAX_BUFFER));
  }
}

// ← الحماية المعتادة ضد التكرار عند reloadCommands()/hot-reload: نضمن
// وجود مؤقّت دوري واحد فقط طوال عمر العملية، بغض النظر عن كم مرة يُعاد
// require لهذا الملف (نفس نمط global.__novelCacheCleanupRegistered).
if (!global.__errorReporterRegistered) {
  global.__errorReporterRegistered = true;
  const intervalMs = parseInt(process.env.ERROR_REPORT_INTERVAL_MS || String(DEFAULT_INTERVAL_MS), 10);
  setInterval(() => { flush().catch(() => {}); }, intervalMs);
}

export { report, flush, isEmailConfigured  };
export default { report, flush, isEmailConfigured };
