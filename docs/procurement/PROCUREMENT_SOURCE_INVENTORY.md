# Procurement Source Inventory

## 1. Tujuan

Inventaris ini menentukan nasib setiap bagian penting dari `po-archive` ketika dipindahkan ke `disposal-management`.

## 2. Source Mapping

| Source PO Archive | Tanggung jawab sekarang | Keputusan | Target Disposal | Milestone | Catatan |
|---|---|---|---|---|---|
| `app/page.tsx` | Dashboard PO | Port/refactor | `features/procurement/pages/ProcurementDashboard.tsx` | 7 | Gunakan shell host |
| `app/po-material/page.tsx` | list/detail PO material | Port/refactor | Procurement pages | 4 | TanStack Query + host DataTable |
| `app/po-material/form.tsx` | create/edit PO material | Port/refactor | Procurement components | 4 | Atomic RPC parent+items |
| `app/po-besi/page.tsx` | list/detail PO besi | Port/refactor | Procurement pages | 5 | Shared master + secure RPC |
| `app/po-besi/form.tsx` | create/edit PO besi | Port/refactor | Procurement components | 5 | DB authoritative weight |
| `app/approval/page.tsx` | approval list | Port/refactor | Procurement pages | 6 | Status FK |
| `app/approval/form.tsx` | approval form | Port/refactor | Procurement components | 6 | Date chronology validation |
| `app/quota/page.tsx` | steel quota | Port/rewrite | quota page + API | 5 | View/RPC derived totals |
| `app/reports/page.tsx` | reports | Port/refactor | Procurement reports | 7 | Reuse export helper |
| `app/search/page.tsx` | global search | Defer/merge | host search | 7/8 | Search lintas domain |
| `app/layout.tsx` | Next app shell | Jangan dibawa | — | — | Host AppLayout |
| `app/globals.css` | style global | Audit only | host index.css | per module | Jangan replace global |
| `components/sidebar.tsx` | navigation | Jangan dibawa | — | — | Host Sidebar |
| `components/topbar.tsx` | topbar | Jangan dibawa | — | — | Host Navbar |
| `components/page-header.tsx` | page title | Reuse concept | host PageHeader | 3+ | Gunakan existing |
| `components/data-table.tsx` | generic table | Reuse concept | host DataTable | 4+ | Hindari duplikasi |
| `components/status-badge.tsx` | status rendering | Port mapping | shared/feature badge | 3 | Status category from DB |
| `components/searchable-select.tsx` | searchable master select | Evaluasi reuse | common component | 3 | Cek accessibility |
| `components/master-crud.tsx` | generic master CRUD | Jangan bawa langsung | explicit master pages | 3 | Security/domain clarity |
| `components/form-controls.tsx` | form wrapper | Port selective | feature components | 3+ | Adapt host UI |
| `components/global-search.tsx` | search UI | Defer | host search | 7/8 | Lintas domain |
| `components/ui/*` | UI primitive | Jangan copy massal | host UI | — | Sudah tersedia |
| `hooks/use-crud.ts` | generic CRUD | Jangan gunakan untuk transactions | explicit APIs | 4+ | RLS/RPC explicit |
| `hooks/use-master-data.ts` | master fetch | Refactor | TanStack hooks | 3 | Typed query keys |
| `hooks/use-toast.ts` | toast | Jangan dibawa | host toast | — | Hindari provider kedua |
| `lib/supabase.ts` | client | Jangan dibawa | host client | — | Auth host |
| `lib/types.ts` | domain types | Port/refactor | feature types | 2+ | Generated DB types source |
| `lib/register.ts` | count-based number | Rewrite | DB RPC | 2 | Concurrency unsafe |
| `lib/status.ts` | color category | Port seed/mapping | status master | 2/3 | Use stable code |
| `lib/steel.ts` | weight calculation | Port + backend validate | feature utils/RPC | 5 | Snapshot coefficient |
| `lib/export.ts` | Excel/PDF | Port/refactor | shared export | 7 | Lazy load, sanitize |
| `lib/activity.ts` | activity insert | Rewrite | audit integration | 2+ | Actor from auth |
| `lib/tags.ts` | approval tags | Port if used | approval utils | 6 | Normalize/validate |
| PO migrations | partial ALTER | Jangan jalankan | new host migrations | 2 | Baseline incomplete |
| `.env` | environment | Jangan dibawa | host env | — | Secret hygiene |
| `next.config.js` | Next config | Jangan dibawa | — | — | Host Vite |
| `netlify.toml` | deployment | Jangan dibawa | existing deployment | — | Production host |

## 3. Dependency Review

`disposal-management` sudah memiliki sebagian besar UI primitives. Patch implementation hanya boleh menambahkan dependency bila:

- benar-benar dipakai;
- tidak sudah tersedia;
- audit security lulus;
- bundle impact diterima;
- lazy-loaded bila berat.

Tidak boleh mengganti `package.json` host dengan milik PO Archive.

## 4. Security Concerns Legacy

- Supabase auth legacy tidak persist session;
- tidak ada role matrix yang setara host;
- generic direct CRUD untuk transaction;
- migration baseline/RLS tidak tersedia;
- register number berbasis count;
- activity actor tidak jelas;
- master relationship berpotensi orphan;
- data validation banyak berada di frontend.

Semua concern wajib diperbaiki pada implementasi host.
