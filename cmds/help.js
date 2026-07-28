"use strict";

const ROLE_NAMES = {
  0: "الجميع",
  1: "المميزون",
  2: "المراقبون",
  3: "المشرفون",
  4: "المطورون",
};
// Map a numeric role level to its Arabic label.
function roleName(role) {
  return ROLE_NAMES[role] ?? "غير محدد";
}

const DISPLAY_PREFIX = "";
// Replace the {pn} placeholder with the actual command prefix.
function applyPrefixPlaceholder(str) {
  return String(str).replace(/\{pn\}/g, DISPLAY_PREFIX);
}

// Choose the display name shown for a command (always the English name).
function pickDisplayName(name, aliases) {
  return name;
}

// Normalize a command's usage field into a list of lines.
function extractUsage(cfg) {
  if (Array.isArray(cfg.usage) && cfg.usage.length) {
    return cfg.usage.map(applyPrefixPlaceholder);
  }
  if (typeof cfg.usage === "string" && cfg.usage.trim()) {
    return cfg.usage
      .split("\n")
      .map(s => s.trim())
      .filter(Boolean)
      .map(applyPrefixPlaceholder);
  }
  return [];
}

// Get a command's description, or a fallback if missing.
function extractDescription(cfg) {
  return cfg.description || "⚠️ لا يوجد وصف";
}

// Replace occurrences of a command's raw name with its display name in text.
function replaceNameWithDisplay(text, rawName, displayName) {
  if (!rawName || rawName === displayName) return text;
  const re = new RegExp(`\\b${rawName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi");
  return text.replace(re, displayName);
}

// Build the metadata object (name, usage, description, etc.) for a command.
function buildCommandMeta(mod) {
  const cfg = mod?.config;
  if (!cfg?.name) return null;

  const name = String(cfg.name).toLowerCase();
  const aliases = cfg.aliases || [];
  return {
    name,
    displayName: pickDisplayName(name, aliases),
    aliases,
    category: (cfg.category || "غير مصنف").trim(),
    description: extractDescription(cfg),
    usage: extractUsage(cfg).map(u => replaceNameWithDisplay(u, name, pickDisplayName(name, aliases))),
    role: cfg.role ?? 0,
    roleLabel: roleName(cfg.role ?? 0),
    countDown: cfg.countDown ?? 3,
    hidden: cfg.hidden === true,
  };
}

const CATEGORY_SECTIONS = {
  "الذكاء الاصطناعي": ["ذكاء اصطناعي"],
  "الوسائط والتحميل": ["وسائط وتحميل"],
  "المانجا والروايات": ["مانجا وروايات"],
  "الألعاب والترفيه": ["ألعاب وترفيه"],
  "الإدارة والإشراف": ["إدارة وإشراف"],
  "الأدوات العامة": ["أدوات عامة"],
};

export default {
  config: {
    name: "help",
    aliases: ["مساعدة"],
    version: "6.0",
    role: 0,
    countDown: 3,
    category: "أدوات عامة",
    description: "عرض قائمة جميع الأوامر مصنفة، أو تفاصيل أمر محدد",
    usage: [
      "مساعدة — قائمة الأوامر مصنفة حسب القسم",
      "مساعدة <اسم_الأمر> — شرح كامل لطريقة استخدام أمر معيّن",
      "مساعدة الكل — قائمة مسطّحة بكل الأوامر",
    ],
    hidden: true, 
  },

  // Command entry point: show the full command list or details for one command.
  onStart: async ({ api, event, args }) => {
    const { threadID, messageID } = event;

    
    
    
    
    
    const registry = new Map();
    const allMods = [...global.commands.values(), ...(global.eventCommands || [])];
    for (const mod of allMods) {
      const meta = buildCommandMeta(mod);
      if (!meta) continue;
      if (!registry.has(meta.name)) registry.set(meta.name, meta);
    }

    
    if (args.length > 0 && args[0].toLowerCase() !== "all" && args[0] !== "الكل") {
      const query = args[0].toLowerCase();
      
      let cmd = registry.get(query);
      if (!cmd) {
        for (const c of registry.values()) {
          if (
            c.displayName.toLowerCase() === query ||
            c.aliases.map(a => a.toLowerCase()).includes(query)
          ) { cmd = c; break; }
        }
      }
      if (!cmd) {
        return global.safeSend(api, `❌ الأمر "${query}" غير موجود`, threadID, null, messageID);
      }
      return global.safeSend(api, formatCommandDetail(cmd), threadID, null, messageID);
    }

    
    if (args[0]?.toLowerCase() === "all" || args[0] === "الكل") {
      const names = [...registry.values()]
        .filter(c => !c.hidden)
        .map(c => c.displayName)
        .sort();
      let msg = `📋 جميع الأوامر (${names.length}):\n━━━━━━━━━━━━━━━━━━━━\n`;
      names.forEach((n, i) => { msg += `${i + 1}. ${n}\n`; });
      return global.safeSend(api, msg, threadID, null, messageID);
    }

    
    return global.safeSend(api, formatMainList(registry), threadID, null, messageID);
  },
};

// Format the detailed help text for a single command.
function formatCommandDetail(cmd) {
  const LINE = "━━━━━━━━━━━━━━━━━━━━";
  let info =
    `📌 الأمر: ${cmd.displayName}\n${LINE}\n` +
    `📂 التصنيف : ${cmd.category}\n` +
    `📝 الوصف   : ${cmd.description}\n`;

  if (cmd.usage.length) {
    info += `🧭 طريقة الاستخدام :\n` + cmd.usage.map(u => `  • ${u}`).join("\n") + "\n";
  }
  
  const otherAliases = [cmd.name, ...cmd.aliases]
    .filter(a => a.toLowerCase() !== cmd.displayName.toLowerCase());
  if (otherAliases.length) {
    info += `🔗 البدائل  : ${otherAliases.join(" | ")}\n`;
  }
  info +=
    `⏱ كولداون  : ${cmd.countDown} ثانية\n` +
    `🔐 الصلاحية: ${cmd.roleLabel}`;

  return info;
}

// Format the main command list grouped by category.
function formatMainList(registry) {
  const visible = [...registry.values()].filter(c => !c.hidden);

  let message = `📋 قائمة الأوامر (${visible.length})\n`;

  const used = new Set();

  for (const [sectionTitle, items] of Object.entries(CATEGORY_SECTIONS)) {
    const present = [];
    const addedInSection = new Set(); 
    for (const item of items) {
      const key = item.toLowerCase();
      for (const cmd of visible) {
        if (
          cmd.category.toLowerCase() === key &&
          !used.has(cmd.name) &&
          !addedInSection.has(cmd.name)
        ) {
          present.push(cmd);
          addedInSection.add(cmd.name);
        }
      }
    }
    if (!present.length) continue;

    message += `\n${sectionTitle}\n`;
    message += present.map(cmd => { used.add(cmd.name); return cmd.name; }).join(", ") + "\n";
  }

  
  
  
  
  const other = visible.filter(c => !used.has(c.name));
  if (other.length) {
    message += `\nأخرى\n`;
    message += other.map(cmd => {
      console.warn(`[help] الأمر '${cmd.name}' لم يُطابق أي قسم في CATEGORY_SECTIONS (category الحالية: "${cmd.category}").`);
      return cmd.name;
    }).join(", ") + "\n";
  }

  message += `\nhelp <اسم_الأمر> — تفاصيل الأمر`;

  return message;
}
