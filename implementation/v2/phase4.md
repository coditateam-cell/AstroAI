# TASK: Specification-Driven Implementation of Phase 3 (Frontend Dashboard Components)

You must completely implement the premium, animated frontend report interface using Next.js 15, Tailwind CSS, and Framer Motion. Completely write out the target file. Do not use placeholder components or abbreviated text.

## Target File to Create/Overwrite:
- `frontend/components/AstrologyReport.tsx`

---

## IMPLEMENTATION SPECIFICATIONS:

Create a single, highly polished React component named `AstrologyReport`. It must accept a single prop `chartData` matching our `ChartResponse` Pydantic structure from Phase 1. 

The component must be broken down visually into two main sections:
1. **Human Narrative View:** Controlled by top-level tabs (Personal, Career, Love) and sub-timeline pills (Past, Present, Future). Use Framer Motion's `<AnimatePresence>` and layout transitions to slide text smoothly when selections change.
2. **Cosmic Blueprint Widget:** A grid display showing the technical values inside `raw_astrology_data` (Planets, Houses, Angles) inside a dark, cyber-mystic card layout to establish brand authority.

Implement `frontend/components/AstrologyReport.tsx` exactly as follows:

```tsx
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Enforce type safety matching our Phase 1 API contracts
interface PlanetDetails {
  sign: str;
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
    career: { past: string; current: string; future: string };
    love: { past: string; current: string; future: string };
  };
  message: string;
}

export default function AstrologyReport({ chartData }: { chartData: ChartDataProps }) {
  const categories = ['personal', 'career', 'love'] as const;
  const timelines = ['past', 'current', 'future'] as const;

  const [activeTab, setActiveTab] = useState<typeof categories[number]>('personal');
  const [activeTimeline, setActiveTimeline] = useState<typeof timelines[number]>('current');
  const [showTechnical, setShowTechnical] = useState<boolean>(false);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 px-4 text-white">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-amber-200 via-white to-amber-400 bg-clip-text text-transparent">
            {chartData.full_name}&apos;s Cosmic Alignment
          </h1>
          <p className="text-sm text-gray-400 mt-1">Systems calculated under Western Tropical parameters</p>
        </div>
        <button
          onClick={() => setShowTechnical(!showTechnical)}
          className="mt-4 md:mt-0 px-4 py-2 text-xs font-semibold tracking-wider uppercase border border-amber-400/30 rounded-full hover:bg-amber-400 hover:text-black transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
        >
          {showTechnical ? '✦ Hide Blueprint Data' : '✦ View Cosmic Blueprint'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!showTechnical ? (
          /* HUMAN NARRATIVE DASHBOARD SLIDES */
          <motion.div
            key="narrative-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="bg-zinc-950/40 backdrop-blur-xl border border-white/5 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden"
          >
            {/* Top Categories Navigation */}
            <div className="flex border-b border-white/5 mb-8 overflow-x-auto scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`capitalize px-6 py-4 text-base font-medium relative whitespace-nowrap transition-colors duration-200 ${
                    activeTab === cat ? 'text-amber-400 font-semibold' : 'text-zinc-500 hover:text-white'
                  }`}
                >
                  {cat} Life
                  {activeTab === cat && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-400 to-yellow-500"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Sub-Timeline Pill Filter */}
            <div className="inline-flex gap-2 bg-zinc-900/60 p-1 rounded-xl border border-white/5 mb-6">
              {timelines.map((time) => (
                <button
                  key={time}
                  onClick={() => setActiveTimeline(time)}
                  className={`capitalize px-5 py-2 rounded-lg text-xs font-bold tracking-wider transition-all duration-200 ${
                    activeTimeline === time
                      ? 'bg-amber-400 text-black shadow-lg shadow-amber-400/10'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>

            {/* Text Segment Display Panel */}
            <div className="min-h-[220px] relative mt-4 flex items-start">
              <AnimatePresence mode="wait">
                <motion.p
                  key={`${activeTab}-${activeTimeline}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="text-zinc-200 leading-relaxed text-lg tracking-wide whitespace-pre-line font-light"
                >
                  {chartData.detailed_report[activeTab][activeTimeline]}
                </motion.p>
              </AnimatePresence>
            </div>
          </motion.div>
        ) : (
          /* THE COSMIC BLUEPRINT WIDGET (TECH VIBE DATA DISPLAY) */
          <motion.div
            key="technical-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {/* Planets Column Card */}
            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-amber-400 text-sm font-bold tracking-widest uppercase border-b border-white/5 pb-3 mb-4">
                ☉ Planetary Degrees
              </h3>
              <div className="space-y-3">
                {Object.entries(chartData.raw_astrology_data.planets).map(([name, data]) => (
                  <div key={name} className="flex justify-between items-center text-sm border-b border-white/[0.02] pb-2">
                    <span className="capitalize text-zinc-300 font-medium">{name}</span>
                    <span className="font-mono text-zinc-400">
                      {data.sign} {data.degree.toFixed(2)}° {data.house}H {data.is_retrograde && 'Rx'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Houses Column Card */}
            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
              <h3 className="text-amber-400 text-sm font-bold tracking-widest uppercase border-b border-white/5 pb-3 mb-4">
                ⊞ Placidus House Cusps
              </h3>
              <div className="space-y-3">
                {Object.entries(chartData.raw_astrology_data.houses).map(([num, data]) => (
                  <div key={num} className="flex justify-between items-center text-sm border-b border-white/[0.02] pb-2">
                    <span className="text-zinc-300 font-medium">House {num}</span>
                    <span className="font-mono text-zinc-400">{data.sign} {data.degree.toFixed(2)}°</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Core Mathematical Angles Card */}
            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-between">
              <div>
                <h3 className="text-amber-400 text-sm font-bold tracking-widest uppercase border-b border-white/5 pb-3 mb-4">
                  ▲ Principal Calculations
                </h3>
                <div className="space-y-4">
                  {Object.entries(chartData.raw_astrology_data.angles).map(([title, data]) => (
                    <div key={title} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                      <div className="text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-1">{title}</div>
                      <div className="text-xl font-light text-white tracking-wide">
                        {data.sign} <span className="text-amber-300 font-mono text-lg">{data.degree.toFixed(2)}°</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 p-3 bg-amber-400/5 border border-amber-400/10 rounded-xl text-center">
                <span className="text-[10px] tracking-widest font-bold text-amber-400/80 uppercase">
                  Engine Core: Swiss Ephemeris Binding
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}