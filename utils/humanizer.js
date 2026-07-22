// utils/humanizer.js
export default { /**
   * حساب مدة الكتابة بالمللي ثانية بناءً على طول النص المراد إرساله.
   * @param {string };text - النص الذي سيرسله البوت
   * @returns {number} - مدة الكتابة بالمللي ثانية (بين 1500 و 8000)
   */
  getTypingDuration(text) {
    // "text" قد يصل أحياناً ككائن {body, attachment} بدل نص خام
    // (مثال: إرسال دفعة صور). نتعامل مع أي مدخل غير نصي بأمان بدل الانفجار.
    if (typeof text !== 'string') text = (text && typeof text.body === 'string') ? text.body : '';
    if (!text) return 300;
    const words = text.split(/\s+/).length;
    // ومضة سريعة فقط: 300ms أساسية + 10ms لكل كلمة، بحد أقصى 900ms
    return Math.min(300 + words * 10, 900);
  },

  /**
   * حساب زمن التفكير (قراءة الرسالة) بالمللي ثانية.
   * @param {number} incomingLength - طول الرسالة الواردة (عدد الحروف)
   * @returns {number} - زمن التفكير (بين 100 و 400)
   */
  getThinkingDelay(incomingLength) {
    const len = incomingLength || 0;
    if (len < 5) return 100;      // رسالة قصيرة جداً
    if (len < 50) return 200;     // رسالة عادية
    return 400;                   // رسالة طويلة
  },

  /**
   * اختيار عشوائي من مصفوفة (لتنويع الردود).
   */
  randomPick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }
};