export default {
  config: {
    name: "gid",
    aliases: ["معرف1"],
    version: "1.0.0",
    author: "sunken",
    countDown: 5,
    role: 0,
    category: "أدوات عامة",
    description: "جلب معرف الدردشة أو المجموعة (GID)",
    usage: ["{pn}معرف1 — يعرض معرف المحادثة الحالية"],
  },
  // Command entry point: reply with the current thread's ID.
  onStart: async ({ event, message }) => {
    const { threadID } = event;
    await message.reply(`✅ معرف هذه الدردشة/المجموعة:\n${threadID}`);
  }
};
