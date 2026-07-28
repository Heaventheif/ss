"use strict";

// Get the configured backend base URL, throwing if missing.
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
// Get the configured backend base URL, or null if missing.
function getHfBaseOrNull() {
  try { return getHfBase(); } catch (_) { return null; }
}

// Get the internal auth token used to call the backend.
function getInternalToken() {
  return process.env.INTERNAL_TOKEN || "";
}

export { getHfBase, getHfBaseOrNull, getInternalToken  };
