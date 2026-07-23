# CLAUDE — QuickBooks → PaintPro Client Restore

Reference for pulling James's customers out of QuickBooks and rebuilding the PaintPro **Clients** tab. Companion to the main `CLAUDE.md`. Read that first for app architecture.

Owner: James Bailey, Ingersoll Painting LLC. QuickBooks company: **Ingersoll Painting** (realm changes per connection).

---

## 1. When to use this

James's Clients tab got wiped / needs rebuilding, and the source of truth for his customers is QuickBooks Online (connected via the Intuit QuickBooks MCP connector). Goal: produce a **PaintPro restore file (JSON)** he imports under **☰ Menu → Backup & Restore → Restore** to get every client back in one tap.

---

## 2. The connector gotcha (READ FIRST)

**MCP connectors load when a chat first opens.** If QuickBooks was disconnected when the conversation started, this chat cannot see it even after reconnecting mid-session. Fix = **start a fresh chat** with QuickBooks already connected. Everything in the PaintPro repo/app is unaffected by switching chats.

Verify the connection before doing anything else by calling `company_info` — it should return `Company Name: Ingersoll Painting`. That call also establishes auth for the other QuickBooks tools.

---

## 3. What QuickBooks actually exposes (data limits)

Through the current MCP tools you can reliably get **name** and **email** per customer. You **cannot** get phone or street address:

- `qbo_contact_search_customer` returns `billing_address` / `shipping_address` as **empty strings** and has **no phone field**.
- Invoices (`qbo_sales_get_invoices`) carry the same customer `contact` block (display_name + email) — **no address, no phone** either.

So the honest deliverable is: **all customers, name + email where present, phone/address left blank** for James to fill in over time. Tell him this plainly; don't imply phone/address were recoverable.

(As of the Jul 2026 pull: 110 customers, 97 with an email on file.)

---

## 4. Procedure

1. **`company_info`** — confirm `Ingersoll Painting`, establish auth.
2. **Get the full customer roster.** There is no "list all customers" tool. Use
   `qbo_accounting_get_sales_by_customer_summary` with a wide range and high `top_n`:
   - `start_date: "2010-01-01"`, `end_date: <today>`, `top_n: 500`.
   - The `summary.customerCount` + the row list give every customer name.
   - **Drop the rollup rows**: any row whose `metadata.type` includes `"TOTAL"` (e.g.
     "Total for 2+4 Construction"). Keep parent customers AND their sub-jobs (e.g. keep both
     "2+4 Construction" and its "Fairmont Park job").
3. **Fetch emails.** Call `qbo_contact_search_customer` once per customer name (fan out in
   parallel batches of ~25). Read `data.best_match.email` (may be `null`). Ignore the empty
   address fields.
4. **Build the restore file** (see §5). Validate JSON, unique ids, and that **only**
   `ingersoll_contacts_v1` is present in `localStorage`.
5. **Deliver the file** (present/send). Do NOT commit anything to the repo unless asked.

---

## 5. Restore-file format

The restore path is `restoreFromBackup(input)` in `PaintPro-ZFold.html`. It parses the file,
then for each key writes it **only if the key is in `BACKUP_KEYS`**. So a file containing
**only** `ingersoll_contacts_v1` rebuilds the Clients tab and leaves jobs, projects, notes,
rates, etc. untouched. (It replaces the contacts key wholesale — fine when the tab is empty.)

Envelope (`buildBackup` uses `version: "2"`):

```json
{
  "version": "2",
  "exportedAt": "<ISO8601>",
  "localStorage": {
    "ingersoll_contacts_v1": "<JSON STRING of the contacts array>"
  }
}
```

Note the contacts array is a **JSON string**, not a nested object (localStorage stores strings).

Each contact must match the shape `saveContact()` writes:

```json
{
  "id": "qb<timestamp>_<i>",
  "name": "Gail Morrow",
  "phone": "",
  "address": "",
  "email": "gailmorrow21@yahoo.com",
  "status": "completed",
  "estimate": "",
  "estimateDate": "Jul 22, 2026",
  "followUpDate": null,
  "notes": "Imported from QuickBooks",
  "gpsLat": null,
  "gpsLng": null,
  "updatedAt": 1784691122807
}
```

Conventions used:
- **`status: "completed"`** — these are past paying customers, so they don't clutter the
  Pending / Follow-Up views. James finds them under the **All** filter. He can bulk-change later.
- **`notes: "Imported from QuickBooks"`** — provenance.
- **`id`** must be unique across the array. `email` blank string (not null) when unknown.
- Alphabetize by name for a tidy address book.

`BACKUP_KEYS` (allowlist, from the HTML) — restore silently ignores anything not on it, and
`ingersoll_anthropic_key_v1` / `ingersoll_accounts_v1` are deliberately excluded (secrets):

```
ingersoll_active_job_v1, ingersoll_jobs_v1, ingersoll_contacts_v1,
ingersoll_projects_v1, ingersoll_notes_v1, ingersoll_materials_v1,
ingersoll_supplies_v1, ingersoll_apt_pricing_v1, ingersoll_rates_v1,
ingersoll_ext_rates_v1, ingersoll_proxy_url_v1, ingersoll_deposit_v1,
ingersoll_qb_paylink_v1
```

---

## 6. Optional spreadsheet backup

James may want a plain spreadsheet copy for Google Drive. Build an `.xlsx` (openpyxl) with
columns **Client Name · Email · Phone · Address** (phone/address blank), header row frozen,
auto-filter on. Pull rows from the same restore JSON so there's one source of truth.

Saving to Drive: `mcp__Google_Drive__create_file`. **Ask first** whether he wants a converted
**Google Sheet** (default conversion; best for phone editing) or the **exact `.xlsx`** kept
as-is (`disableConversionToGoogleType: true`), and which folder. He has declined the Drive
upload before — don't assume.

---

## 7. Reminders

- Make every URL clickable with full `https://` (standing rule from main `CLAUDE.md` §13).
- Lead with the answer; James is brief and on a tight schedule.
- Don't commit/push to the repo unless he explicitly asks.
