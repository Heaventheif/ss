"use strict";

/**
 * utils/fetchHttp.js
 *
 * بديل خفيف لـ axios مبني على fetch الأصلي في Node/Bun (بدون أي حزمة خارجية).
 * يحافظ على نفس الشكل المستخدم في كل ملفات cmds/*.js حتى يكون الاستبدال
 * بسيطاً:
 *
 *   axios.get(url, { headers, timeout, params, responseType })
 *   axios.post(url, body, { headers, timeout })
 *   axios({ method, url, headers, data, timeout, responseType })
 *
 * يصبح:
 *
 *   http.get(url, { headers, timeout, params, responseType })
 *   http.post(url, body, { headers, timeout })
 *   http({ method, url, headers, data, timeout, responseType })
 *
 * الإضافات في هذه النسخة (بدون كسر أي استخدام قديم):
 * - baseURL: يمكن ضبطه مرة واحدة عبر http.defaults.baseURL أو تمريره في config
 *   لكل طلب. أي url يبدأ بـ http(s):// يُستخدم كما هو، وأي شيء غير ذلك
 *   (مسار نسبي مثل "/endpoint") يُدمج مع baseURL.
 * - headers افتراضية عامة: http.defaults.headers تُدمج تلقائياً مع headers
 *   كل طلب (تفيد مثلاً لضبط Authorization/X-Internal-Token مرة واحدة).
 * - توحيد أخطاء الشبكة: أي فشل قبل وصول رد من السيرفر (DNS/انقطاع اتصال/رفض
 *   الاتصال...، أي شيء غير AbortError) يُغلَّف الآن بنفس شكل خطأ axios:
 *   err.code, err.message, و err.response = undefined صراحة (بدل أن يكون
 *   undefined ضمناً بدون توضيح)، حتى تقدر تكتب `catch (e) { e.response?.data }`
 *   في كل مكان بثقة سواء كان الخطأ شبكة أو status سيء.
 * - retry اختياري: config.retries (افتراضي 0) و config.retryDelay بالمللي
 *   ثانية (افتراضي 300). يعيد المحاولة فقط على أخطاء الشبكة أو timeout أو
 *   status >= 500 — لا يعيد المحاولة على أخطاء 4xx لأنها غالباً خطأ في
 *   الطلب نفسه مش مؤقتة.
 * - interceptors بسيطة اختيارية: http.interceptors.request/response كمصفوفة
 *   دوال، لو احتجتها لاحقاً (منطق عام قبل/بعد كل طلب)، وإلا تجاهلها تماماً.
 *
 * ملاحظات:
 * - fetch الأصلي (undici في Node، وكذلك في Bun) يدير keep-alive/pooling
 *   داخلياً تلقائياً، فلا حاجة لتمرير httpsAgent يدوياً كما كان في axios.
 * - عند فشل الحالة (status خارج نطاق النجاح) يُرمى خطأ يحمل نفس شكل خطأ
 *   axios تقريباً: err.response.status / err.response.data / err.message
 *   حتى لا تحتاج كتل catch في الملفات لأي تعديل.
 */

import { Readable  } from "stream";

const defaults = {
  baseURL: "",
  headers: {},
};

const interceptors = {
  request: [], // (config) => config | Promise<config>
  response: [], // (response) => response | Promise<response>
};

function buildUrl(url, params, baseURL) {
  const isAbsolute = /^https?:\/\//i.test(url);
  let finalUrl = url;

  if (!isAbsolute && baseURL) {
    finalUrl = baseURL.replace(/\/+$/, "") + "/" + String(url).replace(/^\/+/, "");
  }

  if (!params) return finalUrl;

  // ملاحظة: نبني الـ query string يدوياً بدل new URL(finalUrl) لأن الأخير
  // يرمي TypeError("Invalid URL") إن كان finalUrl مساراً نسبياً بلا baseURL
  // مضبوط (حالة لا تحدث حالياً في أي استخدام فعلي بالمشروع، لكنها كانت
  // ستُعطّل أي استدعاء مستقبلي بشكل صامت غير متوقَّع لولا هذا التعديل).
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const v of value) qs.append(key, v);
    } else {
      qs.set(key, String(value));
    }
  }
  const queryString = qs.toString();
  if (!queryString) return finalUrl;
  return finalUrl + (finalUrl.includes("?") ? "&" : "?") + queryString;
}

function defaultValidateStatus(status) {
  return status >= 200 && status < 300;
}

function wrapNetworkError(e, timeout) {
  if (e.name === "AbortError") {
    const err = new Error(`timeout of ${timeout}ms exceeded`);
    err.code = "ECONNABORTED";
    err.response = undefined;
    return err;
  }
  // أي خطأ شبكة آخر (DNS فشل، رفض اتصال، انقطاع مفاجئ...)
  const err = new Error(e.message || "Network Error");
  err.code = e.cause?.code || e.code || "ENETWORK";
  err.cause = e.cause || e;
  err.response = undefined;
  return err;
}

function isRetryable(err) {
  if (err.code === "ECONNABORTED" || err.code === "ENETWORK") return true;
  if (err.response && err.response.status >= 500) return true;
  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function performRequest(config) {
  const {
    url,
    method = "GET",
    headers = {},
    params,
    data,
    timeout = 0,
    responseType = "json", // 'json' | 'text' | 'arraybuffer' | 'stream'
    validateStatus = defaultValidateStatus,
    baseURL = defaults.baseURL,
  } = config;

  if (!url) throw new Error("fetchHttp: 'url' مطلوب");

  const finalUrl = buildUrl(url, params, baseURL);
  const finalHeaders = { ...defaults.headers, ...headers };

  let body;
  const upper = method.toUpperCase();
  if (data !== undefined && upper !== "GET" && upper !== "HEAD") {
    const isPlainObject =
      data !== null &&
      typeof data === "object" &&
      !(data instanceof Buffer) &&
      !(data instanceof URLSearchParams) &&
      !(typeof FormData !== "undefined" && data instanceof FormData) &&
      !(data instanceof ArrayBuffer) &&
      !ArrayBuffer.isView(data);

    if (isPlainObject) {
      body = JSON.stringify(data);
      if (!Object.keys(finalHeaders).some((h) => h.toLowerCase() === "content-type")) {
        finalHeaders["Content-Type"] = "application/json";
      }
    } else {
      body = data;
    }
  }

  const controller = timeout ? new AbortController() : null;
  const timer = timeout ? setTimeout(() => controller.abort(), timeout) : null;

  let res;
  try {
    res = await fetch(finalUrl, {
      method: upper,
      headers: finalHeaders,
      body,
      signal: controller ? controller.signal : undefined,
    });
  } catch (e) {
    if (timer) clearTimeout(timer);
    throw wrapNetworkError(e, timeout);
  }
  if (timer) clearTimeout(timer);

  const status = res.status;
  const statusText = res.statusText;
  const resHeaders = Object.fromEntries(res.headers.entries());

  if (!validateStatus(status)) {
    let errData;
    try {
      const text = await res.text();
      try {
        errData = text ? JSON.parse(text) : undefined;
      } catch (_) {
        errData = text;
      }
    } catch (_) {
      errData = undefined;
    }
    const err = new Error(`Request failed with status code ${status}`);
    err.code = `ERR_BAD_STATUS_${status}`;
    err.response = { status, statusText, headers: resHeaders, data: errData };
    throw err;
  }

  let responseData;
  if (responseType === "arraybuffer") {
    responseData = Buffer.from(await res.arrayBuffer());
  } else if (responseType === "stream") {
    responseData = Readable.fromWeb(res.body);
  } else if (responseType === "text") {
    responseData = await res.text();
  } else {
    const text = await res.text();
    if (!text) {
      responseData = null;
    } else {
      try {
        responseData = JSON.parse(text);
      } catch (_) {
        responseData = text;
      }
    }
  }

  return { data: responseData, status, statusText, headers: resHeaders };
}

async function request(config = {}) {
  let finalConfig = config;
  for (const fn of interceptors.request) {
    finalConfig = (await fn(finalConfig)) || finalConfig;
  }

  const retries = finalConfig.retries ?? 0;
  const retryDelay = finalConfig.retryDelay ?? 300;

  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      let res = await performRequest(finalConfig);
      for (const fn of interceptors.response) {
        res = (await fn(res)) || res;
      }
      return res;
    } catch (err) {
      if (attempt < retries && isRetryable(err)) {
        attempt++;
        await sleep(retryDelay * attempt);
        continue;
      }
      throw err;
    }
  }
}

function get(url, config = {}) {
  return request({ ...config, url, method: "GET" });
}

function post(url, data, config = {}) {
  return request({ ...config, url, method: "POST", data });
}

function put(url, data, config = {}) {
  return request({ ...config, url, method: "PUT", data });
}

function del(url, config = {}) {
  return request({ ...config, url, method: "DELETE" });
}

export default Object.assign(request, {
  get,
  post,
  put,
  delete: del,
  request,
  defaults,
  interceptors,
});
