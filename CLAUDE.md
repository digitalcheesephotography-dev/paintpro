# CLAUDE.md

Reference document for AI assistants (Claude Code, future Claude chat sessions) working on this repository. Read this first before making changes.

---

## 1. What this project is

**PaintPro** is a single-file Progressive Web App used in the field by **Ingersoll Painting LLC** (Hannibal, NY — owner James Bailey, est. 1978) to take room measurements, log job data, and generate painting bids. It runs on a Samsung Galaxy Z Fold 5 in the truck and on job sites. The whole app is one self-contained HTML file plus a manifest, service worker, and icons.

- **Repository:** `github.com/digitalcheesephotography-dev/paintpro`
- **Deploy:** Netlify auto-deploys ~60 seconds after a commit to `main`
- **Live URL:** Netlify-assigned domain (referenced verbally as "the Netlify URL")
- **Primary user:** James Bailey, sole operator. No team contributors.

---

## 2. Repository layout

```
paintpro/
├── PaintPro-ZFold.html       # The entire app (~2,854 lines, ~300 KB)
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
- **No backend.** All data lives in `localStorage`.
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
- **localStorage** — for persistence
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

These rules apply to bid PDFs/DOCX James generates **outside** the app (in chat), but the in-app bid output (`renderBid()`) follows them too.

- **Font:** Georgia for bid documents (not the app fonts). The in-app bid uses system serif as a proxy.
- **No em dashes** (`—`) anywhere in bid output. Use a hyphen, comma, or rephrase.
- **Single "Project Services" line item** — never break out labor hours/rates per task.
- **Embedded Ingersoll Painting logo** at the top.
- **About the Product section** describing the paint products used.
- **1-Year Workmanship Warranty** clause included.
- **Paint disclaimer:** *"Based on the size and specifics of your project, the paint cost & materials are an estimate. Pricing may be adjusted if more paint & materials are needed. Labor costs are estimated also, based on the expected scope of work. If unforeseen issues arise during the project, adjustments may be necessary."*
- **Output both DOCX and PDF** when delivering finished bids.

---

## 6. App structure

### Top-level tabs (`#tab-bar`)
1. **ESTIMATE** (`#tab-estimate` → `#estimator-section`) — room-by-room measurements + doors/windows + bid generation
2. **CLIENTS** (`#tab-contacts` → `#contacts-section`) — sub-nav for Clients, Projects, Materials, Notes
3. **APT PRICING** (`#tab-apt` → `#apt-section`) — property/unit pricing reference

### Estimator tab order (top to bottom)
1. Client name + Job address inputs
2. Room cards (each: name, walls, height, floor/ceiling dims, surface toggles, product, coats)
3. `+ ADD ROOM / AREA` button
4. **🚪 🪟 Doors & Windows card** (whole-job, not per-room)
5. Notes textarea
6. Materials/Labor/Total totals strip (auto-shows when there's data)
7. `GENERATE BID SUMMARY` button (auto-shows when there's data)
8. Bid output (`#bid-out`) — appears when generate is tapped

### Clients tab sub-nav (`switchSubnav()`)
- `subnav-clients` → `#sub-clients` — contact list with status filters
- `subnav-projects` → `#sub-projects` — project tracking with task checklists
- `subnav-materials` → `#sub-materials` — 🛒 per-job materials lists with copy-to-clipboard
- `subnav-notes` → `#sub-notes` — general notes

### Sticky bottom BT bar (`#bt-bar`, fixed position)
- Connect/Disconnect Leica DISTO D2 button
- Target-field selector (which input the next BT measurement fills)
- Target-room selector (which room the measurement applies to)
- 🎤 Voice command mic
- ⚙ Settings / debug panel (also contains the voice commands cheat sheet)

### Modals
- `#supply-modal` — add/edit paint supply reference items
- `#contact-modal` — add/edit clients
- `#project-modal` — add/edit projects with task list
- `#note-modal` — add/edit general notes
- `#materials-modal` — add/edit per-job materials lists

---

## 7. Data model

### Global state (in-memory, resets on reload)
```js
let rooms       = [];     // array of room objects
let roomCount   = 0;      // monotonically increasing id counter
let btDevice    = null;   // BLE device handle
let btConnected = false;
let activeChar  = null;   // active BLE characteristic
let bidOpen     = false;  // is the bid output currently visible?
let job = { doorCount: '', doorPrice: '75', winCount: '', winPrice: '50' };
```

### Room shape
```js
{
  id: 'r1',              // 'r' + auto-incrementing counter
  name: 'Living Room',
  walls: [{id:'w1', ft:'12'}, {id:'w2', ft:'14'}, ...],  // any number of walls
  height: '8',
  floorLength: '12',
  floorWidth: '14',
  surfaces: { walls:true, ceiling:false, trim:false, floor:false },
  product: 'BM Regal Select (Int)',   // string matching a PRODUCTS entry name
  coats: '2',
  open: true              // is the card expanded?
}
```

### Persisted data (localStorage keys, all suffixed `_v1`)
| Key                          | Shape                                          |
|------------------------------|------------------------------------------------|
| `ingersoll_contacts_v1`      | array of `{id, name, phone, email, address, status, notes, ...}` |
| `ingersoll_projects_v1`      | array of `{id, name, client, status, date, value, notes, tasks: [{id, text, done}]}` |
| `ingersoll_notes_v1`         | array of `{id, title, body, createdAt, updatedAt}` |
| `ingersoll_materials_v1`     | array of `{id, title, items: [{id, name, qty, bought}], createdAt, updatedAt}` |
| `ingersoll_supplies_v1`      | array of `{id, name, category, price, coverage, notes}` |
| `ingersoll_apt_pricing_v1`   | `{locations: [{id, name, units: [{id, type, price, ...}]}], activeLocId}` |

**Versioning convention:** suffix every key with `_v1`. If a shape changes incompatibly, bump to `_v2` and write a migration. Don't silently mutate existing keys.

**`rooms` and `job` are NOT persisted** — they live in memory only. This is intentional: each job is a fresh measurement session.

### Pricing constants (lines 20–31 of the JS)
```js
const PRODUCTS = [/* 8 paint products with name + price + coverage */];
const LABOR    = { walls:1.85, ceiling:1.65, trim:3.50 };  // $/sf or $/lf per coat
const MARKUP   = 1.20;                                      // 20% materials markup
```

Door / window pricing defaults: **$75/door, $50/window** — these match James's standard bids. Stored on the `job` object, editable per session.

---

## 8. Key calculations (in `calc(room)`)

For each room with toggleable surfaces:
- **Walls SF** = perimeter × height (perimeter = sum of all wall lengths)
- **Ceiling SF** = floorLength × floorWidth
- **Floor SF** = floorLength × floorWidth
- **Trim LF** = perimeter
- **Gallons** = totalSF × coats ÷ product.coverage, rounded up
- **Materials cost** = gallons × product.price × MARKUP
- **Labor cost** = (wallSF × LABOR.walls + ceilingSF × LABOR.ceiling + ...) × coats
- **Door/window extras** = job.doorCount × job.doorPrice + job.winCount × job.winPrice. **Rolls into LABOR total** (not materials), since the per-unit rate is labor-only — paint comes from the bulk gallon calc.

`recalcAll()` runs after every input change and updates the totals strip + bid output if visible.

---

## 9. Voice commands

Implemented in `processVoiceCommand(text)`. Patterns are case-insensitive and support natural variations including leading filler verbs ("add", "put", "set", "make it", "do", "gimme", "change to").

| Category       | Example phrases                                                     |
|----------------|---------------------------------------------------------------------|
| Measurements   | "wall fourteen", "wall twelve five" (12'5"), "height nine", "length twenty", "width sixteen" |
| Doors/Windows  | "six doors", "doors six", "add seventeen doors", "put twelve windows" |
| Switch tabs    | "estimator", "clients", "projects", "materials", "notes", "apt pricing" |
| Add new        | "add room", "add client", "add project", "add note", "add materials" |
| Actions        | "generate bid", "connect bluetooth"                                  |

Spoken numbers ("seventeen", "twenty-five") are handled by `wordToNum()` and `parseSpokenNumber()`. The full cheat sheet is shown to the user in the ⚙ debug panel (first card).

**When adding new voice patterns:** put them BEFORE the measurement section in `processVoiceCommand()` so specific commands win. Always include both word-order variants ("six doors" AND "doors six") plus filler-verb tolerance.

---

## 10. PWA infrastructure

### `manifest.json`
- `start_url: ./PaintPro-ZFold.html`
- `display: standalone` (full-screen, no browser chrome)
- `theme_color: #2baae1`
- `background_color: #0d1117`
- 4 icon entries: two regular (`any`), two maskable

### `sw.js` (service worker)
- **Cache name:** `paintpro-v1` — **bump this version number** if the service worker logic itself changes (forces re-install on existing devices)
- **Strategy:** network-first for HTML (so updates show immediately when online), cache-first for static assets (icons, manifest)
- **Offline fallback:** if the user is offline, falls back to cached `PaintPro-ZFold.html`
- **App shell:** pre-cached on install

### Install prompt
Custom banner shown via `beforeinstallprompt` event handler at the bottom of the HTML. Dismissal is stored as `pwa_install_dismissed=1` in localStorage so it doesn't nag.

---

## 11. Development workflow

### James's normal workflow (production)
1. Open chat with Claude on phone
2. Describe a feature or bug
3. Claude provides updated `PaintPro-ZFold.html`
4. James downloads it, opens GitHub on phone (or laptop), navigates to `digitalcheesephotography-dev/paintpro/edit/main/PaintPro-ZFold.html`
5. Ctrl+A → Delete → paste new content → Commit
6. Netlify auto-deploys in ~60 seconds
7. Hard-refresh on phone

**PWA infrastructure files (manifest, sw, icons) are uploaded once via the repo's main page → Add file → Upload files.** They rarely change.

### Local testing (when Claude makes changes)
The HTML uses Web Bluetooth, Web Speech, and Service Workers — these require **HTTP/HTTPS**, not `file://`. To test locally:

```bash
cd /path/to/repo
python3 -m http.server 8765
# Then navigate to http://localhost:8765/PaintPro-ZFold.html
```

For automated tests, Playwright is the standard:
```bash
# Available at /home/claude/.npm-global/lib/node_modules/playwright
# Use mobile viewport: { width: 380, height: 800 }
# Headless Chrome
```

### Verifying changes before delivering
Run all three before saying "done":
1. **Syntax check** — extract the JS block, run `node --check`
2. **Headless render** — load via Playwright, confirm zero JS errors and key UI elements visible
3. **Feature-specific test** — simulate the exact user interaction (click, fill, voice command) and verify expected output

### Editing the HTML
- `str_replace` is the preferred tool — small, targeted edits keep diffs reviewable
- For large new features (new sub-section, new modal), edits typically come in 3–5 chunks: HTML markup, JS state, JS functions, voice commands, CSS additions if needed
- **Always view the current file state before str_replace** — earlier views go stale after edits

---

## 12. Communication preferences (the user)

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

## 13. Known patterns & lessons learned

### CSS pitfalls
- **Watch out for orphaned `@media` blocks.** A missing `@media print {` opener once caused a complete black-screen bug where all the print-only "hide everything except bid" rules applied to the screen view. If editing CSS structure, verify brace balance and that every print-style rule is properly wrapped.

### Voice recognition
- Web Speech sometimes mishears domain-specific words ("doors" → "stores", "stairs"). Fuzzy matching can be added if a specific word consistently fails for James in the field.
- Voice patterns should always strip leading filler verbs before matching ("add six doors" works the same as "six doors").

### Service worker cache
- Bumping `CACHE = 'paintpro-v1'` to `v2` forces a re-install for all existing PWA users. Use this when service worker logic changes, NOT for routine HTML edits (those are network-first).

### Bluetooth
- Requires HTTPS — won't work on `file://`. Netlify provides HTTPS automatically.
- The DISTO D2's BLE characteristics aren't well-documented; the app uses a candidate list (`BLE_CANDIDATES`) and falls back to subscribing to every notify characteristic.

### Mobile viewport quirks
- The Z Fold 5's narrow-screen mode is ~380px wide. Test against this width in Playwright.
- The on-screen keyboard pushes the BT bar up — that's handled by `--safe-b` and the sticky positioning.

### Default pricing
- Door = $75 each (Cedarwood-style standard)
- Window = $50 each
- These are James's typical rates. Don't change defaults; he edits per job when needed.

---

## 14. Function map (quick reference)

Grouped by domain. All functions live in the single `<script>` block.

### Initialization & UI
`addRoom`, `removeRoom`, `setOpen`, `toggleOpen`, `renderRoom`, `renderWalls`, `addWall`, `removeWall`, `updateWall`, `updatePerimeterDisplay`, `refreshRoomSelect`, `switchTab`, `switchSubnav`, `toggleSurf`, `updateField`, `updateJobField`, `fmt`, `showToast`

### Calculation & bid generation
`calc`, `recalcAll`, `recalcRoom`, `jobExtras`, `renderBid`, `toggleBid`, `shareBid`, `saveClientFromBid`

### Bluetooth
`connectBT`, `disconnectBT`, `handleBtButton`, `setBtnState`, `setStatus`, `charProps`, `onMeasurement`, `onBTDrop`, `applyMeasurement`, `setReshootTarget`, `openDebug`, `closeDebug`, `dbgLog`, `clearLog`, `updateDebugStatus`, `sendManual`

### Voice
`toggleVoice`, `startVoice`, `stopVoice`, `processVoiceCommand`, `parseSpokenNumber`, `wordToNum`

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

## 15. Open questions / known TODOs

Things discussed but not yet implemented (as of last update):

- **Doors & Windows card placement.** Currently sits between "+ Add Room" and the Notes field. James was asked whether to move it (top of estimator / new tab / inside each room card) but hasn't decided yet.
- **Logo-based icons deployed.** The PWA icons were regenerated from the actual Ingersoll Painting logo and are in the repo. Earlier "IP monogram" placeholder icons should be considered obsolete.
- **Lowe's price lookup is intentionally NOT in the app.** Workflow is: build materials list in app → tap 📋 copy → paste into Claude chat → get prices back. Don't add live price lookup to the HTML.

---

## 16. When you start a new session

1. Read this file
2. Ask the user to share the latest `PaintPro-ZFold.html` if working on a code change (the file in the repo may be ahead of what's in your context)
3. Verify any assumption about current state by viewing the file before editing
4. Test changes locally with Playwright before delivering
5. Deliver via `present_files` so the user can download in one tap

---

*Last updated: May 22, 2026. If you make substantial changes to the app structure, update this file in the same commit.*
