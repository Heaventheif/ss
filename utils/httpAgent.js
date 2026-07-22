"use strict";

import http from "http";
import https from "https";

/**
 * وكيل HTTP/HTTPS مشترك بـ Keep-Alive — يُنشأ مرة واحدة فقط ويُعاد
 * استخدامه في كل الملفات. أي طلب axios لنفس الخادم (مثلاً 20 صورة من
 * نفس CDN بينتريست، أو استدعاءات متكررة لـ MangaDex API) يعيد استخدام
 * نفس اتصال TCP/TLS بدل عمل handshake كامل من الصفر لكل طلب.
 *
 * الاستخدام:
 *   import { httpsAgent, httpAgent  } from "../utils/httpAgent";
 *   axios.get(url, { httpsAgent, httpAgent, ... });
 */

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,        // حد أقصى لعدد الاتصالات المتزامنة لكل خادم
  keepAliveMsecs: 10000, // مدة إبقاء الاتصال حياً بين الطلبات (10 ثوانٍ)
});

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
  keepAliveMsecs: 10000,
});

export { httpsAgent, httpAgent  };
