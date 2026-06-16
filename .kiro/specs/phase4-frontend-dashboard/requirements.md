# Requirements Document

## Introduction

Phase 4 of JyotishAI implements the premium animated frontend report interface. A single React component, `AstrologyReport`, consumes a `ChartResponse` payload (produced by the Phase 3 backend) and renders it in two visually distinct views: a Human Narrative Dashboard with tabbed life-category navigation and timeline pills, and a Cosmic Blueprint Widget that exposes the raw Western Tropical astronomical data in a dark, cyber-mystic card layout. The component is built with Next.js 15, Tailwind CSS, and Framer Motion.

## Glossary

- **AstrologyReport**: The React client component defined in `jyotishai/frontend/components/AstrologyReport.tsx` that is the sole deliverable of this phase.
- **ChartResponse**: The Pydantic response model from Phase 1/3 whose shape is mirrored by the `ChartDataProps` TypeScript interface inside the component.
- **Human Narrative View**: The default view showing AI-generated conversational text, controlled by category tabs (Personal, Career, Love) and timeline pills (Past, Current, Future).
- **Cosmic Blueprint Widget**: The alternate view toggled by a header button, displaying raw `raw_astrology_data` (planets, houses, angles) in three dark cards.
- **AnimatePresence**: Framer Motion component used to animate mount/unmount transitions between views and text segments.
- **layoutId**: Framer Motion prop used on the active-tab underline to produce a shared-layout spring animation across tab changes.
- **ChartDataProps**: The TypeScript interface inside `AstrologyReport.tsx` that mirrors `ChartResponse` for type safety.
- **raw_astrology_data**: Nested JSON object containing `planets`, `houses`, and `angles` sub-objects, matching the `RawAstrologyData` Pydantic schema.
- **detailed_report**: Nested JSON object containing `personal`, `career`, and `love` sub-objects, each with `past`, `current`, and `future` string fields, matching the `DetailedReport` Pydantic schema.

---

## Requirements

### Requirement 1

**User Story:** As a frontend developer, I want a single `AstrologyReport` React component that accepts a `chartData` prop typed against `ChartDataProps`, so that the component has strict compile-time type safety matching the Phase 1 API contract.

#### Acceptance Criteria

1. THE AstrologyReport component SHALL be declared as a Next.js Client Component via the `'use client'` directive at the top of the file.
2. THE AstrologyReport component SHALL accept a single prop named `chartData` typed as `ChartDataProps`.
3. THE `ChartDataProps` interface SHALL include fields: `chart_id: string`, `full_name: string`, `raw_astrology_data` (with `planets: Record<string, PlanetDetails>`, `houses: Record<string, HouseDetails>`, `angles: Record<string, AngleDetails>`), `detailed_report` (with `personal`, `career`, `love`, each containing `past: string`, `current: string`, `future: string`), and `message: string`.
4. THE `PlanetDetails` interface SHALL include `sign: string`, `degree: number`, `house: number`, and `is_retrograde: boolean`.
5. THE `HouseDetails` and `AngleDetails` interfaces SHALL each include `sign: string` and `degree: number`.

---

### Requirement 2

**User Story:** As a user, I want a header banner that displays my name and a toggle button, so that I can switch between the narrative and technical views.

#### Acceptance Criteria

1. WHEN the component renders, THE AstrologyReport SHALL display a heading containing `{chartData.full_name}'s Cosmic Alignment` styled with an amber-to-white gradient text effect.
2. WHEN the component renders, THE AstrologyReport SHALL display a subtitle reading "Systems calculated under Western Tropical parameters".
3. WHEN the user clicks the toggle button and `showTechnical` is `false`, THE AstrologyReport SHALL display the button label "✦ View Cosmic Blueprint".
4. WHEN the user clicks the toggle button and `showTechnical` is `true`, THE AstrologyReport SHALL display the button label "✦ Hide Blueprint Data".
5. WHEN the toggle button is clicked, THE AstrologyReport SHALL update the `showTechnical` boolean state, causing `AnimatePresence` to transition between the two views.

---

### Requirement 3

**User Story:** As a user, I want a Human Narrative Dashboard with category tabs and timeline pills, so that I can explore AI-generated life insights across different dimensions and time periods.

#### Acceptance Criteria

1. WHEN `showTechnical` is `false`, THE AstrologyReport SHALL render the Human Narrative View containing three category tab buttons: "Personal Life", "Career Life", and "Love Life".
2. WHEN a category tab is clicked, THE AstrologyReport SHALL update `activeTab` state and animate a shared underline indicator using Framer Motion `layoutId="activeTabUnderline"` with a spring transition.
3. WHEN the Human Narrative View is active, THE AstrologyReport SHALL render three timeline pill buttons: "past", "current", and "future".
4. WHEN a timeline pill is clicked, THE AstrologyReport SHALL update `activeTimeline` state and highlight the active pill with an amber background.
5. WHEN `activeTab` or `activeTimeline` changes, THE AstrologyReport SHALL animate the text segment out (opacity 0, x -20) and the new segment in (opacity 1, x 0) using `AnimatePresence mode="wait"` with a 0.25-second ease-in-out transition.
6. THE AstrologyReport SHALL display the text value from `chartData.detailed_report[activeTab][activeTimeline]` inside the animated text panel.

---

### Requirement 4

**User Story:** As a user, I want a Cosmic Blueprint Widget that shows raw astronomical data, so that I can inspect the precise Western Tropical calculations that underpin my report.

#### Acceptance Criteria

1. WHEN `showTechnical` is `true`, THE AstrologyReport SHALL render three dark cards in a responsive grid (1 column on mobile, 3 columns on `md` breakpoint and above).
2. THE first card SHALL be titled "☉ Planetary Degrees" and SHALL iterate over `chartData.raw_astrology_data.planets`, displaying each planet's `sign`, `degree` (formatted to 2 decimal places), `house` number suffixed with "H", and "Rx" when `is_retrograde` is `true`.
3. THE second card SHALL be titled "⊞ Placidus House Cusps" and SHALL iterate over `chartData.raw_astrology_data.houses`, displaying each house number prefixed with "House " and its `sign` and `degree` (formatted to 2 decimal places).
4. THE third card SHALL be titled "▲ Principal Calculations" and SHALL iterate over `chartData.raw_astrology_data.angles`, displaying each angle's name, `sign`, and `degree` (formatted to 2 decimal places with amber monospace styling).
5. THE third card SHALL include a footer badge reading "Engine Core: Swiss Ephemeris Binding" in amber text on a dark amber-tinted background.

---

### Requirement 5

**User Story:** As a frontend developer, I want smooth animated transitions between the two main views, so that the UI feels premium and polished.

#### Acceptance Criteria

1. WHEN switching between the Human Narrative View and the Cosmic Blueprint Widget, THE AstrologyReport SHALL use `AnimatePresence mode="wait"` with `key` props (`"narrative-view"` and `"technical-view"`) to unmount the exiting view before mounting the entering view.
2. WHEN a view enters, THE AstrologyReport SHALL animate from `opacity: 0, y: 10` to `opacity: 1, y: 0` over 0.3 seconds.
3. WHEN a view exits, THE AstrologyReport SHALL animate from `opacity: 1, y: 0` to `opacity: 0, y: -10` over 0.3 seconds.
4. THE AstrologyReport SHALL use `framer-motion` exclusively for all animation logic, with no CSS animation or transition classes used for the view-switch or text-segment transitions.
