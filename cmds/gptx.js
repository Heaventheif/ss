
"use strict";

import http from "../utils/fetchHttp";
import { getHfBase, getInternalToken } from "../utils/hfClient";
import errorReporter from "../utils/errorReporter";

const SYSTEM_TRIGGERS = ["gptx ", "gptx", "ai ", "ذكاء "];

// Detect an image attachment on the incoming message.
function detectImageAttachment(event) {
  const sources = [
    ...(event.messageReply?.attachments || []),
    ...(event.attachments || []),
  ];
  for (const att of sources) {
    if (!att) continue;
    if (["photo", "sticker", "animated_image"].includes(att.type)) {
      const url = att.url || att.largePreviewUrl || att.previewUrl || att.thumbnailUrl;
      if (url) return url;
    }
  }
  return null;
}

// Call the GPT-X endpoint with the request body.
async function callGptx(body) {
  const { data } = await http.post(
    `${getHfBase()}/gptx`,
    body,
    { timeout: 60000, headers: { "Content-Type": "application/json", "X-Internal-Token": getInternalToken() } }
  );
  if (!data?.reply) throw new Error(data?.error || "استجابة فارغة");
  return data.reply;
}

// Handle a GPT-X request (text or image) and reply with the result.
async function handleMessage(api, event, message, prompt, registerReply) {
  const { threadID, messageID, senderID } = event;

  if (prompt.trim().toLowerCase() === "clear" || prompt.trim() === "مسح") {
    try {
      await callGptx({ thread_id: threadID, clear: true });
    } catch (_) {}
    return message.reply("🧹 تم مسح ذاكرة المجموعة.");
  }

  const imageUrl = detectImageAttachment(event);
  if (!prompt && !imageUrl) return message.reply("⚠️ اكتب سؤالاً أو ردّ على صورة.");

  let senderName = senderID;
  try {
    const userInfo = await new Promise((res, rej) =>
      api.getUserInfo(senderID, (err, data) => (err ? rej(err) : res(data)))
    );
    senderName = userInfo?.[senderID]?.name || senderID;
  } catch (_) {}

  const body = {
    thread_id: threadID,
    sender_name: senderName,
    prompt: prompt || "",
  };
  if (imageUrl) body.attachment = { url: imageUrl };

  let reply;
  try {
    reply = await callGptx(body);
  } catch (e) {
    console.error("[GPTX→HF]", e.response?.status, e.message?.substring(0, 200));
    errorReporter.report("gptx:callGptx", e);
    const msg = e.response?.data?.error || e.message;
    return message.reply(`❌ ${msg}`);
  }

  const info = await message.reply(reply);
  if (registerReply) {
    registerReply(info.messageID, { threadID }, async ({ api, event, message }) => {
      const followUp = event.body?.trim() || "";
      if (!followUp && !(event.attachments?.length)) return;
      await handleMessage(api, event, message, followUp, registerReply);
    });
  }
}

export default {
  config: {
    name: "gptx",
    aliases: ["دردشة3"],
    version: "3.0.0",
    author: "Sunken",
    countDown: 3,
    role: 0,
    usePrefix: false,
    category: "ذكاء اصطناعي",
    description: "GPT-4o بذاكرة جماعية، ردود تلقائية، ويفهم الصور — جسر إلى gptx.go",
    usage: [
      "{pn}دردشة3 <سؤالك> — بدء محادثة",
      "رد على رسالة البوت — يكمل المحادثة تلقائياً",
      "رد على صورة + دردشة3 — يحلل الصورة",
      "{pn}دردشة3 مسح — مسح ذاكرة المحادثة الجماعية",
    ],
  },

  
  // Command entry point: forward the prompt to the GPT-X handler.
  onStart: async ({ api, event, args, message }) => {
    let prompt = args.join(" ").trim();
    if (!prompt && event.messageReply) prompt = event.messageReply.body || "";
    await handleMessage(api, event, message, prompt, message?.registerReply);
  },

  
  // Continue a GPT-X conversation when replying to the bot's message.
  onChat: async ({ api, event, message }) => {
    const { body } = event;
    if (!body) return;
    const lower = body.trim().toLowerCase();
    const trigger = SYSTEM_TRIGGERS.find((t) => lower.startsWith(t));
    if (!trigger) return;
    const prompt = body.trim().slice(trigger.trim().length).trim();
    await handleMessage(api, event, message, prompt, message?.registerReply);
  },
};
