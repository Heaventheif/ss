"use strict";

const MAX_BUFFER = 200; 
const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;

const _buffer = []; 
let _transporter = null;
let _transporterInitAttempted = false;

// Check whether email error-reporting is configured via env vars.
function isEmailConfigured() {
  return !!(process.env.DEV_ALERT_EMAIL && process.env.SMTP_HOST);
}

// Get (or create) the cached nodemailer transporter.
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

// Buffer an error for later reporting, tagged with its context.
function report(context, err) {
  const message = err?.message || String(err);
  const stack = err?.stack || "";

  console.error(`[ERROR] [${context}]`, message);

  _buffer.push({ time: new Date().toISOString(), context, message, stack: stack.slice(0, 500) });
  if (_buffer.length > MAX_BUFFER) _buffer.shift();
}

// Build the plain-text body summarizing buffered error reports.
function buildReportText(entries) {
  const lines = [`تقرير أخطاء SunkenBot — ${entries.length} خطأ منذ آخر تقرير`, "═".repeat(40)];
  for (const e of entries) {
    lines.push(`\n[${e.time}] ${e.context}\n${e.message}`);
    if (e.stack) lines.push(e.stack);
  }
  return lines.join("\n");
}

// Send buffered error reports by email and clear the buffer.
async function flush() {
  if (!_buffer.length) return;

  
  
  if (!isEmailConfigured()) {
    _buffer.length = 0;
    return;
  }

  const transporter = await getTransporter();
  if (!transporter) { _buffer.length = 0; return; }

  const entries = _buffer.splice(0, _buffer.length); 
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
    
    _buffer.unshift(...entries.slice(-MAX_BUFFER));
  }
}

if (!global.__errorReporterRegistered) {
  global.__errorReporterRegistered = true;
  const intervalMs = parseInt(process.env.ERROR_REPORT_INTERVAL_MS || String(DEFAULT_INTERVAL_MS), 10);
  setInterval(() => { flush().catch(() => {}); }, intervalMs);
}

export { report, flush, isEmailConfigured  };
export default { report, flush, isEmailConfigured };
