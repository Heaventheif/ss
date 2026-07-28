
import fs from "fs-extra";
import path from "path";
import { pathToFileURL } from "url";

const CACHE_ROOT = path.join(import.meta.dir, "..", "cache");

const AI_DIRS    = ["ai_sessions_gptx"];
const MEDIA_DIRS = [];

const GLOBAL_SESSIONS = [];

// Read the first existing file's contents from a list of candidate paths.
function readFirstExisting(paths) {
    for (const p of paths) {
        try {
            const val = fs.readFileSync(p, "utf8").trim();
            if (val && val !== "max") return Number(val);
            if (val === "max") return null; 
        } catch (_) {  }
    }
    return undefined; 
}

// Read memory usage/limit for the current container, if available.
function getContainerMemory() {
    
    let usage = readFirstExisting(["/sys/fs/cgroup/memory.current"]);
    let limit = readFirstExisting(["/sys/fs/cgroup/memory.max"]);

    
    if (usage === undefined) usage = readFirstExisting(["/sys/fs/cgroup/memory/memory.usage_in_bytes"]);
    if (limit === undefined) limit = readFirstExisting(["/sys/fs/cgroup/memory/memory.limit_in_bytes"]);

    
    if (typeof limit === "number" && limit > 1e15) limit = null;

    if (typeof usage !== "number") return null; 
    return { usage, limit: typeof limit === "number" ? limit : null };
}

// Format a byte count as a human-readable size.
function formatBytes(b) {
    if (b <= 0)      return "0 B";
    if (b < 1024)    return `${b} B`;
    if (b < 1048576) return `${(b/1024).toFixed(1)} KB`;
    return `${(b/1048576).toFixed(2)} MB`;
}

// Format a duration in seconds as a human-readable uptime string.
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

// Delete all files inside a directory.
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

// Get file count and total size for a directory.
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

// Reset any in-memory session/context maps kept on the global object.
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

// Count the number of loaded command files.
function countCommandFiles() {
    try {
        return fs.readdirSync(path.join(import.meta.dir, "..", "cmds"))
            .filter(f => f.endsWith(".js")).length;
    } catch (_) { return 0; }
}

// Reload command files and report the result.
async function doReload() {
    
    
    if (typeof global.reloadCommands === "function") {
        const errors = await global.reloadCommands() || [];
        return { ok: errors.length === 0, fileErrors: errors };
    }
    
    
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
        category: "إدارة وإشراف",
        description: "إعادة تحميل الأوامر (Hot Reload) + تنظيف الكاش + إحصاءات النظام",
        usage: ["{pn}تحديث — تنفيذ إعادة التحميل والتنظيف وعرض التقرير"],
        hidden: true, 
    },

    onStart: async function ({ message }) {
        const t0 = Date.now();

        
        const { ok: reloadOk, err: reloadErr, fileErrors } = await doReload();
        const fileCount   = countCommandFiles();
        const eventsCount = global.eventCommands?.length || 0;

        
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

        
        
        
        if (typeof Bun !== "undefined" && typeof Bun.gc === "function") {
            try { Bun.gc(true); } catch (_) {}
        } else if (typeof global.gc === "function") {
            try { global.gc(); } catch (_) {}
        }
        const mem  = process.memoryUsage();
        const rss  = (mem.rss      / 1048576).toFixed(1);
        const heap = (mem.heapUsed / 1048576).toFixed(1);
        const ext  = (mem.external / 1048576).toFixed(1);

        
        const pingMs = await new Promise(resolve => {
            const start = process.hrtime.bigint();
            setImmediate(() => resolve(Math.round(Number(process.hrtime.bigint() - start) / 1_000_000)));
        });

        
        const uptimeStr = formatUptime(Math.floor(process.uptime()));
        const elapsed   = Date.now() - t0;

        
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
