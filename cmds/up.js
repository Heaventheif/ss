// cmds/up.js — إعادة تحميل + تنظيف + إحصاءات (يدمج reload)
import fs from "fs-extra";
import path from "path";
import { pathToFileURL } from "url";

const CACHE_ROOT = path.join(import.meta.dir, "..", "cache");
// ← ملاحظة محدَّثة: pinterest.js الحالي يستخدم os.tmpdir() وينظّف ملفاته
// بنفسه فور الإرسال — لا يكتب في cache/pinterest إطلاقاً، فلا داعٍ لتضمينه
// هنا. لا يوجد حالياً أي أمر يكتب في مجلد ضمن cache/ عدا ai_sessions_gptx.
const AI_DIRS    = ["ai_sessions_gptx"];
const MEDIA_DIRS = [];
// ← تم حذف "mediaSearchSessions" و"youtubeSearchSessions" و"audioSearchSessions"
// و"soundcloudSearchSessions" من هذه القائمة: لا يوجد أي أمر في المشروع
// الحالي يُنشئ متغيرات global بهذه الأسماء (بقايا من أوامر قديمة أُزيلت —
// آخرها sing.js/utils/soundcloud، لم يعودا موجودين؛ sc.js الحالي يستخدم
// global.client.reactionListener بدلاً من ذلك)، فكانت لا تفعل شيئاً سوى
// فحص عبثي عند كل .up.
const GLOBAL_SESSIONS = [];

// ─── قراءة استخدام الذاكرة الحقيقي كما يراه Render (cgroup) ──────
// process.memoryUsage() يعكس فقط منظور Node/V8 (RSS/Heap/External)،
// لكن Render يقتل العملية (OOM) بناءً على استهلاك الـ container كاملاً
// كما تراه الـ cgroup — وهو رقم مختلف وأدق (يشمل ذاكرة native، مكتبات،
// buffers... كل شيء). ندعم كلا الإصدارين v2 (الشائع حالياً) وv1 (fallback).
function readFirstExisting(paths) {
    for (const p of paths) {
        try {
            const val = fs.readFileSync(p, "utf8").trim();
            if (val && val !== "max") return Number(val);
            if (val === "max") return null; // بلا حد (نادر لكن ممكن)
        } catch (_) { /* جرّب المسار التالي */ }
    }
    return undefined; // لا يوجد أي مسار متاح إطلاقاً
}

function getContainerMemory() {
    // cgroup v2
    let usage = readFirstExisting(["/sys/fs/cgroup/memory.current"]);
    let limit = readFirstExisting(["/sys/fs/cgroup/memory.max"]);

    // fallback → cgroup v1
    if (usage === undefined) usage = readFirstExisting(["/sys/fs/cgroup/memory/memory.usage_in_bytes"]);
    if (limit === undefined) limit = readFirstExisting(["/sys/fs/cgroup/memory/memory.limit_in_bytes"]);

    // بعض المضيفات تضع حداً وهمياً ضخماً (يعني "بلا حد فعلي") — نتجاهله
    if (typeof limit === "number" && limit > 1e15) limit = null;

    if (typeof usage !== "number") return null; // غير متاح (مثلاً تشغيل محلي بدون cgroup)
    return { usage, limit: typeof limit === "number" ? limit : null };
}

function formatBytes(b) {
    if (b <= 0)      return "0 B";
    if (b < 1024)    return `${b} B`;
    if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
    return `${(b/1048576).toFixed(2)} MB`;
}

function formatUptime(sec) {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (d > 0) return `${d}ي ${h}س ${m}د`;
    if (h > 0) return `${h}س ${m}د ${s}ث`;
    if (m > 0) return `${m}د ${s}ث`;
    return `${s}ث`;
}

async function clearDir(dirPath) {
    let deleted = 0, freed = 0;
    try {
        if (!await fs.pathExists(dirPath)) return { deleted: 0, freed: 0 };
        const files = await fs.readdir(dirPath);
        for (const f of files) {
            if (["Readme.me","empty.txt",".gitkeep"].includes(f)) continue;
            const fp = path.join(dirPath, f);
            try {
                const st = await fs.stat(fp);
                if (st.isFile()) { await fs.unlink(fp); deleted++; freed += st.size; }
            } catch (_) {}
        }
    } catch (_) {}
    return { deleted, freed };
}

async function dirStats(dirPath) {
    let count = 0, size = 0;
    try {
        if (!await fs.pathExists(dirPath)) return { count: 0, size: 0 };
        const files = await fs.readdir(dirPath);
        for (const f of files) {
            if (["Readme.me","empty.txt",".gitkeep"].includes(f)) continue;
            try {
                const st = await fs.stat(path.join(dirPath, f));
                if (st.isFile()) { count++; size += st.size; }
            } catch (_) {}
        }
    } catch (_) {}
    return { count, size };
}

function clearGlobalSessions() {
    let total = 0;
    for (const key of GLOBAL_SESSIONS) {
        if (global[key] && typeof global[key] === "object") {
            total += Object.keys(global[key]).length;
            global[key] = {};
        }
    }
    return total;
}

function countCommandFiles() {
    try {
        return fs.readdirSync(path.join(import.meta.dir, "..", "cmds"))
            .filter(f => f.endsWith(".js")).length;
    } catch (_) { return 0; }
}

// ─── دالة Hot Reload المباشرة ────────────────────────────────
async function doReload() {
    // global.reloadCommands معرّفة في index.js كـ loadCommands
    // وترجع مصفوفة أخطاء التحميل (ملف بملف) بدل ابتلاعها بصمت
    if (typeof global.reloadCommands === "function") {
        const errors = await global.reloadCommands() || [];
        return { ok: errors.length === 0, fileErrors: errors };
    }
    // fallback يدوي: أعد استيراد كل أوامر عبر import() ديناميكي مع
    // كسر كاش ESM بإضافة query string فريد (لا يوجد require.cache في ESM)
    const fileErrors = [];
    try {
        const dir = path.join(import.meta.dir, "..", "cmds");
        const files = fs.readdirSync(dir).filter(f => f.endsWith(".js"));
        global.commands?.clear?.();
        global.eventCommands = [];
        for (const file of files) {
            try {
                const p = path.join(dir, file);
                const cmd = await import(`${pathToFileURL(p).href}?update=${Date.now()}`);
                const mod = cmd.default || cmd;
                if (mod.config?.name && (mod.onStart || mod.run || mod.execute)) {
                    const name = mod.config.name.toLowerCase();
                    global.commands?.set(name, mod);
                    (mod.config.aliases || []).forEach(a => {
                        global.commands?.set(a.toLowerCase(), mod);
                    });
                }
                if (mod.onChat || mod.handleEvent) global.eventCommands?.push(mod);
            } catch (e) {
                fileErrors.push({ file, message: e.message });
            }
        }
        return { ok: fileErrors.length === 0, fileErrors };
    } catch (e) {
        return { ok: false, err: e.message, fileErrors };
    }
}

export default {
  config: {
        name: "up",
        aliases: ["تحديث"],
        version: "3.0.0",
        author: "SunkenBot Developer",
        countDown: 10,
        role: 2,
        category: "admin",
        description: "إعادة تحميل الأوامر (Hot Reload) + تنظيف الكاش + إحصاءات النظام",
        usage: ["{pn}تحديث — تنفيذ إعادة التحميل والتنظيف وعرض التقرير"],
        hidden: true, // مخفي من قائمة help: أمر صيانة داخلي للمشرفين
    },

    onStart: async function ({ message }) {
        const t0 = Date.now();

        // ── 1. Hot Reload ────────────────────────────────────
        const { ok: reloadOk, err: reloadErr, fileErrors } = await doReload();
        const fileCount   = countCommandFiles();
        const eventsCount = global.eventCommands?.length || 0;

        // ── 2. تنظيف الكاش ──────────────────────────────────
        let totalDeleted = 0, totalFreed = 0;
        const cleanLines = [];

        for (const dir of [...AI_DIRS, ...MEDIA_DIRS]) {
            const { deleted, freed } = await clearDir(path.join(CACHE_ROOT, dir));
            if (deleted > 0) {
                const label = AI_DIRS.includes(dir) ? "🤖" : "🎬";
                cleanLines.push(`  ${label} ${dir}: ${deleted} ملف (${formatBytes(freed)})`);
                totalDeleted += deleted;
                totalFreed   += freed;
            }
        }

        const clearedSessions = clearGlobalSessions();

        let remFiles = 0, remSize = 0;
        for (const dir of [...AI_DIRS, ...MEDIA_DIRS]) {
            const { count, size } = await dirStats(path.join(CACHE_ROOT, dir));
            remFiles += count; remSize += size;
        }

        // ── 3. ذاكرة العملية ────────────────────────────────
        // إجبار GC قبل القراءة مباشرة — بدونه الرقم المعروض قد يكون
        // ذروة مؤقتة تشمل قمامة لم تُجمع بعد، لا الاستهلاك الفعلي.
        if (typeof Bun !== "undefined" && typeof Bun.gc === "function") {
            try { Bun.gc(true); } catch (_) {}
        } else if (typeof global.gc === "function") {
            try { global.gc(); } catch (_) {}
        }
        const mem  = process.memoryUsage();
        const rss  = (mem.rss      / 1048576).toFixed(1);
        const heap = (mem.heapUsed / 1048576).toFixed(1);
        const ext  = (mem.external / 1048576).toFixed(1);

        // ── 4. Event Loop Lag ────────────────────────────────
        const pingMs = await new Promise(resolve => {
            const start = process.hrtime.bigint();
            setImmediate(() => resolve(Math.round(Number(process.hrtime.bigint() - start) / 1_000_000)));
        });

        // ── 5. وقت التشغيل ──────────────────────────────────
        const uptimeStr = formatUptime(Math.floor(process.uptime()));
        const elapsed   = Date.now() - t0;

        // ── بناء الرسالة ─────────────────────────────────────
        const L = [];
        L.push("╔══════════════════════╗");
        L.push("║   ⚡ SunkenBot — UP   ║");
        L.push("╚══════════════════════╝");
        L.push("");

        if (reloadOk) {
            L.push("✅ Hot Reload نجح");
        } else if (reloadErr) {
            L.push(`❌ فشل Reload: ${reloadErr.slice(0,60)}`);
        } else {
            L.push(`⚠️ Hot Reload انتهى مع أخطاء في ${fileErrors.length} ملف:`);
            for (const fe of fileErrors.slice(0, 5)) {
                L.push(`  ✗ ${fe.file}: ${fe.message.slice(0, 80)}`);
            }
            if (fileErrors.length > 5) L.push(`  … و${fileErrors.length - 5} ملف آخر`);
        }
        L.push(`   📂 أوامر: ${fileCount} ملف | أحداث: ${eventsCount}`);
        L.push("");

        L.push("🗑️ التنظيف:");
        if (cleanLines.length > 0) {
            cleanLines.forEach(l => L.push(l));
            L.push(`  ✅ ${totalDeleted} ملف — ${formatBytes(totalFreed)} محررة`);
        } else {
            L.push("  ✅ الكاش نظيف");
        }
        if (clearedSessions > 0)
            L.push(`  🧠 جلسات RAM: ${clearedSessions} جلسة محذوفة`);
        L.push(`  💾 متبقٍ: ${remFiles} ملف (${formatBytes(remSize)})`);
        L.push("");

        L.push("🖥️ ذاكرة العملية (منظور Node):");
        L.push(`  • RSS:      ${rss} MB`);
        L.push(`  • Heap:     ${heap} MB`);
        L.push(`  • External: ${ext} MB`);
        L.push("");

        // ── 6. الذاكرة الحقيقية للـ container (كما يراها Render) ──
        const containerMem = getContainerMemory();
        L.push("📦 ذاكرة الـ Container (الحقيقية عند Render):");
        if (containerMem) {
            const usedMB = containerMem.usage / 1048576;
            L.push(`  • مستخدَم: ${usedMB.toFixed(1)} MB`);
            if (containerMem.limit) {
                const limitMB = containerMem.limit / 1048576;
                const pct = (containerMem.usage / containerMem.limit) * 100;
                let icon = "🟢";
                if (pct >= 90) icon = "🔴";
                else if (pct >= 75) icon = "🟠";
                else if (pct >= 60) icon = "🟡";
                L.push(`  • الحد المسموح: ${limitMB.toFixed(0)} MB`);
                L.push(`  • النسبة: ${icon} ${pct.toFixed(1)}%`);
                if (pct >= 90) L.push(`  ⚠️ قريب جداً من حد OOM — خطر إعادة تشغيل قسري!`);
                else if (pct >= 75) L.push(`  ⚠️ استهلاك مرتفع — راقب الاتجاه`);
            } else {
                L.push(`  • الحد المسموح: غير محدَّد/غير متاح`);
            }
        } else {
            L.push("  ⚠️ غير متاح (لا يوجد cgroup — تشغيل محلي على الأرجح)");
        }
        L.push("");

        L.push("📊 الأداء:");
        L.push(`  • Loop Lag: ${pingMs}ms`);
        L.push(`  • Uptime:   ${uptimeStr}`);
        L.push(`  • زمن العملية: ${elapsed}ms`);

        message.reply(L.join("\n"));
    }
};
