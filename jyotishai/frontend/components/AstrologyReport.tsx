'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// ---------------------------------------------------------------------------
// TypeScript Interfaces
// ---------------------------------------------------------------------------

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

interface TimelineSlot {
  timeframe: string;
  blueprint: string;
  current_vibe: string | null;
}

interface CategoryReport {
  past: TimelineSlot;
  present: TimelineSlot;
  future: TimelineSlot;
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
    personal: CategoryReport;
    career: CategoryReport;
    love: CategoryReport;
  };
  message: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const categories = ['career', 'personal', 'love'] as const;
const timelines = ['past', 'present', 'future'] as const;

type Category = (typeof categories)[number];
type Timeline = (typeof timelines)[number];

const categoryLabels: Record<Category, string> = {
  career: 'Professional Life & Career',
  personal: 'Personal Life & Inner Growth',
  love: 'Love & Relationships',
};

const timelineLabels: Record<Timeline, string> = {
  past: 'The Past',
  present: 'The Present',
  future: 'The Future',
};

const timelineIcons: Record<Timeline, string> = {
  past: '◁',
  present: '●',
  future: '▷',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AstrologyReportProps {
  chartData: ChartDataProps;
}

export default function AstrologyReport({ chartData }: AstrologyReportProps) {
  const [activeTab, setActiveTab] = useState<Category>('career');
  const [activeTimeline, setActiveTimeline] = useState<Timeline>('present');
  const [showTechnical, setShowTechnical] = useState<boolean>(false);

  const slot: TimelineSlot | undefined =
    chartData.detailed_report?.[activeTab]?.[activeTimeline];

  return (
    <div className="min-h-screen bg-zinc-950 text-white px-6 py-10">
      {/* Header Banner */}
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-amber-200 via-white to-amber-400 bg-clip-text text-transparent">
          {chartData.full_name}&apos;s Cosmic Alignment
        </h1>
        <p className="text-gray-400 text-sm">
          Systems calculated under Western Tropical parameters
        </p>
        <button
          onClick={() => setShowTechnical((prev) => !prev)}
          className="rounded-full border border-amber-400 px-5 py-2 text-sm text-amber-400 transition-colors hover:bg-amber-400 hover:text-black"
        >
          {showTechnical ? '✦ Hide Blueprint Data' : '✦ View Cosmic Blueprint'}
        </button>
      </div>

      {/* Main View */}
      <AnimatePresence mode="wait">
        {!showTechnical && (
          <motion.div
            key="narrative-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mx-auto max-w-3xl"
          >
            {/* Category Tab Navigation */}
            <div className="mb-6 flex gap-6 border-b border-white/10 overflow-x-auto">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat)}
                  className={`relative pb-3 text-sm whitespace-nowrap transition-colors ${
                    activeTab === cat
                      ? 'text-amber-400 font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {categoryLabels[cat]}
                  {activeTab === cat && (
                    <motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-200"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Timeline Pill Filter */}
            <div className="mb-6 flex gap-2">
              {timelines.map((tl) => (
                <button
                  key={tl}
                  onClick={() => setActiveTimeline(tl)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs transition-colors ${
                    activeTimeline === tl
                      ? 'bg-amber-400 text-black font-semibold'
                      : 'text-zinc-400 border border-white/10 hover:text-white hover:border-white/30'
                  }`}
                >
                  <span>{timelineIcons[tl]}</span>
                  {timelineLabels[tl]}
                </button>
              ))}
            </div>

            {/* Content Panel */}
            <AnimatePresence mode="wait">
              {slot ? (
                <motion.div
                  key={`${activeTab}-${activeTimeline}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                  {/* Timeframe badge */}
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-amber-400/10 border border-amber-400/20 px-4 py-1.5">
                    <span className="text-amber-400 text-xs font-semibold tracking-wide uppercase">
                      {timelineLabels[activeTimeline]}
                    </span>
                    <span className="text-amber-400/60 text-xs">·</span>
                    <span className="text-amber-200/80 text-xs font-medium">
                      {slot.timeframe}
                    </span>
                  </div>

                  {/* Blueprint block */}
                  <div className="rounded-2xl bg-zinc-900/60 border border-white/5 p-6 backdrop-blur-xl mb-4">
                    <p className="text-[11px] text-amber-400/60 font-semibold tracking-widest uppercase mb-3">
                      The Blueprint
                    </p>
                    <p className="text-zinc-200 leading-relaxed text-[15px]">
                      {slot.blueprint}
                    </p>
                  </div>

                  {/* Current Vibe block — only for present */}
                  {slot.current_vibe && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="rounded-2xl bg-amber-400/5 border border-amber-400/20 p-6 backdrop-blur-xl"
                    >
                      <p className="text-[11px] text-amber-400 font-semibold tracking-widest uppercase mb-3">
                        The Current Vibe
                      </p>
                      <p className="text-amber-100/90 leading-relaxed text-[15px]">
                        {slot.current_vibe}
                      </p>
                    </motion.div>
                  )}
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-2xl bg-zinc-900/60 border border-white/5 p-6 text-zinc-500 text-sm text-center min-h-[160px] flex items-center justify-center"
                >
                  Report data unavailable for this section.
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {showTechnical && (
          // ----------------------------------------------------------------
          // Cosmic Blueprint Widget
          // ----------------------------------------------------------------
          <motion.div
            key="technical-view"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mx-auto max-w-6xl"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

              {/* Planets Card */}
              <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
                <h2 className="text-amber-400 font-semibold text-sm mb-4 tracking-wide">
                  ☉ Planetary Degrees
                </h2>
                <div className="space-y-2">
                  {Object.entries(chartData.raw_astrology_data.planets).map(([name, data]) => (
                    <div key={name} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 capitalize font-medium w-20">{name}</span>
                      <span className="text-zinc-400">{data.sign}</span>
                      <span className="text-zinc-200 font-mono">{data.degree.toFixed(2)}°</span>
                      <span className="text-zinc-500">{data.house}H</span>
                      {data.is_retrograde && (
                        <span className="text-amber-400 font-semibold">Rx</span>
                      )}
                      {!data.is_retrograde && <span className="w-4" />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Houses Card */}
              <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 backdrop-blur-xl">
                <h2 className="text-amber-400 font-semibold text-sm mb-4 tracking-wide">
                  ⊞ Placidus House Cusps
                </h2>
                <div className="space-y-2">
                  {Object.entries(chartData.raw_astrology_data.houses).map(([num, data]) => (
                    <div key={num} className="flex items-center justify-between text-xs">
                      <span className="text-zinc-300 font-medium w-16">House {num}</span>
                      <span className="text-zinc-400">{data.sign}</span>
                      <span className="text-zinc-200 font-mono">{data.degree.toFixed(2)}°</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Angles Card */}
              <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 backdrop-blur-xl flex flex-col">
                <h2 className="text-amber-400 font-semibold text-sm mb-4 tracking-wide">
                  ▲ Principal Calculations
                </h2>
                <div className="space-y-4 flex-1">
                  {Object.entries(chartData.raw_astrology_data.angles).map(([title, data]) => (
                    <div key={title} className="text-xs">
                      <p className="text-zinc-300 font-medium capitalize mb-0.5">{title}</p>
                      <div className="flex items-center gap-3">
                        <span className="text-zinc-400">{data.sign}</span>
                        <span className="text-amber-400 font-mono">{data.degree.toFixed(2)}°</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-6 pt-4 border-t border-white/5">
                  <span className="inline-block rounded-full bg-amber-400/10 px-3 py-1 text-xs text-amber-400/80">
                    Engine Core: Swiss Ephemeris Binding
                  </span>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
