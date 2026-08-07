# Design system

One stylesheet, `assets/site.css`. Every page links it and nothing else. There are no per-page `:root` blocks and no page-level overrides except the prototype embed on the Nirvana Mudra page, which is scoped and commented.

Run `python3 tools/check-consistency.py` after any change. It fails the build on every rule below that can be checked automatically.

---

## 1. Tokens

### Colour

| Token | Value | Use | Contrast on white |
|---|---|---|---|
| `--ink` | `#16181d` | Headings, primary text, dark bands | 16.4:1 |
| `--body` | `#4b5158` | Body copy | 8.0:1 |
| `--muted` | `#5f666e` | Captions, meta, labels | 5.8:1 |
| `--faint` | `#9aa1a9` | **Hairlines and icons only. Never text.** | 2.6:1 |
| `--line` | `#e4e7ea` | Borders | n/a |
| `--line-soft` | `#eef0f2` | Internal dividers | n/a |
| `--surface` | `#f7f8f9` | Section wash | n/a |
| `--surface-2` | `#f0f2f4` | Image plates | n/a |
| `--accent` | `#2b4fd8` | Links, primary buttons, **all headline figures** | 6.9:1 |
| `--accent-ink` | `#1e3aad` | Hover | 9.4:1 |
| `--mark` | `#f7f0a0` | Highlighter behind the wordmark, selection | n/a |

Two accents, no more. Any new colour needs a reason that isn't decoration.

### Type

Two stacks, one visual family.

- `--sans` = Inter. Headings and body.
- `--mono` = SF Pro from the operating system, falling back to Inter. Labels, eyebrows, meta, table headers, diagram type. Named `--mono` for historical reasons; it is not a monospace face. **There is no typewriter font anywhere on the site.**

SF Pro cannot legally be self-hosted, so it is requested via `-apple-system`. Apple devices get the real thing; everything else gets Inter.

| Step | Size | Use |
|---|---|---|
| `--t-eyebrow` | 12px | Eyebrows, meta labels, captions in diagrams |
| `--t-small` | 14px | Secondary copy, buttons, chips |
| `--t-body` | 16 to 17px | Body |
| `--t-lead` | 18 to 21px | Lead paragraphs, pull quotes |
| `--t-h4` | 17 to 19px | Card and decision headings |
| `--t-h3` | 20 to 24px | Sub-headings |
| `--t-h2` | 28 to 40px | Section headings |
| `--t-h1` | 34 to 56px | Page titles |
| `--t-display` | 38 to 68px | Homepage hero only |
| `--t-figure` | 40 to 64px | Headline metrics |

Nothing below 12px, ever. Headings are 600 weight with `-0.022em` tracking; display tightens to `-0.032em`.

### Space

4px base: `--s-1` 4px through `--s-8` 56px, plus `--s-9` 80px and `--s-10` 112px.
Section rhythm: `--section` 52 to 88px, `--section-s` 36 to 56px. Use the tokens, never a raw value.

### Grid

- `--shell` 1152px max, with `--gutter` 20 to 48px.
- `--measure` 34rem for prose, `--measure-wide` 44rem for wider blocks.
- **Prose is capped but never re-centred.** Every text block and every media block starts on the same left edge. This is the single rule that holds the case studies together.

### Radius

`--radius` 10px for cards, plates and figures. `--radius-s` 8px for buttons and pills. Nothing is a capsule.

---

## 2. Buttons and CTAs

Three classes only: `.btn--primary`, `.btn--ghost`, and the modifier `.btn--ext`.

- **Never type an arrow into a label.** `.btn--ext` appends `↗` from CSS, so external links can't drift between pages.
- Minimum height 46px everywhere. Below 400px `.btn-row` becomes a single column at full width.

### The pattern, by context

| Context | Primary | Ghost |
|---|---|---|
| Header nav | — | Get in touch |
| Homepage hero | View case studies | Résumé (PDF) `ext` |
| About sidebar | Email me | Résumé (PDF) `ext` |
| **Case study head** | the artefact: *Try the prototype* / *See the results* | the destination: *Read Part I/II*, *See the research*, *How I got there* |
| **Contact band, every page** | Email me | LinkedIn `ext` |

The case study rule in one line: **primary makes you do something, ghost takes you somewhere.** Contact bands are identical on all seven pages: exactly two buttons, no third.

---

## 3. Components

| Component | Class | Rule |
|---|---|---|
| Section label | `.eyebrow` | `--mono`, 12px, 0.1em tracking, uppercase. Numbered variant uses `.idx` in accent |
| Section head | `.sec-head` | eyebrow, then `h2`, then optional `.lead` |
| Headline metric | `.stat .num` | **Always accent blue**, signs and ranges included. `.sign` for `+` `%`, `.rng` for the dash in a range |
| Evidence note | `.evidence-note` | Every metric block states measured or modelled. Non-negotiable |
| Work card | `.work-card` | Image plate 4:3 `object-fit:cover`, heading link covers the whole card via `::after` |
| Hero picks | `.pick` | Same full-row hit area pattern |
| Decision | `.decision` | Numbered counter, body, then one `.verdict` |
| Verdict | `.verdict--in` / `--out` | `--in` is ink-filled with a tick and thickens the row's top rule. There is exactly one per section |
| Panel | `.panel--bad` / `--good` | Comparison pairs. Bullets are dots, arrows on `--good` |
| Diagram | `.diagram` | Inline SVG, `tabindex="0"`, `role="group"`, `aria-label` describing the content. Never a screenshot of a whiteboard |
| Data table | `.table-wrap` | `tabindex="0"` and `role="region"` so it is keyboard-scrollable |

### Images

- Third-party logos are never stretched, recoloured or cropped. `.client .logo` fixes optical height; `align-items: flex-start` on the column is load-bearing, without it flexbox stretches the mark.
- Photographs that are collages are never cropped: no fixed `aspect-ratio`, `height: auto`.
- Anything using `object-fit: cover` is a deliberate crop and is exempt from the ratio check.

---

## 4. Motion

Three entrance moments per page at most, via `.rise`. Everything else is a 160ms colour or border transition. `prefers-reduced-motion` disables all of it.

---

## 5. Accessibility floor

- 0 axe-core violations on every page at every breakpoint. This is checked, not assumed.
- All interactive targets 44px or larger, except inline links in prose, which WCAG 2.5.8 exempts.
- Body 8.0:1, muted 5.8:1, accent 6.9:1. All AA or better.
- Every page has one visible `<h1>`. No `sr-only` page titles.
- Focus is a 2-ring shadow, never `outline: none` alone.

---

## 6. Responsive

Breakpoints are in `em` so they respect the reader's font size.

| Breakpoint | Change |
|---|---|
| 60rem | Hero collapses to one column, picks move below the buttons |
| 52rem | About grid collapses |
| 46rem | Work cards stack, image first |
| 34rem | Nav CTA hides |
| 26rem | Nav tightens, wraps as a last resort |
| 25rem | Button rows go full width |

Verified across 21 widths from 320px to 3440px on all 7 pages: no overflow, no squashed images, no clipped media, no sub-44px targets.
