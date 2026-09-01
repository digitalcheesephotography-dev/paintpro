# CLAUDE.md

Reference document for AI assistants (Claude Code, future Claude chat sessions) working on this repository. Read this first before making changes.

> ## ⚠️ START HERE — run `git log --oneline -30` FIRST
> The copy of this file preloaded into your context may be **stale** (this was confirmed on Aug 31 2026: a fresh session was handed a version two commits old that described an app with four tabs, an APT section, and Projects/Notes sub-tabs — none of which exist). The working tree is the truth. `git log` subjects state removals in plain English and will inoculate you against a bad context in one command.
>
> **A lot has been deliberately removed from this app. See [section 17](#17-removed-on-purpose--do-not-re-add-without-asking) before proposing anything that looks "missing."**

---

## 1. What this project is

**PaintPro** is a single-file Progressive Web App used in the field by **Ingersoll Painting LLC** (Hannibal, NY — owner James Bailey, est. 1978) to take room measurements, log job data, and generate painting bids. It runs on a Samsung Galaxy Z Fold 5 in the truck and on job sites. The whole app is one self-contained HTML file plus a manifest, service worker, and icons.

- **Repository:** `github.com/digitalcheesephotography-dev/paintpro`
- **Deploy:** Netlify auto-deploys ~60 seconds after a commit to `main`
- **Live URL:** `lovely-kitsune-6c5c82.netlify.app`
- **Primary user:** James Bailey, sole operator. No team contributors.

---

## 2. Repository layout

Verified against the repo on Aug 31, 2026. If you add or remove a file, fix this list in the same commit - it had drifted badly before (it claimed the app was 4,050 lines when it was 9,600, and listed a LICENSE that no longer exists).

```
paintpro/
│
│  ── The app ────────────────────────────────────────────
├── PaintPro-ZFold.html       # The entire app (~9,600 lines, ~690 KB)
├── index.html                # Tiny redirect: / -> PaintPro-ZFold.html
├── manifest.json             # PWA manifest (name, icons, theme, start URL, share_target)
├── sw.js                     # Service worker - offline cache, network-first for HTML, share-target POST handler
│
│  ── Client-facing standalone pages ────────────────────
├── proposal.html             # Client e-signature page (homeowner opens ?id=... via a shared link)
├── visualizer.html           # Homeowner color visualizer - tap-wall recolor + "get a quote" lead
├── contact.html              # Digital business card - phone/email/socials + "Save to Contacts" vCard.
│                             #   This is what the tailgate QR code points at.
├── ingersoll-tailgate-qr-navy.png   # Printed QR for the truck tailgate -> contact.html
│
│  ── Backend / infrastructure ─────────────────────────
├── worker.js                 # Cloudflare Worker - AI proxy + Stripe checkout/verify (holds STRIPE_SECRET_KEY)
├── .github/workflows/deploy-worker.yml   # Auto-deploys worker.js to Cloudflare on push to main
├── netlify.toml              # Security headers (X-Frame-Options, HSTS, nosniff, referrer policy)
├── firestore.rules           # Firestore rules - synced user data + the proposals collection
├── storage.rules             # Firebase Storage rules - users/{uid}/photos
│
│  ── Home-PC print hub ───────────────────────────────
├── print_hub.py              # Runs on the home PC, listens on ntfy.sh, auto-prints bids
├── printer-setup.html        # Setup instructions page for the print hub
├── install-autostart.bat     # Windows autostart installer for print_hub.py
│
│  ── Icons ───────────────────────────────────────────
├── icon-192.png              # PWA icon, full-bleed
├── icon-512.png              # PWA icon, full-bleed
├── icon-maskable-192.png     # PWA icon, safe-zone padding for Android adaptive icons
├── icon-maskable-512.png     # PWA icon, safe-zone padding for Android adaptive icons
├── apple-touch-icon.png      # 180x180 for iOS home screen
├── favicon-32.png            # 32x32 tab favicon
│
│  ── Docs ────────────────────────────────────────────
├── CLAUDE.md                 # This file - read first
├── CLAUDE-quickbooks-clients.md  # Companion: rebuilding the Clients tab from QuickBooks
├── README.md                 # Effectively empty
│
│  ── Retired ─────────────────────────────────────────
├── hearsay.html              # OLD APP - "HearSay" standalone note taker. Not part of PaintPro,
├── hearsay.webmanifest       #   not linked from it. Left in the repo but no longer worked on.
├── hearsay-icon-192.png      #   Ignore unless James asks about it by name.
└── hearsay-icon-512.png
```

**Everything outside `PaintPro-ZFold.html` is PWA infrastructure.** The HTML file is the entire application — UI, styles, logic, all in one place. This is intentional. **Do not split it into separate JS/CSS files** without explicit approval from James.

---

## 3. Architecture

### Single-file philosophy
- **No build step.** No bundler, no transpiler, no npm dependencies at runtime.
- **No framework.** Vanilla JS, vanilla CSS, vanilla HTML.
- **No backend.** All data lives in `localStorage` (plus IndexedDB for photos).
- **No external API calls** (except Google Fonts and the BLE Web Bluetooth API). This is deliberate — the app must work in the truck with no signal.

### Why single-file?
- James edits the file directly in GitHub's web editor on his phone. A single file means one paste, one commit.
- The PWA caches it as a single asset for offline use.
- Easier mental model than juggling modules.

### Tech stack
- **HTML/CSS/JS** — vanilla, no dependencies
- **Google Fonts** — Bebas Neue + Barlow Condensed, loaded from CDN
- **Web Bluetooth API** — for Leica DISTO D2 laser measurer integration
- **Web Speech API** — for voice commands (Chrome only)
- **localStorage** — for job/client/materials data (project, notes and apt keys still exist but their UI was retired — see section 17)
- **IndexedDB** — for photo storage (larger blobs, keyed by photo ID)
- **Service Worker API** — for offline support and installability

---

## 4. Brand & visual conventions

### Colors (CSS variables defined in `:root`)
| Variable     | Value     | Purpose                                  |
|--------------|-----------|------------------------------------------|
| `--blue`     | `#2baae1` | Primary brand color, headings, accents   |
| `--green`    | `#2e8b1e` | Success states, "bought" totals, money   |
| `--red`      | `#c0392b` | Destructive actions, warnings            |
| `--amber`    | `#f59e0b` | Caution states                           |
| `--dark`     | `#0d1117` | App background                           |
| `--panel`    | `#161b22` | Card backgrounds (lighter than `--dark`) |
| `--card`     | `#1a2030` | Inner card backgrounds                   |
| `--border`   | `#252c3a` | Borders                                  |
| `--text`     | `#e2e8f0` | Primary text                             |
| `--muted`    | `#6b7a8d` | Secondary/helper text                    |

### Fonts
- `--head: 'Bebas Neue', sans-serif` — all-caps headings, brand displays
- `--font: 'Barlow Condensed', 'Arial Narrow', sans-serif` — body text and inputs

### Layout tokens
- `--tap: 54px` — minimum tap target height (good for gloved fingers on a job site)
- `--r: 12px` — standard border-radius
- `--gap: 12px` — standard flex/grid gap
- `--safe-t` / `--safe-b` — iOS safe-area insets

### Theme
Dark "contractor grade" — high contrast, large tap targets, visible in bright sunlight or dim basements.

---

## 5. Bid document conventions (STRICT — never deviate)

These rules apply to bid PDFs/DOCX James generates **outside** the app (in chat). The in-app Bid Agent follows the same pricing and tone rules.

### Tone
- Warm but direct. No fluff, no filler, no overselling.
- Show per-building or per-area cost when the project has multiple structures — helps large numbers feel manageable.
- The 1-Year Workmanship Warranty communicates confidence.

### Pricing rules
- Show paint/stain at the **retail price per gallon** on the bid.
- **Volume Paint Discount** = difference between retail and our cost, shown per gallon. Keep as its own visible line when applicable. If there is no volume discount, skip the line and any savings callout entirely.
- **Project Services is ONE number.** James provides this. Never ask for or show labor rates, man-hours, crew sizes, equipment costs, or supply costs separately.
- If specialty equipment is used, mention it inside the Project Services description text only — never as a separate cost line item.

### Format rules
- **Font:** Georgia only. No other fonts in bid documents.
- **No em dashes** (`—`) anywhere. Use a hyphen, comma, or rephrase.
- **Embedded Ingersoll Painting logo** at the top of page 1.
- **About the Product section** describing the paint/stain used — research the product if needed. Never assume a specific product; always ask.
- **1-Year Workmanship Warranty** clause included.
- **Paint disclaimer:** *"Based on the size and specifics of your project, the paint cost & materials are an estimate. Pricing may be adjusted if more paint & materials are needed. Labor costs are estimated also, based on the expected scope of work. If unforeseen issues arise during the project, adjustments may be necessary."*
- **Output both DOCX and PDF** when delivering finished bids.
- **Always ask for all project details before generating.** Never generate from incomplete information.
- Test that the document fills pages cleanly. Adjust spacing so no page ends with just a footer or a few orphan lines.

### Never do
- Use em dashes
- Reference priming unless the user specifically includes it
- Show hourly labor rates, man-hours, or crew sizes
- Break out equipment or supplies as separate cost line items
- Reference workers' compensation insurance
- Add services, sections, or line items that were not requested
- Use any font other than Georgia
- Create orphan pages (short pages with just a footer or a few leftover lines)
- Assume any specific paint or stain product

---

## 6. App structure

### Top-level tabs (`#tab-bar`)
1. **ESTIMATE** (`#tab-estimate` → `#estimator-section`) — room-by-room measurements + doors/windows + bid generation
2. **CLIENTS** (`#tab-contacts` → `#contacts-section`) — sub-nav: **Clients | Materials** only (Projects and Notes were retired — see section 17)
3. **☰ MENU** (`#tab-settings` → `#settings-section`) — quick actions, a **setup-status strip** (`renderSetupStatus()`: signed-in + AI-key readiness, each row taps through to the card that fixes it via `openSettingsCard(rx)`), a **live search box** (`filterSettings()`), then settings cards sorted into named groups by `organizeSettingsMenu()` / `SETTINGS_GROUPS` (Refresh App pinned first; unmatched cards fall into "⋯ MORE" so a new card is never lost). Old layout was 15 ungrouped collapsed cards in arbitrary order.
### Estimator tab order (top to bottom)
1. **📁 Jobs button** (`#current-job-badge`) — opens the saved-jobs modal; label reflects currently-loaded snapshot name when set
2. Client name + Job address inputs
3. **💲 Labor Rates card** (collapsible, whole-job default $/sf — see section 7.1)
4. Room cards (each: name, walls, height, floor/ceiling dims, surface toggles, product, coats, **✓ DONE — NEXT ROOM** button, optional per-room rate override)
5. `+ ADD ROOM / AREA` button
6. **🚪 🪟 Doors & Windows card** (whole-job, not per-room)
7. Notes textarea
8. **● Save indicator** (`#save-indicator`) — shows last-save time
9. Materials/Labor/Total totals strip (auto-shows when there's data)
10. `GENERATE BID SUMMARY` button (auto-shows when there's data)
11. Bid output (`#bid-out`) — appears when generate is tapped

### Clients tab sub-nav (`switchSubnav()`)
- `subnav-clients` → `#sub-clients` — contact list with status filters
- ~~`subnav-projects`~~ / ~~`subnav-notes`~~ — **retired** (section 17). Panes, code and `ingersoll_projects_v1` / `ingersoll_notes_v1` are intact; only the buttons and their voice commands were removed, and `switchSubnav()` is null-guarded for them.
- `subnav-materials` → `#sub-materials` — per-job materials lists with copy-to-clipboard

---

## 7. Key systems

### 7.1 Labor rates
- Global defaults stored in `ingersoll_rates_v1` (interior) and `ingersoll_ext_rates_v1` (exterior)
- Default interior: walls $1.85/sf, ceiling $1.65/sf, floor $1.65/sf, trim $3.50/sf
- Default exterior: walls $2.25/sf, ceiling $1.75/sf, floor $2.50/sf, trim $3.50/sf
- Per-room overrides possible; `toggleRoomRates()` / `updateRoomRate()` manage them
- `modeRates(mode)` returns the right rate object for interior vs exterior

### 7.2 Auto-save & job snapshots
- Active job auto-saves to `ingersoll_active_job_v1` on every change via `markDirty()` + debounced `saveActiveJob()`
- Named snapshots saved to `ingersoll_jobs_v1` array via `saveSnapshot()`
- `getJobSnapshot()` / `applyJobData()` must be updated together when adding new persistent fields
- Save indicator (`#save-indicator`) shows last-save timestamp — always visible

### 7.3 Interior vs Exterior mode
- `estimatorMode`: `'interior'` | `'exterior'`
- `switchMode(mode)` rebuilds all room cards for the new mode
- Exterior rooms have siding/soffit/deck fields; interior rooms have walls/height/floor/ceiling
- Voice commands and `applyMeasurement()` are mode-aware

### 7.4 Room photos
- Photo blobs (base64) live in **IndexedDB** (`paintpro-photos` DB, `photos` store), keyed by photo ID. Helpers: `photoDBOpen()` / `photoPut(id,data)` / `photoGet(id)` / `photoDelete(id)`.
- `room.photos` on a job holds only `[{ id }]` references — NO base64. `getJobSnapshot()` strips any `.data` so localStorage never fills and the synced `ingersoll_jobs_v1` doc stays tiny (was the two critical data-loss bugs).
- `addRoomPhotoFiles()` compresses (550px / 0.5) → `photoPut` → pushes `{id}`. `renderRoomPhotoStrip()` is async: loads each blob from IndexedDB; a reference with no local blob renders an "other device" placeholder. `viewRoomPhoto(id)` fetches from IndexedDB for the lightbox.
- `migratePhotosToIDB()` runs once at boot: moves any legacy inline base64 (active job + saved snapshots) into IndexedDB, strips the blobs, re-saves. Best-effort, idempotent (blob removed only after a successful `photoPut`).
- **Cross-device photo sync (Firebase Storage) — Layer 2, built.** Blobs upload to `users/{uid}/photos/{id}.jpg` on add (`uploadPhoto`); `renderRoomPhotoStrip`/`viewRoomPhoto` pull a `getDownloadURL()` when the local IndexedDB blob is missing (`photoDownloadURL`). `backfillPhotos()` (run after `migratePhotosToIDB` at boot) pushes pre-existing local photos up. All guarded by `_storage` — if the Storage SDK didn't load or Storage is disabled, `_storage` is null and photos stay local-only with no error. Rules in `storage.rules` (must be published in the console). SDK: `firebase-storage-compat.js`; CSP adds `firebasestorage.googleapis.com` to img-src/connect-src.
- `deleteAllMyData()` deletes the `paintpro-photos` IndexedDB and best-effort deletes all `users/{uid}/photos` in Storage.

### 7.5 Bluetooth (Leica DISTO D2)
- Requires HTTPS — works on Netlify, not `file://`
- `connectBT()` / `disconnectBT()` / `handleBtButton()` manage connection lifecycle
- `BLE_CANDIDATES` array holds candidate service/characteristic UUIDs (DISTO D2 not well-documented)
- Falls back to subscribing to every notify characteristic
- `onMeasurement(evt)` parses the raw BLE bytes into feet
- `applyMeasurement(feet, disp)` routes the reading to the correct field
- `setReshootTarget(roomId, wallId)` arms a specific wall for re-shoot
- `armDimShot(roomId, field)` arms the Length or Width field for a shoot
- Every measurable field should have its own 📐 shoot button (not just the dropdown)

### 7.6 Auto-Print Hub — ⚠️ REMOVED FROM THE UI (see section 17)
- `const PRINT_HUB_TOPIC = ''` — set this to a hard-to-guess ntfy.sh topic name to enable
- `printAtHome()` — sends the current bid as plain text to `ntfy.sh/{topic}` via HTTP POST
- `print_hub.py` (in repo root) — Python script that runs on the home PC; streams from ntfy.sh and opens the bid in a local browser page with `window.print()` auto-triggered
- Requires internet on both phone and home PC; the phone sends the job, the PC listens and prints
- Setup: `pip install requests` on PC, set matching topic in both files, run `python print_hub.py`
- Auto-start on Windows: shortcut to `pythonw print_hub.py` in `shell:startup` folder

### 7.8 Online deposit collection (Stripe) — ⚠️ BUILT BUT REMOVED FROM THE UI (see section 17). James uses QuickBooks for payments.
- Lets a homeowner pay a deposit by card right after they sign a proposal. **Card data never touches the app or `proposal.html`** — the client is handed off to Stripe's hosted checkout (PCI stays with Stripe).
- **Config:** Settings → 💳 Collect a Deposit Online. `ingersoll_deposit_v1 = {enabled, pct}` (device-local). `loadDepositConfig()` / `depositEnabled()` / `saveDepositConfig()` / `syncDepositUI()`.
- **Secret key** (`STRIPE_SECRET_KEY`) lives ONLY as a Cloudflare env var on the Worker (`worker.js`) — never in the app. The app reuses the existing **Proxy URL** (`ingersoll_proxy_url_v1`) as the Worker endpoint.
- **Worker (`worker.js`)** now takes `(request, env)` and handles `body.stripe`:
  - `'checkout'` → creates a Stripe Checkout Session for the deposit amount (cents), returns `{url}`. Validates the `returnUrl` is one of `ALLOWED_ORIGINS`. `success_url` carries `paid={CHECKOUT_SESSION_ID}`.
  - `'verify'` → GETs the session, returns `{paid, amount}` so the client-side "received" confirmation is authoritative (checked against Stripe, not spoofable for display).
- **App side:** `_sendProposal(bodyHtml, client, address, totalForDeposit)` attaches `doc.deposit = {pct, amount(cents), label}` and `doc.payWorker = proxyUrl` when `depositEnabled()` + a proxy URL + a total are all present. `createProposal()` computes the grand total; `openProProposal` passes `v.total`; `sendWrittenBid` shows an optional "Job total $" field. The Proposals list and the link modal surface the deposit amount.
- **Client side (`proposal.html`):** `maybeDeposit()` runs on render. After signing (status `accepted`), `showPayButton()` offers "💳 Pay Deposit $X"; `startDeposit()` POSTs `{stripe:'checkout', …}` to `payWorker` and redirects to Stripe. On return with `?paid=<sessionId>`, it POSTs `{stripe:'verify'}`, and `showDepositPaid()` shows the received banner. CSP `connect-src` adds `https://*.workers.dev`.
- **Deposit-paid status is NOT written back to Firestore** (avoids loosening the proposal rules). James's source of truth for payment is Stripe's own dashboard + receipt email. A webhook-based status sync is the documented future enhancement.
- One-time setup (James): create a Stripe account, add `STRIPE_SECRET_KEY` secret to the Worker in Cloudflare, ensure Proxy URL is set, turn on the switch + set a percent.

### 7.9 Estimate Assistant + custom charges — built
- **One** whole-job AI chat (`#assistant-card`, near the bottom of the estimator) replaces the old per-room AI chat box, which was removed from every room card. Talk-or-type (the phone keyboard mic covers "talk").
- **Custom charges:** `jobLineItems = [{label, amount}]` — whole-job line items (Sheetrock, staining, power washing, etc.). `addJobLineItem()` / `removeJobLineItem()` / `renderLineItems()` (list in the assistant card with ✕ remove). `toggleManualCharge()` / `manualAddCharge()` are the no-signal manual add (label + $ inputs) — works fully offline, no AI needed. They flow into totals via `jobExtras().lineItems` / `.lineItemsTotal` (added into `jobExtras().total`), so every consumer (`recalcAll`, `renderBid`, deposit, QuickBooks copy, pro proposal) picks them up automatically. `renderBid` shows each as its own row.
- **Assistant:** `sendEstimateAssistant()` sends the chat with a system prompt containing `buildEstimateSummary()` (rooms, extras, charges, total). The model replies briefly and, when it changed something, appends a final `{"actions":[...]}` line. Two action types: `addLineItem{label,amount}` → `addJobLineItem`; `updateRoom{room,update}` → matches a room by name and calls `applyAIRoomResult` (so the one assistant can also correct any room's measurements). `renderAssistantMsgs()` / `clearEstimateAssistant()`. Uses `callAI(...,'claude-sonnet-4-6',600,system)` like the old room chat.
- **QuickBooks copy** lists custom charges as their own lines; Project Services = `lab - lineItemsTotal` so the QuickBooks total isn't double-counted.
- **Persistence:** `jobLineItems` and `assistantChat` are in `getJobSnapshot()` / `applyJobData()` (and reset in `startNewJob` / `clearMeasurements`). No new localStorage key — they live inside the job snapshot.

### 7.11 Claude chat → signable proposal (one tap) — built
Three ways a bid written in a Claude chat reaches the app, all landing in `sendWrittenBid(prefillText, prefillClient)`:
- **Deep link** — `checkBidDeepLink()` (runs before `checkSharedFile`) reads `?bid=<uri-encoded>` or `?bid64=<url-safe base64>` plus optional `&client=`, opens the composer prefilled, and `history.replaceState`s the URL clean so a reload can't re-fire it. Base64 form survives messaging apps that mangle long query strings.
- **Share sheet text** — a text-only share whose body is ≥120 chars is treated as a bid and goes STRAIGHT to the composer; anything shorter (a link, a stray line) still files to the docs inbox as before.
- **Manual** — 📥 BRING IN A BID → Paste Text From Claude.
`_guessClientFromBid()` pulls the client name from "Prepared For:", "Customer/Client:", "Estimate for", or "Proposal for" headings (rejects lines starting with a digit, containing `$`, or >5 words) so the composer arrives filled in.

### 7.10 Share into PaintPro (Android share target) — built
- PaintPro appears in the Android Share sheet (installed PWA) for **photos, PDFs, Word docs, and plain text** — `share_target` in `manifest.json` (`shared_files` param + title/text/url).
- `sw.js` intercepts the POST to `./share-target`, stashes every file in the `paintpro-shared` cache (`shared-file-0…n` + a `shared-meta` JSON index), and 303-redirects to the app with `?shared=1`. It also reads the legacy `shared_image` field in case Android still holds the old image-only manifest.
- `checkSharedFile()` (boot): a **single image** keeps the existing photo-choice flow (`showSharedPhotoChoice` → AI scan or room photo). **Documents / multiple files** are saved to IndexedDB `paintpro-docs` (store `docs`) and the inbox opens. A **text-only share** becomes a `.txt` doc.
- **Shared Files inbox** (`openDocsInbox()`, Settings → 📥 Shared With PaintPro): "📤 Upload a File From This Phone" button (file picker — works even when the Android share sheet hasn't registered the app yet), then a list with Open (`viewDoc`), Share / Text (`navigator.share` with files), delete; text docs get "✍️ Send as Signable Proposal" which opens `sendWrittenBid()` prefilled.
- **Open behavior (`viewDoc`):** images and text render in an in-app overlay (`_docOverlay`). PDFs/Word CANNOT be shown by Android Chrome (no built-in viewer; `window.open(blobUrl)` is a silent no-op in the installed app) — on Android they're saved via a download anchor so the download notification opens the system PDF viewer; desktop gets a normal new tab.
- **✨ Fill Into App** (`importBidDoc(rec)` → `applyImportedBid(json)`): AI-reads a bid document (PDF via Anthropic document block, photo via image block, text inline — NOT docx) using `callAI` + `extractAIJson` and `_IMPORT_BID_PROMPT`, extracts `{client, address, title, scope, about, product, areas:[{name, items:[{label, amount}]}], total}`, fills the estimator's client/job-address inputs, and calls `openProProposal(imp)` prefilled. `openProProposal` accepts an optional `imp` argument: no rooms required, `_proDefaultAreas` comes from `imp.areas`, gallons/retail/cost default to 0 (everything-included render), scope/about/title/product from the document.
- Helpers: `docsDBOpen` / `docPut` / `docAll` / `docDelete` / `_docIcon` / `_docSize`. Device-local, not synced or backed up (docs are copies of files that exist elsewhere). `deleteAllMyData()` deletes the `paintpro-docs` DB.
- SW cache bumped to `paintpro-v10` for this change (share-target logic changed).

### 7.7 Backup & Restore
- `buildBackup()` serializes all localStorage keys + IndexedDB photos into a JSON blob
- `backupToDrive()` triggers a download of the backup JSON
- `restoreFromBackup()` reads a backup JSON and restores all data

---

## 8. Voice system (updated May 31, 2026)

### Architecture
- `voiceRecog` — SpeechRecognition instance (Chrome Web Speech API)
- `voiceActive` — boolean; mic stays on between commands (`continuous = true`)
- `voiceLastMeasurement` — `{roomId, field, wallId}` — enables "undo last" command
- `maxAlternatives = 3` — Chrome returns top 3 guesses; best match wins

### Mishear correction (`VOICE_CORRECTIONS`)
Applied to every transcript before command parsing. Fixes consistent Chrome mishears:
- "while / well / whale" → **wall**
- "sealing / filling / healing" → **ceiling**
- "with / witch / weight" → **width**
- "lane" → **length**
- "stores / tours / boards / fords" → **doors**
- "windbows / winos" → **windows**
- "and a half / a half / half" → **point five** (fractions)
- "and a quarter / a quarter" → **point two five**

When a correction fires, the voice strip shows the corrected text with a ✦ marker.

### Number parsing (`parseSpokenNumber`)
- Handles digits, word numbers, hyphenated compounds ("thirty-two"), feet-inches shorthand ("twelve five" = 12'5"), decimal ("twelve point five"), fractions ("twelve and a half")
- Hyphenated compound resolves to whole number BEFORE feet-inches shorthand check
- `wordToNum()` handles multi-word compounds and "hundred" as multiplier

### Measurement commands
Flexible — keyword can come before OR after the number:
- `wall 14` / `14 wall` / `add wall 14` / `set wall fourteen`
- `height 9` / `ceiling height 9` / `room height nine`
- `length 20` / `floor length twenty`
- `width 16` / `floor width sixteen`
- `ceiling 8` (maps to height)
- Leading fillers stripped: add / set / put / do / record / enter / mark

Target always routes to whichever room card is currently open.

### Undo
`undo` / `scratch that` / `oops` / `wrong` / `clear` / `clear that` — removes the last wall added or blanks the last field filled.

### Room naming
Interior: `name room kitchen` / `call this room master bedroom` / `room name living room`
Exterior: `front side` / `left side` / `name it garage` / `call it back`

### Other commands
- Doors: `six doors` / `doors six` / `add seventeen doors`
- Windows: `eight windows` / `put twelve windows`
- Navigation: `estimator` / `clients` / `projects` / `notes` / `materials` / `apt pricing`
- Add new: `add room` / `add client` / `add project` / `add note` / `add material`
- Exterior: `siding forty by nine` / `six shutters` / `railing thirty` / `power wash 250`
- Exterior advance: `next side` / `next` / `done`

### Voice functions
`toggleVoice`, `startVoice`, `stopVoice`, `processVoiceCommand`, `applyVoiceCorrections`, `parseSpokenNumber`, `wordToNum`, `wordToNumSingle`

---

### Paint gallons — rounded ONCE per product, per job

`calc()` / `calcExt()` return the **raw, unrounded** gallon requirement per surface. `jobPaint()` sums that per product across every valid room and rounds **up once** — those are the cans actually bought and what the customer is charged. `roomShare(room)` scales a room's raw material share by its product's whole-can factor, so room subtotals on the bid still sum exactly to the Materials line.

**Why:** each surface used to be `Math.ceil`d separately in every room. A measured 8-room interior (walls + ceilings + trim, 2 coats, Regal Select) billed **39 gallons against 24.8 actually needed — $1,226 of paint that was never bought**, and the client proposal prints the gallon count. After the fix the same job bills 25 cans / $2,160 instead of $3,369.60. Every consumer (totals strip, bid, QuickBooks copy, professional proposal) goes through `jobPaint()`.

**Known related issue, NOT yet fixed:** trim gallons still divide **linear feet** by a **square-foot** coverage (`trimLF*c/p.cov`), so 52 ft of baseboard is treated as 52 sf of paint. Whether that is right depends on the trim profile James paints — ask him for a sf-per-linear-foot factor before changing it, because it moves every bid with trim.

## 9. Pricing defaults
- Door = **$75 each**
- Window = **$50 each**
- Paint markup = **1.20× (20%)** — `const MARKUP = 1.20`
- Do not change defaults; James edits per job when needed

---

## 10. localStorage keys
| Key | Contents |
|-----|----------|
| `ingersoll_active_job_v1` | Current active job snapshot |
| `ingersoll_jobs_v1` | Array of named saved snapshots |
| `ingersoll_rates_v1` | Interior labor rates object |
| `ingersoll_ext_rates_v1` | Exterior labor rates object |
| `ingersoll_contacts_v1` | Contacts/clients array |
| `ingersoll_projects_v1` | ⚠️ **RETIRED UI (section 17)** — data kept, no longer reachable. Projects array |
| `ingersoll_notes_v1` | ⚠️ **RETIRED UI (section 17)** — data kept, no longer reachable. Notes array |
| `ingersoll_materials_v1` | Materials lists array |
| `ingersoll_apt_pricing_v1` | ⚠️ **RETIRED UI (section 17)** — data kept, no longer reachable. Apt pricing locations/units |
| `ingersoll_supplies_v1` | ⚠️ **RETIRED UI (section 17)** — data kept, no longer reachable. Supplies (apt sub-section) |
| `ingersoll_pin_v1` | App Lock PIN (PBKDF2-SHA256 salt+hash; device-local, NOT synced) |
| `ingersoll_bio_v1` | App Lock WebAuthn credential id for fingerprint unlock (device-local) |
| `ingersoll_proposals_v1` | Sent e-signature proposals (id, client, status, url, signer; device-local) |
| `ingersoll_emailjs_v1` | EmailJS config {serviceId, templateId, publicKey} for auto-emailing signed-proposal copies (device-local) |
| `ingersoll_deposit_v1` | Online-deposit config {enabled, pct} for Stripe deposit collection on signed proposals (device-local) |
**Exterior extras** (`jobExtras()` / `#ext-extras-card`): Shutters (count x $), Power Wash (sf x $/sf), **Railing (linear ft x $/lf, default $8.00)** and **Steps/Treads (count x $, default $15)**. Railing and treads were added from a field report (Robin Castor job) where James's paper sheet listed deck railings in linear feet and stair treads by count with nowhere to enter them. They flow into `ex.total`, render as their own bid rows, and itemise in the QuickBooks copy.

**Railings and stair treads are per side** (`room.railSections` = a list of `{id, lf}` runs, `room.treadCount` = a count). They render on the exterior room card right under the deck sections, each run with its own laser button, because a paper sheet lists them per area ("back deck railing 21, 14, 15"). `jobExtras()` sums every side's runs and treads and **adds the whole-job Railing / Steps boxes on top**, so older saved jobs total exactly as before. Helpers: `addRailSection` / `removeRailSection` / `updateRailSection` / `renderRailSections` / `updateRoomTreads` / `armRailShot` (target `railShotTarget`). Rail ids are unique by construction (`_railId()`) rather than from a reset-on-reload counter.

**Pergolas / arbors are a measured exterior surface** (`room.pergolaSections` = `{id,l,w}` footprints, same shape as `deckSections`), entered on the side card under railings and treads, each with laser buttons that auto-advance Length -> Width. Priced by **footprint** square foot at `extRates.pergola`, default **$6.00/sf**, editable in the Labor Rates card (the box hides on interior jobs). Ungated like the other measured sections. Gallons use `PERGOLA_SURFACE_FACTOR = 2` because every rafter, beam and post takes stain on all four faces, so footprint badly understates the coated area.

Rate research (Aug 2026): staining a pergola runs **$6-$7/sf of footprint** nationally - HomeGuide puts a 12x12 at about $860 and a 16x24 at about $2,300, both landing on $6.00/sf; a second source quoted $4-$6/sf. Deck staining by comparison is $1.57-$4.04/sf, or $0.50-$2.50/sf for a re-stain in the Albany NY market. The pergola premium is roughly 2.3x the deck rate, which is the same multiple $6.00 sits at over James's own $2.50 deck rate. **Note the national figure is all-in (labor + material) while `extRates.pergola` is a labor rate with material added on top**, so a 12x12 bids at $864 labor plus stain. Drop the rate to about $4.50 if an all-in match to the national average is wanted. Helpers: `addPergolaSection` / `removePergolaSection` / `updatePergolaSection` / `renderPergolaSections` / `armPergolaShot` (target `pergolaShotTarget`).

**Laser shots round to whole feet.** `shotFt(feet)` (= `Math.round`) is the single rounding point for every shot in `applyMeasurement` - walls, wall heights, floor length/width, deck, porch ceiling, soffit and railing runs. 14.4 becomes 14, 14.6 becomes 15. James writes whole feet on paper and did not want 14.40 on a bid. The raw reading is still logged to 3 places in `dbgLog`.

**Ceiling height carries forward.** `addRoom()` starts a new room/side at the height last entered (`defHt`), falling back to the canned 8 interior / 9 exterior only for the first room of a job. Retyping the height on every side was the single biggest source of manual entry in the field.

**Exterior measurement rule:** soffit, porch ceiling and deck are charged **whenever they have measurements** - they are NOT gated on the surface toggles. Porch ceiling and deck used to require `surfaces.ceiling` / `surfaces.floor` as well, which silently dropped measured sections from the bid (cost $1,094 on one side of a real job). Only siding and trim still follow their toggles. This rule now holds in all three consumers: `calc()` (pricing), `_proRoomItems()` (the client proposal's itemized lines) and `copyBidForQuickBooks()` (the books). The proposal and QuickBooks used to keep the old toggle gate, so a measured porch ceiling or deck was priced into the bid total but left off the client's itemized breakdown - the signed proposal came in under the bid. Railings and treads were missing from the proposal's Additional Services entirely; both are now line items there.

| `ingersoll_qb_paylink_v1` | Reusable QuickBooks payment link URL for the 💳 Pay by Card (QuickBooks) button (device-local) |
| `ingersoll_anthropic_key_v1` | Anthropic API key for the AI features. **In `SYNC_KEYS`** — mirrored to `users/{uid}/data` so it survives a reinstall and returns on sign-in (owner-only per firestore.rules). Still excluded from `BACKUP_KEYS` so it never lands in an exportable backup file. |

**Client e-signature proposals:** "✍️ Send for Signature" on a bid writes it to Firestore `proposals/{randomId}` (`createProposal`) and shows a shareable link. The homeowner opens `proposal.html?id=…` (standalone, no login — public read by unguessable capability ID), reviews, types their name + draws a signature, and accepts; the doc flips to `status:'accepted'` with the signature PNG. The app watches sent proposals (`proposalWatch` / `watchAllProposals` in `setupFirestoreSync`) and toasts when signed; `openProposalsModal` lists them. Rules for the `proposals` collection are in `firestore.rules` (public read, owner-only create/delete, one-time constrained client accept) — must be published in the console.

**App Lock (opt-in):** `bootApp()` gates `_bootAppInner()` behind `showLockScreen()` when `pinIsSet()`. Enforced online AND offline (a lost phone in airplane mode no longer opens into data). Fingerprint via WebAuthn platform authenticator when `bioAvailable()`; PIN is the always-available fallback/recovery. `signOut()` clears both keys, so "forgot PIN" recovery = sign in again (synced data returns). Configured in ⚙ Settings → App Lock.

IndexedDB: `paintpro-photos` database, object store `photos`, keyed by photo ID string.

---

## 11. Function map (quick reference)

### Initialization & UI
`addRoom`, `nextRoom`, `removeRoom`, `setOpen`, `toggleOpen`, `renderRoom`, `renderAllRooms`, `renderWalls`, `addWall`, `removeWall`, `updateWall`, `updatePerimeterDisplay`, `refreshRoomSelect`, `switchTab`, `switchSubnav`, `toggleSurf`, `updateField`, `updateJobField`, `fmt`, `showToast`

### Auto-save & job snapshots
`getJobSnapshot`, `saveActiveJob`, `markDirty`, `loadActiveJob`, `applyJobData`, `updateSaveIndicator`, `syncJobBadge`, `jobsLoad`, `jobsSave`, `openJobsModal`, `closeJobsModal`, `renderJobsList`, `saveSnapshot`, `loadSnapshot`, `deleteSnapshot`, `startNewJob`

### Interior/Exterior mode
`switchMode`, `renderAllRooms`, `modeRates` (+ `SURF_LABELS`, `RATE_LABELS`, `extRates`, `loadExtRates`, `saveExtRates`)

### Photos
`photoDBOpen`, `photoPut`, `photoGet`, `photoDelete`, `migratePhotosToIDB`, `compressToBase64`, `addRoomPhotos`, `addRoomPhotoFiles`, `removeRoomPhoto`, `renderRoomPhotoStrip`, `viewRoomPhoto`, `closeRoomPhotoLightbox` (AI-batch photos: `addAIPhotos`, `renderAIPhotoStrip`, `analyzeAIPhotos`)

### Backup & restore
`buildBackup`, `backupToDrive`, `restoreFromBackup`, `deleteAllMyData` (privacy right-to-delete: wipes local + Firestore `SYNC_KEYS` docs + `paintpro-photos` and `paintpro-docs` IndexedDB, double-confirmed)

### Share target & Shared Files inbox
`checkSharedFile`, `showSharedPhotoChoice`, `openDocsInbox`, `docsDBOpen`, `docPut`, `docAll`, `docDelete`, `_docIcon`, `_docSize` (Android Share sheet → app; photos keep the scan/room-photo choice, documents land in the 📥 inbox in Settings)

### Estimate Assistant & custom charges
`addJobLineItem`, `removeJobLineItem`, `renderLineItems`, `buildEstimateSummary`, `sendEstimateAssistant`, `renderAssistantMsgs`, `clearEstimateAssistant` (whole-job AI that adds custom charges like Sheetrock and can update any room by name; replaces the removed per-room AI chat)

### Calculation & bid generation
`calc`, `recalcAll`, `recalcRoom`, `jobExtras`, `renderBid`, `toggleBid`, `shareBid`, `saveClientFromBid`, `copyBidForQuickBooks`

### Railings, treads, pergolas & shot rounding
`shotFt`, `addPergolaSection`, `removePergolaSection`, `updatePergolaSection`, `renderPergolaSections`, `armPergolaShot`, `addRailSection`, `removeRailSection`, `updateRailSection`, `renderRailSections`, `updateRoomTreads`, `armRailShot`, `_railId`, `_seedSectionCounters` (the last one reseeds the soffit/porch/deck id counters after a job loads - they reset to 0 on reload, so "+ Add Section" on a loaded job used to hand out an id already in use and edits landed on the wrong row)

**Copy for QuickBooks (`copyBidForQuickBooks`):** A 📗 button on the bid output builds a plain-text estimate block and copies it. James pastes it into a normal Claude chat with the QuickBooks connector to enter the estimate with no re-typing — the bridge is app → Claude → QuickBooks (the single-file PWA can't call Intuit's API directly). **Every row the bid shows becomes its own QuickBooks line:** Project Services (room/side labor only), Paint & Materials, then Power Washing, Doors, Windows, Shutters, and each custom charge — so exterior work like a house wash is visible in the books instead of buried inside one number. The line amounts sum to the bid total exactly (`mat + roomLab + ex.total`, same as `renderBid`). Descriptions are built from the job, not boilerplate: the surfaces actually toggled on (siding, soffits, porch ceilings, decks, trim — in that fixed order), the real coat count, the product name when the whole job uses one, and per-side square footage listed under Project Services (sf only, never a rate or a per-side price). An exterior estimate mentions power washing **only** when washing was priced, and carries a weather-dependent schedule note. When `bidScopeText` is set (the AI-written project description), it becomes the Project Services description so the books read like the customer's document. A wash-only / extras-only job with no measured sides copies fine — the only guard is a zero total. `_qbFallback()` shows the text for manual copy when the clipboard API is blocked. The block also asks the connector to create a QuickBooks Pay-Now link for the deposit (or total). Helpers: `_qbSectSF`, `_qbList`, `_qbProduct`, `_qbNum`.

**Pay by Card (QuickBooks) (`payByCardQuickBooks`):** Optional reusable QuickBooks payment link (`ingersoll_qb_paylink_v1`, set in Settings → Payments). When set, a 💳 button appears on the bid output (in-person collection) and the link rides on the proposal doc (`doc.qbPayLink`); `proposal.html` shows a client Pay-by-Card button (`maybeQuickBooksPay()`) when a link is present and no exact-amount Stripe deposit is configured (Stripe takes precedence).

**Professional Proposal (`openProProposal`):** composes a polished client-facing proposal (Scope, About the Product, Project Investment table, warranty, disclaimer) from the current job. **Standard format is a per-room itemized breakdown:** `_proDefaultAreas` pre-fills one area card per room (Walls/Ceiling/Floor/Trim lines from the room's measurements and rates via `_proRoomItems`) plus an "Additional Services" area for doors/windows/shutters/washing/custom charges. Each area = name + label/amount lines, all editable in the modal (`_proAddArea` / `_proAddAreaItem` / `_proAreasData`); `_proUseSingle()` / `_proUseAreas()` toggle back to a single Project Services number. `proProposalHtml(v, withSignature)` renders the Georgia layout with a shaded header row per area, per-area subtotals, and a Total Project Investment row; the paint + Volume Discount lines render only when gallons/retail are set (zero them for an everything-included price, which swaps in an "includes all labor, paint, and materials" note). Money fields stay editable with a live total (`_proRecalc`). Sends via `_sendProposal` (shared with `createProposal`), previews/prints via `_proOpenPrint`. **Written bids** (`sendWrittenBid` → `_bidTextToHtml`) let any pasted bid become a signable proposal. Reachable from the bid output and Settings → Proposals & Signatures.

### Labor rates
`loadRates`, `saveRates`, `syncRatesUI`, `toggleRatesCard`, `updateGlobalRate`, `toggleRoomRates`, `updateRoomRate`

### Bluetooth
`connectBT`, `disconnectBT`, `handleBtButton`, `setBtnState`, `setStatus`, `charProps`, `onMeasurement`, `onBTDrop`, `applyMeasurement`, `setReshootTarget`, `armDimShot`, `openDebug`, `closeDebug`, `dbgLog`, `clearLog`, `updateDebugStatus`, `sendManual`, `showServices`

### Voice
`toggleVoice`, `startVoice`, `stopVoice`, `processVoiceCommand`, `applyVoiceCorrections`, `parseSpokenNumber`, `wordToNum`, `wordToNumSingle`

### Contacts (Clients sub-tab)
`loadContacts`, `saveContacts`, `renderContacts`, `openContactModal`, `closeContactModal`, `saveContact`, `deleteContact`, `buildContactCard`, `buildQuickTexts`, `toggleQuickTexts`, `setStatusFilter`, `showServices`

### Projects — ⚠️ RETIRED UI (section 17); functions remain, no buttons
`projLoad`, `projSave`, `renderProjects`, `openProjectModal`, `closeProjectModal`, `saveProject`, `deleteProject`, `projAddTask`, `projToggleTask`, `renderProjTasks`

### Notes — ⚠️ RETIRED UI (section 17); functions remain, no buttons
`notesLoad`, `notesSave`, `renderNotes`, `openNoteModal`, `closeNoteModal`, `saveNote`, `deleteNote`

### Materials (Lists)
`materialsLoad`, `materialsSave`, `renderMaterials`, `openMaterialsModal`, `closeMaterialsModal`, `renderMlItems`, `mlAddItem`, `mlPullFromEstimator`, `mlCopyToClipboard`, `saveMaterials`, `deleteMaterials`

### Apt Pricing — ⚠️ RETIRED UI (section 17); functions remain, no tab
`aptLoad`, `aptSaveData`, `aptRender`, `aptRenderActive`, `aptOpenAddLoc`, `aptCloseLocModal`, `aptSaveLoc`, `aptRemoveLoc`, `aptSelectLoc`, `aptOpenAddUnit`, `aptCloseUnitModal`, `aptSaveUnit`, `aptRemoveUnit`

### Supplies (Apt sub-section) — ⚠️ RETIRED UI (section 17)
`supplyLoad`, `supplySave`, `renderSupplies`, `openSupplyModal`, `closeSupplyModal`, `saveSupply`, `deleteSupply`

---

## 12. Editing workflow

- **Deployment method:** Navigate to `PaintPro-ZFold.html` in GitHub web editor → Ctrl+A → paste entire file → commit to `main` → Netlify auto-deploys in ~60 seconds
- The file is ~690 KB with an embedded base64 logo — too large for Google Drive MCP upload; use GitHub web editor
- `str_replace` is the preferred tool for Claude Code — small, targeted edits keep diffs reviewable
- For large new features, edits typically come in 3-5 chunks: HTML markup, JS state, JS functions, voice commands, CSS additions if needed
- **Always view the current file state before str_replace** — earlier views go stale after edits

---

## 13. Communication preferences (the user)

James:
- **ALWAYS make links clickable.** Every URL you give James must be written in full with the `https://` prefix (e.g. `https://lovely-kitsune-6c5c82.netlify.app/PaintPro-ZFold.html`) so it renders as a tappable link on his phone. NEVER post a bare domain like `lovely-kitsune-6c5c82.netlify.app` — it shows as dead plain text and he cannot tap it. This is a firm, standing rule.
- **Uses voice-to-text.** Messages are brief, sometimes fragmented, with occasional speech recognition errors (e.g. "stores" for "doors", "weather" for "whether")
- **Prefers ready-to-use outputs** with minimal back-and-forth. When asking clarifying questions, use `ask_user_input_v0` with tappable options — typing on mobile is friction
- **When errors accumulate, prefers a full restart** of a feature over incremental fixes
- **Values directness and competence.** Skip preamble, lead with the answer
- **Treats Claude as a working collaborator**, not a chatbot — references shared history naturally ("we were working on…", "remember when…")
- **Operates on a tight schedule.** Don't over-engineer. Don't ask 5 questions when 1 will do. Don't ask any question if the answer is obviously inferable

### What James tends to want
- Concrete file deliverables (HTML, DOCX, PDF) over advice
- Bids and marketing materials matching his strict format rules (section 5)
- Real-world prices, dates, names — not placeholders
- Things that work first time on his phone, not theoretical solutions

### When in doubt
Build the most reasonable interpretation, deliver it, and offer to adjust. Don't block on questions James doesn't care about.

---

## 14. Known patterns & lessons learned

### CSS pitfalls
- **Watch out for orphaned `@media` blocks.** A missing `@media print {` opener once caused a complete black-screen bug where all the print-only "hide everything except bid" rules applied to the screen view. If editing CSS structure, verify brace balance and that every print-style rule is properly wrapped.

### Voice recognition
- Web Speech sometimes mishears domain-specific words. The `VOICE_CORRECTIONS` table handles the most common ones. If a new word consistently fails, add it there first.
- Voice patterns should always strip leading filler verbs before matching.
- **Number parser must handle hyphenated compounds.** Chrome returns "thirty-two" with a hyphen. `wordToNum`/`parseSpokenNumber` normalize hyphens and resolve compounds. A hyphenated form resolves to the whole number (32) while a *spaced* "thirty two" is treated as the feet-inches shorthand (30'2"). Don't break this disambiguation.
- Voice is continuous (`recognition.continuous = true`, restarts on `onend`) — mic stays on between commands.
- `maxAlternatives = 3` — the best alternative (one whose corrected form contains a known keyword) is selected, not just the top guess.
- `voiceLastMeasurement` tracks the last measurement for undo; reset to `null` after undo or when voice stops.

### Service worker cache
- Bumping `CACHE = 'paintpro-v1'` to `v2` forces a re-install for all existing PWA users. Use this when service worker logic changes, NOT for routine HTML edits (those are network-first).
- **Manual refresh:** Settings → 🔄 Refresh App runs `forceRefresh()` — updates the SW registration, clears all caches (only when online, so an offline user isn't stranded), and reloads fresh from the network. For when an installed PWA is showing a stale copy. Job data is untouched.

### Bluetooth
- Requires HTTPS — won't work on `file://`. Netlify provides HTTPS automatically.
- The DISTO D2's BLE characteristics aren't well-documented; the app uses a candidate list (`BLE_CANDIDATES`) and falls back to subscribing to every notify characteristic.
- **Measurement discoverability matters.** Every measurable field should have its own 📐 shoot button rather than relying on the dropdown.

### Data persistence
- The active job auto-saves to `ingersoll_active_job_v1` on every change. **Anything the user enters in the field must survive a phone reboot, accidental tab close, or low-battery shutdown.**
- When adding any new persistent field, extend `getJobSnapshot()` and `applyJobData()` together.
- A visible save indicator is part of the contract — silently saving without confirmation isn't enough.
- Room photos go to IndexedDB, not localStorage; job snapshots carry only photo IDs (`getJobSnapshot()` strips blobs). `renderRoomPhotoStrip()` reloads blobs from IndexedDB after `applyJobData()`.

### Mobile viewport quirks
- The Z Fold 5's narrow-screen mode is ~380px wide.
- The on-screen keyboard pushes the BT bar up — handled by `--safe-b` and sticky positioning.

---

## 15. Open questions / known TODOs

- **Railing $8.00/lf and tread $15 each are placeholder defaults** — James should replace them with his own pricing. (Pergola's $6.00/sf is researched — see the pergola notes in section 7.)
- **Lowe's price lookup is intentionally NOT in the app.** Materials list → 📋 copy → paste into a Claude chat → prices back. Don't add live price lookup.
- **Logo-based PWA icons are current.** The old "IP monogram" placeholders are obsolete.
- **Offered and deferred, still worth doing:** carry the rest of a room's settings (product, coats, surface toggles) forward to the next room — ceiling height already does; and the bid's ~12-button stack in 9 colours needs one clear primary action (the audit found "Send this Bid for Signature" sitting 4th of 12, ~2,748px down the page).
- **Tom Skeffington's $9,169 exterior proposal is deliberately NOT in QuickBooks** — James asked to hold. There is no "Skeffington" customer there, and the connector's fuzzy search confidently offers three *wrong* Toms (McConkey 99.6%, Johnston, Needle). **Never trust `best_match` on a name that isn't an exact hit.**
- **Most of James's estimates from the last 8–10 months live in past Claude chats**, not in QuickBooks or the app.

---

## 16. When you start a new session

1. **Read this file, especially section 17.** A lot was cut from this app on purpose. Do not offer to rebuild it.
2. The repo is the source of truth — `git log --oneline -30` shows recent work. Don't ask James to paste the HTML; read it.
3. **Verify before you claim.** This app prices real jobs; a wrong number costs money. Drive the running app with Playwright — serve the folder, load `PaintPro-ZFold.html`, block `gstatic`/`googleapis`, and use a **380px** viewport for the Fold cover screen and **880px** unfolded.
4. Deploy = commit to `main`; Netlify picks it up in ~60s. **Other sessions push to this repo too** — if a push is rejected, fetch and rebase onto `origin/main`. Never force over someone else's work.
5. Tell James to pull changes with **⚙️ Settings → 🔄 Refresh App** (he cannot see a change until he does).

---

## 17. REMOVED ON PURPOSE — do not re-add without asking

James cut these after using the app on real jobs. **Do not rebuild them, do not suggest them, and do not "restore" them because they look missing.** In every case the code and any saved data were left in place, so nothing was destroyed and a revert is small — but ask first.

| Removed | Why | What was left behind |
|---|---|---|
| **🏢 APT PRICING tab** | Early experiment, never used | Tab button gone; `#apt-section`, the apt code and `ingersoll_apt_pricing_v1` all intact. `switchTab()` is null-guarded |
| **🖨️ Print Hub** (settings card + "Send to Home Printer" on the bid) | Needed a PC running a Python script at home; never used | `printAtHome()` and the secret helpers remain, unreferenced. See 7.6 |
| **👂 HearSay** | A separate standalone app that PaintPro only linked to. Nothing flowed between them and it needed its own API key | Card gone and dropped from the SW precache. `hearsay.html` still in the repo, still reachable by URL |
| **📋 Projects sub-tab** | Duplicated saved Jobs and never linked to a client | Pane, code and `ingersoll_projects_v1` intact; sub-nav button + 2 voice commands removed |
| **📝 Notes sub-tab** | A scratchpad attached to nothing; the estimate has its own Notes field and the Estimate Assistant | Pane, code and `ingersoll_notes_v1` intact; sub-nav button + 2 voice commands removed |
| **💳 Stripe deposit card** | James is using QuickBooks for payments | All Stripe code and the `worker.js` handlers remain. `depositEnabled()` returns false so the deposit UI simply doesn't render. See 7.8 |
| **Per-room AI chat boxes** | One inside every room card was clutter | Replaced by the single **Estimate Assistant**. `sendAIChat` / `openAIChat` remain; their UI is gone |
| **Duplicate menu cards** | "Proposals & Signatures" and "Shared Files" each appeared BOTH as a quick action and as a settings card | Quick actions kept, duplicate cards removed |
| **"Send a Written Bid" quick action** | Superseded by **📥 BRING IN A BID**, which covers paste *and* file import | `sendWrittenBid()` still used by the new screen |

**Settled decisions — do not re-litigate:**
- **Payments = QuickBooks, not Stripe.** Per-job Pay-Now links are created through the QuickBooks connector in a normal Claude chat. A single reusable fixed-amount link was considered and rejected: QuickBooks multi-use links carry a fixed amount and deposits vary per job.
- **No live Lowe's/price lookup in the app.** Materials list → copy → paste into a Claude chat.
- **Do not split the single HTML file.**
- **⚠️ Secrets and the repo.** The old `PRINT_HUB_TOPIC` (an ntfy.sh topic, effectively a bearer token) was **blanked in both `PaintPro-ZFold.html` and `print_hub.py` on Aug 31 2026** — it had been committed to a public repo, so anyone could have pushed print jobs to James's home printer. It remains in git history; if the print hub is ever revived, generate a **new** topic and keep it out of version control. `LISA_EMAIL` is still in the file — a work email, low risk, ask James before touching it.
- **Do not put secrets in the app or the repo.** The Anthropic key is device-local but synced to the user's own Firestore; `STRIPE_SECRET_KEY` lives only as a Cloudflare env var.

---

*Last updated: August 31, 2026 — **Sections 6, 15, 16 and 17 corrected after a fresh session started proposing features James had deliberately removed.** The tab list said four tabs (it is three; APT is gone) and the Clients sub-nav still listed Projects and Notes (it is Clients | Materials). Added **section 17 "REMOVED ON PURPOSE"** listing every cut feature, why it went, what code/data was left behind, and the settled decisions not to re-litigate. Print Hub (7.6) and the Stripe deposit card (7.8) are flagged as built-but-removed-from-the-UI. Earlier history below.*

*Previously: August 31, 2026 (Section 2 rewritten against the actual repo - it had drifted to listing 12 fewer files than exist, a LICENSE that was gone, and an app less than half its real size. `hearsay.html` is a retired app, not part of PaintPro.) Previously the same day: (Pergolas / arbors added as a measured exterior surface at a researched $6.00/sf footprint rate, flowing into the bid, the client proposal and the QuickBooks copy.) Previously the same day: (Field-workflow pass so the app matches the paper sheet: laser shots round to whole feet via `shotFt`, ceiling height carries forward to the next side, and railings + stair treads are entered per side like decks instead of one summed whole-job box. Also closed a money gap - the client proposal and QuickBooks copy still gated measured porch ceilings and decks on the surface toggles that `calc()` had already stopped using, and the proposal never listed railings or treads at all, so a signed proposal could total well under the bid.) Previously: August 25, 2026 (Copy for QuickBooks now itemizes exterior work — power washing, shutters, doors, windows and custom charges each get their own line, and the descriptions come from the job data). Previously: June 11, 2026 (full diagnostic sweep: voice reliability layer restored after regression — mishear corrections, undo, room naming, fractions, hyphenated compounds, maxAlternatives=3; measurement routing now follows the open room card; quota-safe saves via `safeSet()`; Firestore sync stale-write guard; AI JSON extraction hardened via `extractAIJson()`; service worker v5 only caches OK responses). If you make substantial changes to the app structure, update this file in the same commit.*
