"use strict";

/**
 * مصدر واحد لبناء واجهة الرسائل (message.reply / unsend / registerReply)
 * وسياق تنفيذ الأوامر (ctx) — كانت هذه المنطق مكررة 3 مرات في index.js
 * (handleMessage، مسار الردود messageReply، و handleEvent) بنفس الشكل
 * تماماً، ما كان يعني أي تعديل مستقبلي (مثل إضافة حقل لـ ctx) يجب
 * تكراره 3 مرات ويسهل نسيان إحداها. الآن نقطة تعديل واحدة فقط.
 */

function buildMessageAPI(api, threadID, messageID) {
  return {
    // ملاحظة مهمة: الـ api هنا هي دائماً النسخة "المُغلَّفة" مسبقاً عبر
    // global.wrapApiForSafety (تُمرَّر كذلك من كل نقاط النداء في index.js).
    // لذلك نستدعي api.sendMessage مباشرة — وهي أصلاً تمرّ عبر gatedSend
    // مرة واحدة بالضبط. استدعاء global.safeSend(api, ...) هنا كان يُنتج
    // استدعاءً مزدوجاً لنفس طابور الـ threadID (طابور ينتظر طابوراً ينتظر
    // نفسه) = تعليق دائري (deadlock) لا يُحل ولا يُرفض أبداً، فلا تُرسل
    // أي رسالة رغم تنفيذ الأمر بنجاح.
    reply: (t, cb) => new Promise((resolve) => {
      api.sendMessage(t, threadID, (err, info) => {
        if (cb) cb(err, info);
        resolve(info || {});
      }, messageID);
    }),
    unsend: (msgID) => {
      try { api.unsendMessage(msgID, () => {}); } catch (_) {}
    },
    registerReply: (id, d, cb, senderID) => {
      global.Kagenou.replies[id] = {
        callback: cb,
        author: senderID,
        timestamp: Date.now(),
        ...d,
      };
    },
  };
}

function buildCommandContext({ api, event, args = [] }) {
  const { threadID, messageID } = event;
  return {
    api,
    event,
    args,
    message: buildMessageAPI(api, threadID, messageID),
    prefix: "",
    usersData: global.usersData,
    globalData: global.globalData,
    db: global.db,
  };
}

export { buildMessageAPI, buildCommandContext  };
