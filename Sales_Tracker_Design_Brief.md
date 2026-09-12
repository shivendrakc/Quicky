# Sales Tracker — Design Brief & Decision Record

Compiled from a planning session, for continuation as a Claude Project. Companion to the QuickShip Project Summary and the Sales Order Logger design brief already in this project.

## 1. Project origin

The shop currently tracks sales performance and commission targets in an Excel workbook (per store, per quarter), rebuilt manually each period. Editing every individual sale by hand in that structure is redundant now that the Sales Order Logger (a separate, already-in-progress piece of this same project) captures each sale directly.

The Sales Tracker is the **visualization and target/commission layer** built on top of the Logger's data — it answers "what have we done, and how does that compare to target" without anyone re-entering numbers into a spreadsheet.

## 2. Relationship to other project pieces

- **Sales Order Logger** — entry system (wizard, configurable categories, fixed core fields). Captures each sale as it happens. Roughly half-built at time of writing.
- **Sales Tracker** (this document) — reads the Logger's data and turns it into drill-down visuals, per-salesperson dashboards, and automated target/commission tracking.
- Both are **one project**, sharing the same repo, backend, and login as QuickShip — not separate apps.

## 3. Platform & architecture decisions

| Decision | Choice | Why |
|---|---|---|
| Backend | Supabase (same pattern as QuickShip: Postgres + RLS + Storage), hosted alongside QuickShip's project | Security comes from RLS + auth discipline, not from being offline — same standard QuickShip already meets. The original "local-only" idea was dropped once this was clarified. |
| Hosting | Vercel, same repo as QuickShip | One deploy pipeline, no second app to maintain |
| Access | One shared login (existing QuickShip auth) at the front door, then a module switcher between QuickShip and Sales Logger/Tracker | No per-rep accounts needed; matches how QuickShip already works |
| Store scope | Single store (Fyshwick) for v1 | Explicitly scoped down for now; data model should still key everything to a `store` entity so multi-store isn't a rewrite later |
| Salesperson identity | Filtered by the existing "Sales Rep" category from the Logger, not by login identity | There's no per-user login, so "my sales" means "sales tagged with my rep name" |

## 4. Business rules (mandatory logic, sourced from the existing commission-target spreadsheet)

These are the rules the app must get right, since they determine real pay:

| Rule | Detail |
|---|---|
| Store monthly target | **Manually entered** (agreed budget) each month — no prior-year growth calculation in v1 |
| Individual allocation | Store target split per staff member, weighted by shift count (weekday vs. weekend shifts weighted differently) |
| Shift counts | Entered manually per staff member, per month. Editable per period, no fixed hardcoded ratio. |
| Mid-period shift changes | Handled manually for v1 (no automatic recalculation) — happens often enough to note, but out of scope for now |
| Monthly commission | Flat **1% of that person's total actual sales for the month**, paid once they clear their individual target |
| Quarterly stretch bonus | Four cumulative tiers per quarter — Target / +25% / +50% / +75% — the **highest tier reached** pays an additional 0.5% / 1% / 1.5% on top. Does not stack (one bonus rate, not all tiers below it). Paid quarterly. |
| Guardsman (insurance) commission | Flat **$10 per policy sold**, tracked per staff member, independent of the sales tiers |
| "Done" / revenue recognition | A sale counts toward target and commission once it's **finalized** (order total), not when payment clears |
| Cancellations / reversals | **Deferred to v2.** No handling in v1 — a finalized sale that's later cancelled isn't automatically walked back yet |

## 5. Data model additions (on top of the Logger's existing sales-order/category schema)

- `stores` — id, name *(single row for now; keeps multi-store open later)*
- `monthly_targets` — store, month, year, agreed_target
- `staff_shifts` — staff (rep), month, year, weekday_shifts, weekend_shifts
- `shift_weight_settings` — weekday_weight, weekend_weight, effective period *(editable, like QuickShip's Settings-page threshold pattern)*
- `staff_monthly_target_snapshots` — computed individual target + tier amounts (Target/+25%/+50%/+75%), **snapshotted at calculation time** so later setting changes don't rewrite history
- `guardsman_sales` — per-sale flag/count, or its own table if one order can include multiple policies

Actual sales, monthly commission earned, and quarterly bonus status should be **computed views**, not stored tables — derived live from `sales_orders` + the snapshot targets, so they update automatically as new sales come in rather than needing manual recalculation.

## 6. Screens / views needed

- **Daily calendar view** — a heatmap-style calendar for the current financial year, showing sales total per day at a glance
- **Drill-down hierarchy** — Financial Year → Quarter → Month → Week → Day, each level summable and clickable into the next
- **Per-salesperson dashboard** — their own actual-vs-target, current tier standing, commission earned/pending, Guardsman count
- **Summary dashboard / leaderboard** — all reps together: revenue, attach rates, raw counts (this absorbs the leaderboard already planned in the Logger brief — one feature, not two)
- **Targets & shifts admin** — monthly target entry, per-rep shift entry, shift-weight setting

## 7. Decisions log (quick reference)

| Topic | Decision |
|---|---|
| Backend | Supabase + Vercel, shared with QuickShip |
| Security model | RLS + auth, same as QuickShip — not local-only |
| Store scope | Single store (Fyshwick) for v1 |
| Login | Shared login, module switcher — no per-rep accounts |
| Prior-year target calculation | Dropped for v1 — manual target entry only |
| Revenue recognition | On sale finalization, not payment |
| Cancellations/reversals | Deferred to v2 |
| Shift-change recalculation | Manual for v1 |
| Guardsman commission | Flat $10/policy |
| Monthly commission | 1% of actual sales, once target hit |
| Quarterly bonus | Highest tier reached only, non-stacking |
| Shift weekday/weekend weighting | Editable setting, not hardcoded |

## 8. Open items — not yet decided

- **Financial year start date** — assumed standard Australian FY (1 July – 30 June) based on the shift-change example date in the source spreadsheet, but not explicitly confirmed.
- **v2 cancellation handling** — how a finalized-then-cancelled sale should walk back commission already counted.
- **Exact shift-weight ratio UI** — where in Settings this lives and how changes mid-period are messaged to staff.
- **Guardsman data capture** — whether policy count/flag lives on the sale record itself or needs its own entry step in the wizard.

This document is a full record of a design/brainstorming session — no code has been written against this spec yet (the Sales Order Logger entry system is separately in progress). It's intended to sit alongside the other two documents as continuation context for this Claude Project.
