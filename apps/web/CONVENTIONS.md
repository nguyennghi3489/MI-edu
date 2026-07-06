# apps/web — where logic goes

Decision rules for splitting Vue/Nuxt code, so this doesn't get re-litigated per page. Extraction is triggered by actual repetition or actual size, never done upfront "for later" — see rule of three below.

## The five buckets

| Bucket | What it holds | Auto-import |
|---|---|---|
| `pages/` | Routing + wiring: fetch via a composable, render via components/markup. No shared reactive logic. | via file-based routing |
| `composables/` | Reactive logic with **no DOM** — fetching/mutating a resource, cross-cutting concerns (auth headers, submit state). | yes, `useX.ts` → `useX()` |
| `components/` | DOM + local state worth isolating — a modal, a list row, a form section. | yes, PascalCase |
| `stores/` (Pinia) | State that outlives one page visit (auth session). Not for page-local UI state like search/filter/form fields, even if convenient. | yes |
| `utils/` | Pure functions / static data. No `ref`, no composable calls. | yes |

`layouts/` doesn't exist yet — add one when page chrome (header row, back-link) is byte-identical across 3+ pages.

## When to extract — rule of three

Write it inline the first time. Copy it once more if needed. On the **third** occurrence of the same shape, extract:

- Same fetch/mutation shape 3× → composable (e.g. `useApi`, born from 6 duplicate call sites).
- Same markup block with its own local state 3× → component.
- Same page-chrome markup 3× → layout.

**Exception:** extract on first use if the logic is security- or correctness-sensitive enough that a second, slightly-different copy would be a real bug risk (e.g. auth header construction). Consistency matters more than the rule of three there.

Don't extract because "it might be reused" — that's the abstraction the rule of three exists to prevent.

## Naming

- Composable file = composable name: `composables/useApi.ts` exports `useApi`.
- One exported composable per file; don't bundle unrelated hooks into one file.
- Components get their own file even if small once extracted — no giant "misc components" file.
- If `components/` grows past a handful of files, group by feature (`components/lessons/QuestionEditor.vue`), not by type.

## Anti-patterns seen in this codebase (fixed or tracked)

- Manual `Authorization: Bearer ${token.value}` header built in 4 files → `composables/useApi.ts` (done).
- `busy`/`error`/try-catch scaffolding repeated in 4 submit handlers → candidate for `useSubmit()`, see `enhancement.md`.
- Confirm-dialog state (`confirmOpen`/`confirmMessage`/`confirmAction`) living inside a 300-line page → `components/ConfirmDialog.vue` (done 2026-07-06).
- Modal + loading-submit-footer + error-`<p>` markup repeated in 6 modals → `components/FormModal.vue` (done 2026-07-06). Same pass extracted `EmptyState`, `Pill`, `StatTile` and the global `.card` class in `main.css`.
