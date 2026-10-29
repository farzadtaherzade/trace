# Trace — UI Design Skill

Drop this file wherever your agent reads skills/instructions from (e.g. `.opencode/skills/trace-design/SKILL.md`, or reference it in `AGENTS.md`). It should be consulted before generating or editing any screen, component, or style in this project.

## When to use this

Consult this file whenever:
- Creating a new screen or component
- Styling anything with NativeWind classes
- Adding a new color, spacing value, or UI pattern
- Reviewing whether a UI change fits the app's visual identity

---

## Design Philosophy

Trace is a personal, local-only route-tracking app. The design language is **minimal, dark, and calm** — closer to a quiet personal journal than a sports/fitness app. The core visual identity of the entire app is the **route shape**: an abstract line drawing of a recorded GPS path. Every screen should treat that shape as the hero visual wherever a trip is shown.

**Do:**
- Keep layouts sparse. Generous whitespace over dense information.
- Use the accent color sparingly — primary actions, active states, and the route-line drawing only.
- Let the route shape be the most visually prominent element on any screen that displays a trip.

**Don't:**
- Don't add gamification, badges, streaks, leaderboards, or celebratory animations — this app is not a fitness-motivation app in that sense.
- Don't use bright, saturated, or multiple competing accent colors on one screen.
- Don't add decorative illustrations, gradients, or busy backgrounds — flat dark surfaces only.
- Don't introduce a component library (no gluestack, no react-native-reusables/shadcn) — this project hand-builds its own small component set with NativeWind utility classes. Keep it that way unless explicitly told otherwise.

---

## Color Tokens

Dark theme only — this app has no light mode. Defined in `tailwind.config.js`:

| Token | Hex | Usage |
|---|---|---|
| `background` | `#0A0A0A` | Screen background, the base layer everything sits on |
| `card` | `#151515` | Raised surfaces: cards, list rows, app bar, tab bar |
| `border` | `#232323` | 1px hairlines separating `card` from `background` |
| `text` | `#F5F5F5` | Primary text |
| `text-dim` | `#8A8A8E` | Secondary/muted text, labels, timestamps |
| `accent` | `#34D399` | Primary buttons, active tab/state, the route-line color |
| `accent-dim` | `#0F2A20` | Subtle tinted backgrounds behind accent-colored icons/badges |
| `danger` | `#F87171` | Destructive actions only (delete, clear data) |

Usage rule: `card` is always one shade lighter than `background`, with a visible `border` hairline — this is the "raised surface" pattern used for every app bar, tab bar, and card in the app. Never use a flat `background`-colored card with no border; never use `accent` as a large fill (it's a highlight color, not a background color).

---

## Typography & Spacing

- System sans-serif only. No decorative or display fonts.
- Radius: 12–16px (`rounded-xl` / `rounded-2xl`) on cards and buttons. Nothing sharp-cornered.
- Labels (e.g. stat pill labels) are small, uppercase, `text-dim`, letter-spaced slightly.
- Values/headings are bold, `text` color, sized up relative to their label.
- Padding is generous — prefer `p-4`/`p-5` on cards over tight `p-2`.

---

## Component Catalog

These live in `components/` and should be reused, not recreated inline, when a screen needs one of these patterns:

- **`Card`** — `bg-card border border-border rounded-2xl p-4`. The base container for any grouped content.
- **`StatPill`** — label (uppercase, `text-dim`, tiny) above a bold value. Used for speed/time/distance/pace/duration anywhere they appear.
- **`PrimaryButton`** — `bg-accent`, dark text, for the single primary action on a screen (Save, Start New Trace, Get Started).
- **`IconButton`** — round, `bg-card border border-border`, for secondary icon-only actions (share, settings, back-adjacent actions).
- **`RouteShape`** — the SVG polyline renderer. Takes `{lat, lng}[]`, normalizes and centers it in a given width/height, draws it in `accent` (or a per-trip color when overlaying multiple trips, e.g. on Explore). This is the single most important visual component in the app — every trip-related screen should feature it prominently, never as an afterthought.
- **`TripRow`** — list row pairing a small `RouteShape` thumbnail with name/date/distance/duration. Used in Saved Trips.
- **`EmptyState`** — icon + message + optional CTA, for any zero-data screen (no trips yet).
- **`Badge`** — small pill label, e.g. a trip count.
- **`ScreenHeader`** — title + optional back chevron + optional right icon action, consistent across all pushed screens.

When building a new screen, check this catalog first — a new one-off styled element is a smell that something should instead be composed from these.

---

## Screen-Level Conventions

- Bottom tab bar (Explore / Live Trace / Saved Trips): `bg-card`, top `border` hairline, active icon in `accent`, inactive in `text-dim`.
- Any screen showing a trip (Trip Details, Finish Trace, Explore, Saved Trips rows) must show the `RouteShape` — never just stats with no shape.
- Optional photo attachments are always secondary — a small thumbnail or icon row, never a full-width carousel or gallery.
- Destructive actions (delete trip, clear all data) always use `danger` color and are visually separated from other actions (extra spacing, a divider, or their own card) so they can't be tapped by accident.

---

## What NOT to add without explicit confirmation

- Activity-type filters or tags (walk/run/ride) — trips are generic in this app.
- Cloud, account, login, or sync UI of any kind.
- Light mode / theme toggle.
- Gamification elements (streaks, achievements, levels).
- A third-party component library.

If a request seems to need one of these, flag it rather than silently adding it — these were deliberate cuts made earlier in the project's design process, not oversights.
