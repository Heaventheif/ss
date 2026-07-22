// commands/sst.js
"use strict";
// ============================================================
// commands/sst.js — جسر فقط بين المستخدم و POST /gemini/stt (stt.go)
// على hf-space. كل منطق التفريغ (إرسال الصوت كـ inlineData لنموذج
// gemini-2.5-flash، نص TRANSCRIBE_PROMPT، تدوير المفاتيح) موجود بالكامل
// في stt.go. هذا الملف: يلتقط مرفق الصوت من الشات (رسالة حالية أو رد)،
// يرسله كـ audio_url لـ hf-space، ويعرض النص المُفرَّغ.
//
// ملاحظة تسمية: الملف مسمّى sst.js بناءً على طلب صريح — الأمر نفسه
// (aliases) يشمل "stt" أيضاً لتفادي أي لبس مع الاختصار الشائع.
// ============================================================

import http from "../utils/fetchHttp";
import { getHfBase, getInternalToken } from "../utils/hfClient";
import errorReporter from "../utils/errorReporter";

const AUDIO_EXTS = ["mp3", "m4a", "ogg", "wav", "flac", "aac"];

function detectAudioAttachment(event) {
  const sources = [
    ...(event.attachments || []),
    ...(event.messageReply?.attachments || []),
  ];
  for (const att of sources) {
    if (!att) continue;
    const type = (att.type || att.attachmentType || "").toLowerCase();
    if (type === "audio" || type === "voice_message") {
      const url = att.url || att.audioUrl || att.uri;
      if (url) return { url, ext: "" };
    }
    if (type === "file" || type === "document") {
      const ext = (att.filename || att.name || "").split(".").pop().toLowerCase();
      const url = att.url || att.uri;
      if (url && AUDIO_EXTS.includes(ext)) return { url, ext };
    }
  }
  return null;
}

async function fetchTranscript(audioUrl, ext) {
  const { data } = await http.post(
    `${getHfBase()}/gemini/stt`,
    { audio_url: audioUrl, ext: ext || "" },
    { timeout: 60000, headers: { "Content-Type": "application/json", "X-Internal-Token": getInternalToken() } }
  );
  if (!data?.transcript) throw new Error(data?.error || "استجابة فارغة");
  return data.transcript;
}

export default {
  config: {
    name: "sst",
    aliases: ["stt", "تحويل صوت لنص"],
    version: "1.0.0",
    role: 0,
    countDown: 8,
    category: "ذكاء اصطناعي",
    description: "تفريغ (Transcribe) مقطع صوتي إلى نص — جسر إلى stt.go",
    usage: [
      "{pn}sst (كرد على مرفق صوتي) — يفرّغ الصوت إلى نص",
      "أرسل مقطعاً صوتياً مع الأمر مباشرة",
    ],
  },

  onStart: async ({ api, event, message }) => {
    const { threadID, messageID } = event;
    const att = detectAudioAttachment(event);

    if (!att) {
      return message.reply("❌ أرفق مقطعاً صوتياً أو رُدّ على رسالة فيها مقطع صوتي مع هذا الأمر.");
    }

    try {
      const transcript = await fetchTranscript(att.url, att.ext);
      return global.safeSend(api, `📝 ${transcript}`, threadID, null, messageID);
    } catch (e) {
      console.error("[STT→HF]", e.response?.status, e.message?.substring(0, 200));
      errorReporter.report("sst:fetchTranscript", e);
      const msg = e.response?.data?.error || e.message;
      await message.reply(`❌ فشل التفريغ: ${msg}`);
    }
  },
};
