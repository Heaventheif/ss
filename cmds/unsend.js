export default {
  config: {
    name: "unsend",
    aliases: ["حذف"],
    version: "1.1.0",
    author: "sunken",
    countDown: 3,
    role: 0,
    nonPrefix: true,
    category: "أدوات",
    description: "حذف رسائل البوت عن طريق الرد عليها",
    usage: ["رد على رسالة البوت + {pn}حذف — يحذف تلك الرسالة"],
  },

  onStart: async function ({ api, event, message }) {
    const { threadID, messageID, type, messageReply, senderID } = event;

    // 1. التحقق من أن المستخدم قام بالرد على رسالة
    if (type !== "message_reply" || !messageReply) {
      return message.reply(
        "⚠️ **طريقة الاستخدام:**\n" +
        "1️⃣ اضغط مطولاً على رسالة البوت\n" +
        "2️⃣ اختر 'رد' (Reply)\n" +
        "3️⃣ اكتب: `unsend` أو `حذف`"
      );
    }

    // 2. التحقق من أن الرسالة مملوكة للبوت
    const botID = api.getCurrentUserID();
    if (String(messageReply.senderID) !== String(botID)) {
      return message.reply(
        "❌ لا يمكنني حذف رسائل الأعضاء الآخرين.\n" +
        "💡 يمكنني فقط سحب الرسائل التي أرسلتها أنا."
      );
    }

    // 3. التحقق من أن المستخدم هو صاحب الرسالة الأصلية (اختياري - للأمان)
    // يمكنك تعطيل هذا التحقق إذا أردت السماح للجميع بحذف ردود البوت
    // if (messageReply.messageReply?.senderID !== senderID) {
    //   return message.reply("❌ يمكنك فقط حذف الردود على رسائلك أنت.");
    // }

    try {
      // ✅ التصحيح الحاسم: إضافة threadID كمعامل ثاني
      await api.unsendMessage(messageReply.messageID, threadID);
      
      // حذف رسالة الأمر نفسها لتنظيف الشات
      await api.unsendMessage(messageID, threadID).catch(() => {});
      
      console.log(`[UNSEND] ✅ تم حذف رسالة في المجموعة ${threadID}`);
      
    } catch (error) {
      console.error("[UNSEND ERROR]:", {
        message: error.message,
        code: error.error,
        threadID,
        targetMsgID: messageReply.messageID
      });

      let errorMsg = "❌ تعذر حذف الرسالة.\n";
      
      if (error.error === "The message is too old or not from you!") {
        errorMsg += "⏰ مضى على الرسالة وقت طويل (أكثر من 10 دقائق)";
      } else if (error.error === "Cannot unsend message") {
        errorMsg += "🔒 الرسالة محمية أو تم حذفها مسبقاً";
      } else {
        errorMsg += `💡 السبب: ${error.message || "غير معروف"}`;
      }
      
      message.reply(errorMsg);
    }
  }
};
