// utils/bot-enhancer.js
import humanizer from './humanizer';

/**
 * يُعزز دالة global.safeSend بإضافة:
 * - تفكير قبل الكتابة
 * - إشارة كتابة (Typing Indicator) بمدة تتناسب مع طول الرد
 * - ثم يستدعي الطابور الأصلي (gatedSend)
 */
export default function enhanceBot(api) {
  // حفظ الدالة الأصلية safeSend (وهي gatedSend من index.js)
  const originalSafeSend = global.safeSend;

  // إعادة تعريف safeSend مع الاحتفاظ بالمعاملات نفسها
  global.safeSend = async function enhancedSend(apiInstance, body, threadID, callback, messageID) {
    // تجاهل الرسائل الفارغة (مثل إشعارات النظام)
    if (!body) {
      return originalSafeSend(apiInstance, body, threadID, callback, messageID);
    }

    // "body" قد يكون نصاً خاماً أو كائناً {body, attachment, ...} (مثال:
    // دفعات صور Pinterest ترسل body='' مع attachment فقط). نستخرج النص
    // الفعلي هنا مرة واحدة بدل تمرير الكائن كامل إلى humanizer.
    const textBody = typeof body === 'string' ? body : (typeof body?.body === 'string' ? body.body : '');
    const isAttachmentOnly = typeof body === 'object' && !!body?.attachment && !textBody;

    // رسالة مرفقات بدون نص (دفعة صور مثلاً) — لا فائدة من محاكاة "كتابة"
    // على كلام غير موجود، ونتخطى التأخير كلياً لتفادي إبطاء إرسال الدفعات.
    if (isAttachmentOnly) {
      return originalSafeSend(apiInstance, body, threadID, callback, messageID);
    }

    // —— الخطوة 1: التفكير قبل الكتابة ——
    // نستخدم طول الرسالة الواردة غير معروف هنا، نأخذ قيمة افتراضية 20 حرفاً.
    // يمكن تمرير طول الرسالة كمعامل سادس إذا دعت الحاجة.
    const thinkingMs = humanizer.getThinkingDelay(20);
    await new Promise(resolve => setTimeout(resolve, thinkingMs));

    // —— الخطوة 2: إشارة الكتابة ——
    const typingMs = humanizer.getTypingDuration(textBody);
    try {
      api.sendTypingIndicator(threadID, true, { duration: typingMs });
    } catch (_) {
      // تجاهل أخطاء إشارة الكتابة (قد لا تكون مدعومة في بعض البيئات)
    }
    await new Promise(resolve => setTimeout(resolve, typingMs));

    // —— إيقاف إشارة الكتابة ——
    try {
      api.sendTypingIndicator(threadID, false);
    } catch (_) {}

    // تسجيل دقيق لمقدار التأخير الصناعي المُطبَّق — يسمح بمقارنته مع
    // [TIMING] الإجمالي للأمر في index.js لمعرفة كم من الوقت الكلي
    // هو تأخير صناعي (محاكاة بشرية) وكم هو زمن شبكة/معالجة فعلي
    console.log(`[HUMANIZER] تأخير مُطبَّق: ${thinkingMs + typingMs}ms (تفكير=${thinkingMs}ms, كتابة=${typingMs}ms)`);

    // —— الخطوة 3: استدعاء الطابور الأصلي ——
    // هذا يضمن تطبيق الفاصل الزمني MIN_SEND_GAP_MS الخاص بالمحادثة
    return originalSafeSend(apiInstance, body, threadID, callback, messageID);
  };

  console.log('[✅ ENHANCER] تم تفعيل محاكاة البشر (كتابة + تفكير)');
};