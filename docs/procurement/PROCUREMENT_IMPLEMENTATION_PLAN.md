# Procurement Integration Implementation Plan

## Prinsip Eksekusi

- `disposal-management` selalu menjadi base;
- setiap milestone dikirim sebagai plain Git patch;
- satu patch hanya mengandung scope milestone terkait;
- migration remote tidak dijalankan otomatis;
- local reset/test/lint wajib sebelum remote push;
- commit dilakukan setelah verifikasi manual;
- PO Archive tetap tersedia sampai cutover final.

## Milestone 1 — Blueprint dan Schema Reconstruction

### Scope

- blueprint final;
- schema reconstruction;
- master mapping;
- permission matrix;
- route final;
- source inventory;
- import strategy;
- milestone acceptance criteria.

### Non-goals

- tidak ada runtime code;
- tidak ada migration SQL;
- tidak ada production change.

### Acceptance Criteria

- host application dikunci;
- tabel target lengkap;
- field mapping legacy lengkap;
- roles dan routes lengkap;
- unresolved remote schema items terdokumentasi;
- roadmap Patch 2–8 tersedia.

### Commit

```text
docs: define procurement integration blueprint
```

## Milestone 1B — Legacy Remote Schema Inventory

### Scope

- read-only schema dump PO Archive;
- table/column/FK/index/RLS/function inventory;
- row counts;
- distinct statuses;
- duplicate and orphan report;
- register sequence profile;
- steel calculation mismatch profile.

### Output

- `docs/procurement/PO_ARCHIVE_REMOTE_SCHEMA.md`;
- sanitized CSV/JSON inventory bila diperlukan;
- decisions updating reconstruction.

### Non-goals

- tidak ada mutation remote;
- tidak ada data import.

### Acceptance Criteria

- semua open verification items Phase 1 dijawab;
- tidak ada secret dalam repo;
- schema target dapat diimplementasikan tanpa menebak.

### Commit

```text
docs: inventory legacy procurement schema
```

## Patch 2 — Procurement Database Foundation

### Scope

Migration additive untuk:

- suppliers;
- materials;
- procurement statuses;
- steel diameters;
- register sequences;
- PO Material + items;
- PO Besi + items;
- approvals;
- steel quotas;
- views/RPC;
- audit integration;
- RLS/grants;
- pgTAP;
- generated types.

### Non-goals

- belum ada UI besar;
- belum import legacy;
- tidak mengubah disposal workflow.

### Test Minimum

- tables/FKs/indexes;
- anonymous denied;
- viewer read-only;
- operator transaction mutation;
- admin master mutation;
- atomic register sequence;
- parent/items atomic rollback;
- quota view;
- steel calculation;
- delete restrictions.

### Acceptance Criteria

- `supabase db reset` lulus;
- `supabase test db` lulus;
- `db lint` lulus;
- types generated;
- existing disposal tests tetap lulus;
- no remote push otomatis.

### Commit

```text
feat(procurement): add database foundation
```

## Patch 3 — Procurement Master Data

### Scope

- Supplier;
- Material;
- Status Procurement;
- Diameter Besi;
- integrasi Master Data host;
- admin-only CRUD;
- inactive records;
- delete restrictions;
- query/test/docs.

### Non-goals

- belum ada PO transaction form.

### Acceptance Criteria

- shared Cluster/Kontraktor tidak diduplikasi;
- all master forms typed;
- operator/viewer mutation hidden dan DB denied;
- tables left-aligned/responsive;
- check/build/tests pass.

### Commit

```text
feat(procurement): add procurement master data
```

## Patch 4 — PO Material Core

### Scope

- routes/menu;
- list/search/filter/pagination;
- create/edit/detail;
- atomic parent/items RPC;
- Drive link;
- scan/return workflow;
- export basic;
- audit;
- role behavior.

### Acceptance Criteria

- register atomik;
- create/update rollback with items;
- viewer read-only;
- refresh retains route;
- mobile usable;
- no duplicated shared components;
- DB/frontend tests pass.

### Commit

```text
feat(procurement): add PO material workflow
```

## Patch 5 — PO Besi dan Kuota

### Scope

- PO Besi list/form/detail;
- diameter items;
- weight calculation;
- supplier;
- memo QS;
- quota setup;
- quota usage view;
- over-quota warning/blocking rule;
- reports basic.

### Locked Rule to Confirm Before Coding

Tentukan apakah over quota:

- hanya warning; atau
- hard block untuk create/update.

Default MVP: warning + explicit admin/operator confirmation, database tetap mencatat over-quota state.

### Acceptance Criteria

- weight DB and UI consistent;
- coefficient snapshot preserved;
- quota derived, not manually duplicated;
- existing PO changes refresh quota;
- invalid values rejected;
- tests pass.

### Commit

```text
feat(procurement): add PO steel and quota monitoring
```

## Patch 6 — Approval Material

### Scope

- list/create/edit/detail;
- lifecycle dates;
- approver;
- material/brand;
- tags/category;
- scan and return;
- status workflow;
- links to PO optional when designed.

### Acceptance Criteria

- chronology validation;
- status/date consistency;
- role/RLS correct;
- search/filter/export;
- mobile table/card readable;
- tests pass.

### Commit

```text
feat(procurement): add material approval workflow
```

## Patch 7 — Dashboard, Global Search, Reports

### Scope

- Procurement Dashboard;
- KPI;
- PO/approval/quota attention list;
- global search across Disposal + Procurement;
- reports;
- Excel/PDF/print;
- shared export cleanup;
- lazy loading.

### Acceptance Criteria

- no duplicated export engines;
- formula injection protection;
- escaped print HTML;
- route persists on refresh;
- viewer can report/export;
- initial bundle impact documented;
- tests pass.

### Commit

```text
feat(procurement): add dashboard search and reports
```

## Patch 8 — Legacy Import and Final Hardening

### Scope

- import run tables/RPC;
- dry-run validation;
- master mapping;
- unresolved issue report;
- idempotent import;
- PO/item/approval/quota import;
- reconciliation report;
- final navigation cleanup;
- error/retry states;
- production checklist;
- cutover instructions.

### Non-goals

- tidak menghapus PO Archive otomatis;
- tidak menjalankan production import otomatis.

### Acceptance Criteria

- duplicate-safe import;
- unresolved rows visible;
- counts/totals/weights reconcile;
- rollback/recovery documented;
- anonymous denied;
- full frontend/database tests green;
- production smoke checklist complete;
- manual sign-off sebelum PO Archive read-only.

### Commit

```text
feat(procurement): finalize legacy import and integration hardening
```

## Release Gates

Setiap patch melewati gate:

1. `git apply --check`;
2. review diff;
3. local database reset jika ada migration;
4. database tests dan lint;
5. generated types;
6. frontend typecheck/lint/test/build;
7. manual verification;
8. commit;
9. remote migration dry-run;
10. backup production;
11. remote push manual;
12. production smoke test.

## Rollback Strategy

- patch frontend: revert commit;
- additive migration: forward-fix migration, bukan menghapus history;
- production data import: import run ID + mapping + issue log;
- PO Archive tetap aktif/read-only sebagai fallback;
- tidak drop legacy source sampai final sign-off.

## Phase 1B — Legacy Remote Schema Inventory

### Goal

Memverifikasi reconstruction terhadap Supabase PO Archive secara read-only.

### Deliverables

- SQL inventory toolkit;
- remote schema evidence CSV;
- row-count baseline;
- data-quality summary;
- mapping ambiguity list;
- Patch 2 readiness decision.

### Acceptance criteria

- seluruh query 00–08 dijalankan pada remote legacy;
- tidak ada mutation;
- table/column/constraint/RLS evidence lengkap;
- orphan dan duplicate summary tersedia;
- unresolved master mapping terdokumentasi;
- Patch 2 tidak dimulai sebelum review gate lulus.
