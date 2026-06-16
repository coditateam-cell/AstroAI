# Implementation Plan

- [x] 1. Create the `AstrologyReport` component file with TypeScript interfaces and state setup





  - Create `jyotishai/frontend/components/AstrologyReport.tsx` with the `'use client'` directive
  - Define all five TypeScript interfaces: `PlanetDetails`, `HouseDetails`, `AngleDetails`, `ChartDataProps`, and the component prop type
  - Declare the three `useState` hooks: `activeTab`, `activeTimeline`, `showTechnical`
  - Define the `categories` and `timelines` const arrays with `as const`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Implement the Header Banner section





  - Render the gradient `<h1>` with `{chartData.full_name}'s Cosmic Alignment`
  - Render the subtitle paragraph
  - Implement the toggle button with conditional label and click handler that flips `showTechnical`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Implement the Human Narrative View inside `AnimatePresence`





- [x] 3.1 Implement the outer `AnimatePresence mode="wait"` wrapper and the narrative `motion.div` with enter/exit animations


  - Wrap the narrative view in `<motion.div key="narrative-view">` with `initial`, `animate`, `exit` props (opacity/y, 0.3s)
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 3.2 Implement the category tab navigation with animated underline

  - Render the three category tab buttons iterating over `categories`
  - Apply active/inactive styles based on `activeTab` state
  - Add the `<motion.div layoutId="activeTabUnderline">` spring-animated underline inside the active tab
  - _Requirements: 3.1, 3.2_

- [x] 3.3 Implement the timeline pill filter

  - Render the three timeline pill buttons iterating over `timelines`
  - Apply amber active background and dark inactive styles based on `activeTimeline` state
  - _Requirements: 3.3, 3.4_

- [x] 3.4 Implement the animated text panel

  - Wrap the text in a nested `<AnimatePresence mode="wait">` with a `<motion.p key={\`${activeTab}-${activeTimeline}\`}>`
  - Set enter animation: `initial={{ opacity: 0, x: 20 }}`, `animate={{ opacity: 1, x: 0 }}`, 0.25s ease-in-out
  - Set exit animation: `exit={{ opacity: 0, x: -20 }}`, 0.25s ease-in-out
  - Render `chartData.detailed_report[activeTab][activeTimeline]` as the text content
  - _Requirements: 3.5, 3.6_

- [x] 4. Implement the Cosmic Blueprint Widget inside the same `AnimatePresence`





- [x] 4.1 Implement the blueprint `motion.div` wrapper and 3-column responsive grid


  - Add `<motion.div key="technical-view">` with matching enter/exit animations (opacity/y, 0.3s)
  - Apply `grid grid-cols-1 md:grid-cols-3 gap-6` layout
  - _Requirements: 4.1, 5.1, 5.2, 5.3_

- [x] 4.2 Implement the Planets card


  - Render the "☉ Planetary Degrees" card header
  - Iterate `Object.entries(chartData.raw_astrology_data.planets)` and render each row with sign, `degree.toFixed(2)°`, house number suffixed "H", and conditional "Rx"
  - _Requirements: 4.2_

- [x] 4.3 Implement the Houses card


  - Render the "⊞ Placidus House Cusps" card header
  - Iterate `Object.entries(chartData.raw_astrology_data.houses)` and render each row with "House {num}", sign, and `degree.toFixed(2)°`
  - _Requirements: 4.3_

- [x] 4.4 Implement the Angles card with footer badge


  - Render the "▲ Principal Calculations" card header
  - Iterate `Object.entries(chartData.raw_astrology_data.angles)` and render each angle block with title, sign, and amber monospace degree
  - Add the "Engine Core: Swiss Ephemeris Binding" footer badge
  - _Requirements: 4.4, 4.5_

- [x] 5. Verify TypeScript compilation





  - Run `tsc --noEmit` in `jyotishai/frontend` to confirm zero type errors in the new component
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
