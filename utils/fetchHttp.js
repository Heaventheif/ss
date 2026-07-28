"use strict";

import { Readable  } from "stream";

const defaults = {
  baseURL: "",
  headers: {},
};

const interceptors = {
  request: [],
  response: [],
};

// Build the final request URL, merging baseURL and query params.
function buildUrl(url, params, baseURL) {
  const isAbsolute = /^https?:\/\//i.test(url);
  let finalUrl = url;

  if (!isAbsolute && baseURL) {
    finalUrl = baseURL.replace(/\/+$/, "") + "/" + String(url).replace(/^\/+/, "");
  }

  if (!params) return finalUrl;

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

// Default success check: HTTP status in the 2xx range.
function defaultValidateStatus(status) {
  return status >= 200 && status < 300;
}

// Wrap a low-level fetch/network error into an axios-like error shape.
function wrapNetworkError(e, timeout) {
  if (e.name === "AbortError") {
    const err = new Error(`timeout of ${timeout}ms exceeded`);
    err.code = "ECONNABORTED";
    err.response = undefined;
    return err;
  }
  const err = new Error(e.message || "Network Error");
  err.code = e.cause?.code || e.code || "ENETWORK";
  err.cause = e.cause || e;
  err.response = undefined;
  return err;
}

// Decide whether a failed request is worth retrying.
function isRetryable(err) {
  if (err.code === "ECONNABORTED" || err.code === "ENETWORK") return true;
  if (err.response && err.response.status >= 500) return true;
  return false;
}

// Wait for a given number of milliseconds.
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Perform a single HTTP request using native fetch, axios-style.
async function performRequest(config) {
  const {
    url,
    method = "GET",
    headers = {},
    params,
    data,
    timeout = 0,
    responseType = "json",
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

// Run a request through interceptors and retry logic.
async function request(config = {}) {
  let finalConfig = config;
  for (const fn of interceptors.request) {
    finalConfig = (await fn(finalConfig)) || finalConfig;
  }

  const retries = finalConfig.retries ?? 0;
  const retryDelay = finalConfig.retryDelay ?? 300;

  let attempt = 0;
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

// Shorthand for a GET request.
function get(url, config = {}) {
  return request({ ...config, url, method: "GET" });
}

// Shorthand for a POST request.
function post(url, data, config = {}) {
  return request({ ...config, url, method: "POST", data });
}

// Shorthand for a PUT request.
function put(url, data, config = {}) {
  return request({ ...config, url, method: "PUT", data });
}

// Shorthand for a DELETE request.
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
