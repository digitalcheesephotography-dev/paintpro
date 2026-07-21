# CLAUDE.md

Reference document for AI assistants (Claude Code, future Claude chat sessions) working on this repository. Read this first before making changes.

---

## 1. What this project is

**PaintPro** is a single-file Progressive Web App used in the field by **Ingersoll Painting LLC** (Hannibal, NY — owner James Bailey, est. 1978) to take room measurements, log job data, and generate painting bids. It runs on a Samsung Galaxy Z Fold 5 in the truck and on job sites. The whole app is one self-contained HTML file plus a manifest, service worker, and icons.

- **Repository:** `github.com/digitalcheesephotography-dev/paintpro`
- **Deploy:** Netlify auto-deploys ~60 seconds after a commit to `main`
- **Live URL:** `lovely-kitsune-6c5c82.netlify.app`
- **Primary user:** James Bailey, sole operator. No team contributors.

---

## 2. Repository layout

```
paintpro/
├── PaintPro-ZFold.html       # The entire app (~4,050 lines, ~360 KB)
├── print_hub.py              # PC-side print hub script — run on home computer to receive auto-print jobs
├── proposal.html             # Standalone client e-signature page (opened by homeowners via a shared link)
├── visualizer.html           # Standalone homeowner color visualizer — tap-wall recolor + "get a quote" lead
├── manifest.json             # PWA manifest (name, icons, theme, start URL)
├── sw.js                     # Service worker — offline cache, network-first for HTML
├── icon-192.png              # PWA icon, full-bleed
├── icon-512.png              # PWA icon, full-bleed
├── icon-maskable-192.png     # PWA icon, with safe-zone padding for Android adaptive icons
├── icon-maskable-512.png     # PWA icon, with safe-zone padding for Android adaptive icons
├── apple-touch-icon.png      # 180×180 for iOS home screen
├── favicon-32.png            # 32×32 tab favicon
├── LICENSE
└── README.md
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
- **localStorage** — for all job/client/project/notes/materials/apt data
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
2. **CLIENTS** (`#tab-contacts` → `#contacts-section`) — sub-nav for Clients, Projects, Materials, Notes
3. **APT PRICING** (`#tab-apt` → `#apt-section`) — property/unit pricing reference

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
- `subnav-projects` → `#sub-projects` — project tracking with task checklists
- `subnav-materials` → `#sub-materials` — per-job materials lists with copy-to-clipboard
- `subnav-notes` → `#sub-notes` — general notes

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

### 7.6 Auto-Print Hub
- `const PRINT_HUB_TOPIC = ''` — set this to a hard-to-guess ntfy.sh topic name to enable
- `printAtHome()` — sends the current bid as plain text to `ntfy.sh/{topic}` via HTTP POST
- `print_hub.py` (in repo root) — Python script that runs on the home PC; streams from ntfy.sh and opens the bid in a local browser page with `window.print()` auto-triggered
- Requires internet on both phone and home PC; the phone sends the job, the PC listens and prints
- Setup: `pip install requests` on PC, set matching topic in both files, run `python print_hub.py`
- Auto-start on Windows: shortcut to `pythonw print_hub.py` in `shell:startup` folder

### 7.8 Online deposit collection (Stripe) — built
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
- **Custom charges:** `jobLineItems = [{label, amount}]` — whole-job line items (Sheetrock, staining, power washing, etc.). `addJobLineItem()` / `removeJobLineItem()` / `renderLineItems()` (list in the assistant card with ✕ remove). They flow into totals via `jobExtras().lineItems` / `.lineItemsTotal` (added into `jobExtras().total`), so every consumer (`recalcAll`, `renderBid`, deposit, QuickBooks copy, pro proposal) picks them up automatically. `renderBid` shows each as its own row.
- **Assistant:** `sendEstimateAssistant()` sends the chat with a system prompt containing `buildEstimateSummary()` (rooms, extras, charges, total). The model replies briefly and, when it changed something, appends a final `{"actions":[...]}` line. Two action types: `addLineItem{label,amount}` → `addJobLineItem`; `updateRoom{room,update}` → matches a room by name and calls `applyAIRoomResult` (so the one assistant can also correct any room's measurements). `renderAssistantMsgs()` / `clearEstimateAssistant()`. Uses `callAI(...,'claude-sonnet-4-6',600,system)` like the old room chat.
- **QuickBooks copy** lists custom charges as their own lines; Project Services = `lab - lineItemsTotal` so the QuickBooks total isn't double-counted.
- **Persistence:** `jobLineItems` and `assistantChat` are in `getJobSnapshot()` / `applyJobData()` (and reset in `startNewJob` / `clearMeasurements`). No new localStorage key — they live inside the job snapshot.

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
| `ingersoll_projects_v1` | Projects array |
| `ingersoll_notes_v1` | Notes array |
| `ingersoll_materials_v1` | Materials lists array |
| `ingersoll_apt_pricing_v1` | Apt pricing locations/units |
| `ingersoll_supplies_v1` | Supplies (apt sub-section) |
| `ingersoll_pin_v1` | App Lock PIN (PBKDF2-SHA256 salt+hash; device-local, NOT synced) |
| `ingersoll_bio_v1` | App Lock WebAuthn credential id for fingerprint unlock (device-local) |
| `ingersoll_proposals_v1` | Sent e-signature proposals (id, client, status, url, signer; device-local) |
| `ingersoll_emailjs_v1` | EmailJS config {serviceId, templateId, publicKey} for auto-emailing signed-proposal copies (device-local) |
| `ingersoll_deposit_v1` | Online-deposit config {enabled, pct} for Stripe deposit collection on signed proposals (device-local) |
| `ingersoll_qb_paylink_v1` | Reusable QuickBooks payment link URL for the 💳 Pay by Card (QuickBooks) button (device-local) |

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
`buildBackup`, `backupToDrive`, `restoreFromBackup`, `deleteAllMyData` (privacy right-to-delete: wipes local + Firestore `SYNC_KEYS` docs + `paintpro-photos` IndexedDB, double-confirmed)

### Estimate Assistant & custom charges
`addJobLineItem`, `removeJobLineItem`, `renderLineItems`, `buildEstimateSummary`, `sendEstimateAssistant`, `renderAssistantMsgs`, `clearEstimateAssistant` (whole-job AI that adds custom charges like Sheetrock and can update any room by name; replaces the removed per-room AI chat)

### Calculation & bid generation
`calc`, `recalcAll`, `recalcRoom`, `jobExtras`, `renderBid`, `toggleBid`, `shareBid`, `saveClientFromBid`, `copyBidForQuickBooks`

**Copy for QuickBooks (`copyBidForQuickBooks`):** A 📗 button on the bid output builds a plain-text estimate block (Customer, address, Project Services = labor + door/window/shutter extras, Paint & Materials = the bid's materials line, total = the bid total, plus a deposit line when `depositEnabled()`) and copies it. James pastes it into a normal Claude chat with the QuickBooks connector to enter the estimate with no re-typing — the bridge is app → Claude → QuickBooks (the single-file PWA can't call Intuit's API directly). Figures mirror `renderBid` exactly so books match the bid. `_qbFallback()` shows the text for manual copy when the clipboard API is blocked. The block also asks the connector to create a QuickBooks Pay-Now link for the deposit (or total).

**Pay by Card (QuickBooks) (`payByCardQuickBooks`):** Optional reusable QuickBooks payment link (`ingersoll_qb_paylink_v1`, set in Settings → Payments). When set, a 💳 button appears on the bid output (in-person collection) and the link rides on the proposal doc (`doc.qbPayLink`); `proposal.html` shows a client Pay-by-Card button (`maybeQuickBooksPay()`) when a link is present and no exact-amount Stripe deposit is configured (Stripe takes precedence).

**Professional Proposal (`openProProposal`):** composes a polished client-facing proposal (Scope, About the Product, Project Investment table, warranty, disclaimer) from the current job. All money fields (`pp-mat`/`pp-disc`/`pp-svc`) pre-fill from `calc` but are editable with a live total (`_proRecalc`); `proProposalHtml(v, withSignature)` renders the Georgia layout. Sends via `_sendProposal` (shared with `createProposal`), previews/prints via `_proOpenPrint`. **Written bids** (`sendWrittenBid` → `_bidTextToHtml`) let any pasted bid become a signable proposal. Reachable from the bid output and Settings → Proposals & Signatures.

### Labor rates
`loadRates`, `saveRates`, `syncRatesUI`, `toggleRatesCard`, `updateGlobalRate`, `toggleRoomRates`, `updateRoomRate`

### Bluetooth
`connectBT`, `disconnectBT`, `handleBtButton`, `setBtnState`, `setStatus`, `charProps`, `onMeasurement`, `onBTDrop`, `applyMeasurement`, `setReshootTarget`, `armDimShot`, `openDebug`, `closeDebug`, `dbgLog`, `clearLog`, `updateDebugStatus`, `sendManual`, `showServices`

### Voice
`toggleVoice`, `startVoice`, `stopVoice`, `processVoiceCommand`, `applyVoiceCorrections`, `parseSpokenNumber`, `wordToNum`, `wordToNumSingle`

### Contacts (Clients sub-tab)
`loadContacts`, `saveContacts`, `renderContacts`, `openContactModal`, `closeContactModal`, `saveContact`, `deleteContact`, `buildContactCard`, `buildQuickTexts`, `toggleQuickTexts`, `setStatusFilter`, `showServices`

### Projects
`projLoad`, `projSave`, `renderProjects`, `openProjectModal`, `closeProjectModal`, `saveProject`, `deleteProject`, `projAddTask`, `projToggleTask`, `renderProjTasks`

### Notes
`notesLoad`, `notesSave`, `renderNotes`, `openNoteModal`, `closeNoteModal`, `saveNote`, `deleteNote`

### Materials (Lists)
`materialsLoad`, `materialsSave`, `renderMaterials`, `openMaterialsModal`, `closeMaterialsModal`, `renderMlItems`, `mlAddItem`, `mlPullFromEstimator`, `mlCopyToClipboard`, `saveMaterials`, `deleteMaterials`

### Apt Pricing
`aptLoad`, `aptSaveData`, `aptRender`, `aptRenderActive`, `aptOpenAddLoc`, `aptCloseLocModal`, `aptSaveLoc`, `aptRemoveLoc`, `aptSelectLoc`, `aptOpenAddUnit`, `aptCloseUnitModal`, `aptSaveUnit`, `aptRemoveUnit`

### Supplies (Apt sub-section)
`supplyLoad`, `supplySave`, `renderSupplies`, `openSupplyModal`, `closeSupplyModal`, `saveSupply`, `deleteSupply`

---

## 12. Editing workflow

- **Deployment method:** Navigate to `PaintPro-ZFold.html` in GitHub web editor → Ctrl+A → paste entire file → commit to `main` → Netlify auto-deploys in ~60 seconds
- The file is ~360 KB with an embedded base64 logo — too large for Google Drive MCP upload; use GitHub web editor
- `str_replace` is the preferred tool for Claude Code — small, targeted edits keep diffs reviewable
- For large new features, edits typically come in 3-5 chunks: HTML markup, JS state, JS functions, voice commands, CSS additions if needed
- **Always view the current file state before str_replace** — earlier views go stale after edits

---

## 13. Communication preferences (the user)

James:
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

- **Doors & Windows card placement.** Currently sits between "+ Add Room" and the Notes field. James hasn't decided whether to move it (top of estimator / inside each room card / new tab).
- **Logo-based icons deployed.** PWA icons were regenerated from the actual Ingersoll Painting logo. Earlier "IP monogram" placeholder icons are obsolete.
- **Lowe's price lookup is intentionally NOT in the app.** Workflow: build materials list in app → tap 📋 copy → paste into Claude chat → get prices back. Don't add live price lookup to the HTML.

---

## 16. When you start a new session

1. Read this file
2. Ask the user to share the latest `PaintPro-ZFold.html` if working on a code change (the file in the repo may be ahead of what's in your context)
3. Verify any assumption about current state by viewing the file before editing
4. Test changes locally with Playwright before delivering
5. Deliver via `present_files` so the user can download in one tap

---

*Last updated: June 11, 2026 (full diagnostic sweep: voice reliability layer restored after regression — mishear corrections, undo, room naming, fractions, hyphenated compounds, maxAlternatives=3; measurement routing now follows the open room card; quota-safe saves via `safeSet()`; Firestore sync stale-write guard; AI JSON extraction hardened via `extractAIJson()`; service worker v5 only caches OK responses). If you make substantial changes to the app structure, update this file in the same commit.*
