# 🤖 SunkenBot v2 — Multi-Host Bot System

<div align="center">

**A Facebook Messenger bot backed by a unified AI/media API layer**

![bun](https://img.shields.io/badge/bun-1.3.4-green?logo=bun)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express)
![HuggingFace](https://img.shields.io/badge/HuggingFace-API%20Space-yellow?logo=huggingface)
![License](https://img.shields.io/badge/License-MIT-lightgrey)

</div>

---

## 📋 System Overview

The project has **two separate components working together**:

| Component | Repo | Role |
|---|---|---|
| **SunkenBot** | `ss` (this repo) | A userbot that logs into a Facebook account and reacts to commands inside groups |
| **Sunken Bot API** | `hf-space` | A unified FastAPI server on Hugging Face Spaces providing AI/media services through a plugin system |

```
User in a Facebook group
        │  (gemini, groq, chess, sub, pin, novel2 ...)
        ▼
SunkenBot   (bun userbot)
        │  HTTP POST + header: X-Internal-Token
        ▼
Sunken Bot API  (Hugging Face Space — FastAPI)
        │
        ├── Groq / Gemini / GPT-4o / Cerebras / HF Inference
        ├── Facebook video download, video subtitling, Pinterest images, novels...
        ▼
Reply goes back to the bot → sent to the group
```

The bot (this repo) is the interface users interact with directly on Facebook, while the **Hugging Face Space** acts as an internal backend providing the heavy logic (AI models, media scraping, etc.) via a REST API. Commands that call this API directly are: `chess`, `fb`, `gemini`, `groq`, `manga2`, `novel2`, `pin`, `song`, `sub` — all going through a single unified access point: `utils/hfClient.js`. The rest of the commands (YouTube downloads, text translation, local chess, etc.) run locally within this repo, or through direct external providers (Cerebras, GitHub Models, Gemini TTS, RapidAPI...).

> ℹ️ Details of `hf-space` (plugin architecture, middleware, etc.) are documented in its own repo — refer to it directly. This file only documents what has actually been verified in this repo's code.

---

## 🔑 No Prefix Currently

In its current setup, the bot **does not require any command prefix** — typing the command name directly (e.g. `help` or `gemini your question`) is enough to run it, as long as it doesn't accidentally match normal conversation. This is set via `"Prefix": [""]` in `config.json`.

To later enforce a prefix (e.g. `!`) to reduce accidental replies to normal chat, change the value in `config.json` to an array with a non-empty symbol, e.g. `["!"]` — but this **also requires updating the routing logic in `index.js`** (the command-routing section, around the line parsing `messageText.split(/ +/)`), since the current code does not read `Prefix` from `config.json` in the actual routing; this is a deliberate current decision made per the project owner's request.

---

## 🔐 Internal API Protection via X-Internal-Token

Since the Hugging Face Space is exposed as a public HTTP endpoint, anyone who knows the Space URL could theoretically call the endpoints directly without going through the bot. To close this gap, every request from this repo to `hf-space` automatically includes an `X-Internal-Token` header.

- **Token source on the bot side**: the `INTERNAL_TOKEN` environment variable in `.env`.
- The value must **exactly match** the `INTERNAL_TOKEN` configured on `hf-space` (as a Secret in its settings), otherwise all requests return `401 Unauthorized`.
- **All** commands calling `hf-space` go through `utils/hfClient.js` (a single point that reads `HF_SPACE_URL`/`INTERNAL_TOKEN` from the environment only, with no URL or placeholder hard-coded in the code): `cmds/chess.js`, `cmds/fb.js`, `cmds/gemini.js`, `cmds/groq.js`, `cmds/manga2.js`, `cmds/novel2.js`, `cmds/pin.js`, `cmds/song.js`, `cmds/sub.js`.

Usage pattern:
```js
const http = require("./utils/fetchHttp"); // fetch-based axios replacement
const { getHfBase, getInternalToken } = require("./utils/hfClient");
http.post(`${getHfBase()}/endpoint`, payload,
  { headers: { "Content-Type": "application/json", "X-Internal-Token": getInternalToken() } });
```

---

## 🧩 SunkenBot — This Repo's Details

A bun bot that runs as a **userbot** inside Facebook Messenger groups, via a **locally modified and vendored** copy of `fca-unofficial` (located in `vendor/fca-unofficial`, not an npm dependency) — an internal, private version with auto-update disabled (`autoUpdate: false` in `fca-config.json`).

> ⚠️ **Reminder**: unofficial login violates Facebook's Terms of Service in itself — always use a dedicated bot account, never your personal account.

### Key protections in this version

- **A separate send queue per conversation** (`gatedSend` in `index.js`, with a 350ms minimum gap between consecutive messages to the same `threadID`) — instead of one global queue, so a message in one conversation doesn't wait on unrelated messages in other conversations.
- Every `api.sendMessage` call automatically goes through this queue (via `wrapApiForSafety` wrapping `api`), even if a given command forgets to use it explicitly.
- **Human-behavior simulation** (`utils/bot-enhancer.js` + `utils/humanizer.js`): a "thinking" delay and typing indicator scaled to the length of the incoming message and the reply, before actually sending.
- **Per-user, per-command cooldown**, configured via `config.countDown` in each command file (defaults to 3 seconds if not specified).
- **A 5-level permission system**: developers (4) → VIPs (3) → moderators (2) → admins (1) → everyone (0), configured via `config.json` (`developers`, `vips`, `moderators`, `admins`).
- `usersData`/`globalData` linked to MongoDB via Mongoose (optional, via `MONGO_URI`) — without it, data stays in-memory only with no persistence; writes are batched every 5 minutes instead of on every interaction to reduce load on the database.
- **Automatic login session (AppState) refresh every 2 hours**, saved immediately (see session section below).
- **Batched error reporting by email** (`utils/errorReporter.js`): every error is printed to the console immediately (visible directly in hosting logs), and also sent as a periodic batched report to the developer's email if SMTP settings are configured (entirely optional — without it, everything stays console-only).
- **Internal TTL cache** (`utils/cache.js`) reduces repeated expensive external requests (YouTube search, text translation...).
- Periodic cleanup every 30 minutes (expired replies, expired cooldowns, idle conversation queues, orphaned temp files in the system temp folder).

### Notable commands (based on actual files in `cmds/`)

| Category | Examples |
|---|---|
| AI | `gpt` (Cerebras), `gptx` (GPT-4o via GitHub Models), `groq`, `gemini` (both via `hf-space`) |
| Media & downloads | `yt`, `yt2`, `ydl`, `sc`, `song` (SoundCloud search by name + sends the first result as an audio file, via `hf-space` — a bridge only, no local library), `tts` (Gemini TTS directly), `pin`, `pinterest`, `random`, `fb` (Facebook video download via `hf-space`), `comic`, `sub` (adds text subtitles to a video via `hf-space`) |
| Games & content | `chess` (via `hf-space`), `novel` (local novel reader, 5 sources in parallel + auto-translation), `novel2` (via `hf-space`), `quran`, `animal` (cat/dog facts), `manga`, `manga2` (via `hf-space`) |
| General tools | `help`, `tr` (text translation, several engines with fallback), `uid`, `gid`, `unsend` |
| Admin (moderators) | `kick`, `adduser`, `up` (hot-reload commands + stats) |

---

## ⚙️ Environment Variables

| Variable | Purpose | Required |
|---|---|---|
| `FB_EMAIL` / `FB_PASSWORD` | Facebook account credentials (fallback login method) | Only if not using `APPSTATE` |
| `FB_2FA_SECRET` | TOTP secret for accounts with 2FA enabled | Optional |
| `APPSTATE` / `APPSTATE_BOT1` | JSON session cookie, preferred login method over email/password | Recommended |
| `MONGO_URI` | MongoDB connection string for persistent data | Optional (in-memory fallback) |
| `HF_SPACE_URL` | Base URL of the `hf-space` backend | Required for `hf-space`-backed commands |
| `INTERNAL_TOKEN` | Shared secret sent as `X-Internal-Token` to `hf-space` | Required for `hf-space`-backed commands |
| `PORT` | Local HTTP server port (defaults to 10000) | Optional |
| `RENDER_EXTERNAL_URL` | Used for self-ping keep-alive on Render-style hosts | Optional |
| `DEV_ALERT_EMAIL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | Enable batched error-report emails | Optional |
| `ERROR_REPORT_INTERVAL_MS` | Interval between batched error-report emails | Optional |

---

## 🗂️ Project Structure

```
ss-main/
├── cmds/          # Individual command files (one file per command)
├── db/            # Mongoose schema + connection helper
├── utils/         # Shared helpers (cache, http client, humanizer, error reporter, etc.)
├── vendor/
│   └── fca-unofficial/   # Vendored, locally modified Facebook Chat API library
├── config.json    # Runtime config (permission lists, prefix, bot name)
├── fca-config.json
├── index.js       # Entry point: login, event loop, command routing, safety wrappers
└── package.json
```
