# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

PaintPro is a single-file progressive web app for Ingersoll Painting LLC — a painting contractor's estimation, client management, and bid-generation tool. The entire application lives in **one HTML file**: `PaintPro-ZFold.html`. There is no build process, no package manager, no bundler, and no test suite.

## Development workflow

- **Edit**: Modify `PaintPro-ZFold.html` directly.
- **Run locally**: Open the file in Google Chrome. Web Bluetooth is blocked on `file://` URLs and shows an inline warning banner — this is expected. All other features (estimator, clients, projects, notes, apt pricing) work fully offline.
- **Deploy**: Upload `PaintPro-ZFold.html` to `ingersollpaintingllc.com/paintpro.html` (GoDaddy hosting). Bluetooth only works on HTTPS, so deployment to the live domain is required to test the DISTO laser measure integration.
- **Test Bluetooth**: Must be on Chrome (desktop or Android) over HTTPS. Samsung Internet, Firefox, and Safari do not support Web Bluetooth.

There is no linter, formatter, or CI pipeline configured.

## Architecture

The file is divided into three sections: `<style>` (CSS), `<body>` (HTML markup), and a single `<script>` block (all JavaScript). The script block begins at line ~890.

### Tabs and navigation

Three top-level tabs controlled by `switchTab(tab)`:
- `estimate` — room-by-room paint estimator + Bluetooth laser measure
- `contacts` — client CRM with sub-navigation (`switchSubnav(sub)`) for: clients, projects, materials, notes
- `apt` — apartment unit pricing database

### Estimator data flow

Rooms are stored in the `rooms[]` array (in-memory only; not persisted to localStorage). Each room object holds walls (array of `{id, ft}` objects), height, floorLength, floorWidth, surfaces toggled on/off, product name, and coat count.

Calculation chain:
1. `calc(room)` → pure function, returns `{wallSF, floorSF, trimLF, gal, mat, lab, total, totalSF, valid}`
2. `recalcRoom(id)` → calls `calc()`, updates the mini-summary DOM inside a room card
3. `recalcAll()` → maps `calc()` over all rooms, sums with `jobExtras()` (doors + windows), updates the totals strip and re-renders the open bid

Key formula details:
- `wallSF = perimeter × height` (perimeter is the sum of all individual wall measurements)
- Gallons: `Math.ceil(SF × coats / coverage)` — ceiling division, never fractional
- Material cost: `gallons × product.price × MARKUP` (MARKUP = 1.20)
- Labor: `SF × LABOR.rate × coats` (LABOR = {walls: 1.85, ceiling: 1.65, trim: 3.50} $/SF)
- Doors and windows are priced per-unit and roll into the labor subtotal

### Constants (lines 909–927)

All pricing constants are at the top of the script block and are the single source of truth:
- `PRODUCTS[]` — paint products with `{name, price, cov}` (price in $/gal, cov in SF/gal)
- `LABOR` — labor rates per SF by surface type
- `MARKUP` — material markup multiplier
- `BLE_CANDIDATES[]` — BLE service/characteristic UUID pairs tried in order when connecting to a Leica DISTO

### Bluetooth (lines 983–1243)

`connectBT()` uses the Web Bluetooth API to request a device filtered by name prefix `DISTO` or `Leica`. It then tries each UUID in `BLE_CANDIDATES` in order to find a notify characteristic. Measurements arrive as `DataView` bytes in `onMeasurement(evt)`, decoded as a little-endian Int32 (millimeters) and converted to decimal feet.

`setReshootTarget(roomId, wallId)` puts the app in "reshoot" mode — the next BLE measurement overwrites a specific wall rather than appending a new one.

### localStorage persistence

All data except the current estimator session is persisted to localStorage:

| Key | Content |
|-----|---------|
| `ingersoll_contacts_v1` | Client contacts array |
| `ingersoll_projects_v1` | Projects array (each has a `tasks[]` sub-array) |
| `ingersoll_notes_v1` | Notes array |
| `ingersoll_materials_v1` | Materials lists array (each has an `items[]` sub-array) |
| `ingersoll_supplies_v1` | Supply reference list |
| `ingersoll_apt_pricing_v1` | Apt pricing `{locations[]}` where each location has `units[]` |

Pattern: `XxxLoad()` reads and parses, `xxxSave(data)` serializes and writes. All load functions have a try/catch that returns a safe default if the key is missing or corrupt.

### Bid generation

`renderBid()` generates a print-ready HTML proposal rendered inside `#bid-out` (white background, Georgia serif) injected directly into the DOM via `innerHTML`. The proposal is shared via `shareBid()` which uses the Web Share API with a plain-text fallback to clipboard.

### Voice recognition (line 2489)

`processVoiceCommand(transcript)` handles navigation (switch tabs/subnavs), adding rooms, and numeric measurement entry. Number parsing supports both word form ("seventeen") and digit strings, including feet-and-inches shorthand ("twelve five" → 12'5").

### Responsive layout

Two media queries:
- `≥600px` (Z Fold 5 unfolded): two-column grid layout; estimator left, sticky summary/bid right
- `≤390px` (Z Fold 5 cover screen): collapses multi-column grids to 1 or 2 columns

### Error handling

A global `window.onerror` handler (line 892) replaces the entire page body with a white error screen on any unhandled JS exception, including the instruction "Screenshot this and send to Claude to fix it."
