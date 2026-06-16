# Design Document — Phase 4: Frontend Dashboard Components

## Overview

Phase 4 delivers a single React client component, `AstrologyReport`, located at `jyotishai/frontend/components/AstrologyReport.tsx`. It is the primary UI surface for displaying a computed birth chart. The component receives a fully-typed `ChartDataProps` prop and renders two mutually exclusive views toggled by a header button, with all transitions driven by Framer Motion.

No new npm packages are required — `framer-motion` (v12), `next` (v15), `tailwindcss` (v3), and `typescript` (v5) are already installed in the frontend workspace.

---

## Architecture

The component is entirely self-contained: one file, no sub-components, no external state management. All state is local React `useState`. The data flow is strictly top-down:

```
Parent page (e.g. /session or /onboarding)
  └── <AstrologyReport chartData={chartResponse} />
        ├── Header Banner (always visible)
        └── AnimatePresence (mode="wait")
              ├── Human Narrative View  (showTechnical === false)
              │     ├── Category Tabs (personal / career / love)
              │     ├── Timeline Pills (past / current / future)
              │     └── Animated Text Panel
              └── Cosmic Blueprint Widget (showTechnical === true)
                    ├── Planets Card
                    ├── Houses Card
                    └── Angles Card
```

State variables:
| Variable | Type | Default | Purpose |
|---|---|---|---|
| `activeTab` | `'personal' \| 'career' \| 'love'` | `'personal'` | Controls which report category is shown |
| `activeTimeline` | `'past' \| 'current' \| 'future'` | `'current'` | Controls which timeline slice is shown |
| `showTechnical` | `boolean` | `false` | Toggles between the two main views |

---

## Components and Interfaces

### TypeScript Interfaces (defined inside the file)

```ts
interface PlanetDetails {
  sign: string;
  degree: number;
  house: number;
  is_retrograde: boolean;
}

interface HouseDetails {
  sign: string;
  degree: number;
}

interface AngleDetails {
  sign: string;
  degree: number;
}

interface ChartDataProps {
  chart_id: string;
  full_name: string;
  raw_astrology_data: {
    planets: Record<string, PlanetDetails>;
    houses: Record<string, HouseDetails>;
    angles: Record<string, AngleDetails>;
  };
  detailed_report: {
    personal: { past: string; current: string; future: string };
    career:   { past: string; current: string; future: string };
    love:     { past: string; current: string; future: string };
  };
  message: string;
}
```

Note: The original `phase4.md` spec contained a typo (`sign: str` instead of `sign: string`). The correct TypeScript type is `string` throughout.

### Header Banner

- Renders `{chartData.full_name}'s Cosmic Alignment` as an `<h1>` with Tailwind gradient text (`bg-gradient-to-r from-amber-200 via-white to-amber-400 bg-clip-text text-transparent`).
- Subtitle: `"Systems calculated under Western Tropical parameters"` in `text-gray-400`.
- Toggle button: pill-shaped, amber border, hover fills amber. Label switches between `"✦ View Cosmic Blueprint"` and `"✦ Hide Blueprint Data"` based on `showTechnical`.

### Human Narrative View

Wrapped in `<motion.div key="narrative-view">` inside `<AnimatePresence mode="wait">`.

**Category Tabs**
- Three buttons: `personal`, `career`, `love` (rendered as `"{cat} Life"`).
- Active tab: `text-amber-400 font-semibold`.
- Active underline: `<motion.div layoutId="activeTabUnderline">` — a 2px amber gradient bar that springs between tabs.

**Timeline Pills**
- Three buttons: `past`, `current`, `future`.
- Active pill: `bg-amber-400 text-black`.
- Inactive: `text-zinc-400 hover:text-white`.

**Text Panel**
- `<AnimatePresence mode="wait">` wrapping a `<motion.p key={\`${activeTab}-${activeTimeline}\`}>`.
- Enter: `{ opacity: 0, x: 20 }` → `{ opacity: 1, x: 0 }`, 0.25s ease-in-out.
- Exit: `{ opacity: 1, x: 0 }` → `{ opacity: 0, x: -20 }`, 0.25s ease-in-out.
- Text: `chartData.detailed_report[activeTab][activeTimeline]`.

### Cosmic Blueprint Widget

Wrapped in `<motion.div key="technical-view">` inside the same `<AnimatePresence>`.

Three cards in a `grid grid-cols-1 md:grid-cols-3 gap-6` layout. All cards share: `bg-zinc-950/60 border border-white/5 rounded-2xl p-6 backdrop-blur-xl`.

**Planets Card** — iterates `Object.entries(raw_astrology_data.planets)`:
```
{name}   {sign} {degree.toFixed(2)}° {house}H [Rx if retrograde]
```

**Houses Card** — iterates `Object.entries(raw_astrology_data.houses)`:
```
House {num}   {sign} {degree.toFixed(2)}°
```

**Angles Card** — iterates `Object.entries(raw_astrology_data.angles)`:
```
{title}
{sign}  {degree.toFixed(2)}°   (degree in amber monospace)
```
Footer badge: `"Engine Core: Swiss Ephemeris Binding"` in `text-amber-400/80`.

---

## Data Models

The component consumes data that has already been validated by the backend's Pydantic models (`RawAstrologyData`, `DetailedReport`). No additional client-side validation is performed — the TypeScript interfaces provide compile-time safety only.

Data access patterns:
- `chartData.detailed_report[activeTab][activeTimeline]` — string lookup, always valid given the constrained union types.
- `Object.entries(chartData.raw_astrology_data.planets)` — iterates all planet entries; order is insertion order from the backend dict.
- `data.degree.toFixed(2)` — safe because `degree` is typed as `number`.
- `data.is_retrograde && 'Rx'` — renders the string `"Rx"` or `false`; React renders `false` as nothing.

---

## Error Handling

This component is a pure display component. It does not make API calls or handle async operations. Error handling responsibilities:

- **Missing/null chartData**: The parent page is responsible for not rendering `<AstrologyReport>` until `chartData` is available. The component does not render a loading or error state.
- **Empty string values**: If `detailed_report` fields are empty strings (e.g. from the fallback in `generate_human_report`), the text panel renders an empty paragraph — acceptable for MVP.
- **Empty planet/house/angle objects**: If `raw_astrology_data` sub-objects are empty, the card body renders nothing — the card header and structure remain visible.

---

## Testing Strategy

No automated tests are required for this phase (the component is a pure UI renderer with no business logic). Manual verification steps:

1. Pass a mock `ChartDataProps` object to `<AstrologyReport>` in a test page or Storybook story.
2. Verify tab switching animates the underline with a spring.
3. Verify timeline pill switching animates the text with a slide.
4. Verify the view toggle animates the full panel in/out.
5. Verify the Cosmic Blueprint grid renders all planets, houses, and angles with correct formatting.
6. Verify "Rx" appears only for retrograde planets.
7. Verify responsive layout: single column on mobile, 3-column grid on `md+`.

---

## Design Decisions

| Decision | Rationale |
|---|---|
| Single-file component, no sub-components | Keeps the deliverable atomic and self-contained per the phase4.md spec. |
| `AnimatePresence mode="wait"` for view switch | Ensures the exiting view fully unmounts before the entering view mounts, preventing z-index overlap during the transition. |
| `layoutId` for tab underline | Produces a smooth shared-layout spring animation without manual coordinate tracking. |
| Separate `AnimatePresence` for text panel | Allows the text to slide independently of the tab/pill UI chrome, giving a more polished feel. |
| No loading skeleton | The parent is responsible for data fetching; this component only renders when data is ready. |
| `toFixed(2)` for degrees | Matches the raw data precision shown in the phase4.md spec and the backend's float storage. |
