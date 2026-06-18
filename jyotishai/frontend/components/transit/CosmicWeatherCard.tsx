'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

interface CosmicWeatherCardProps {
  phaseName: string
  phaseRange: string
  phaseIndex: number
}

interface TransitData {
  title: string
  vibeType: string
  summary: string
  color: string
  badgeColor: string
  careerScore: number
  loveScore: number
  vitalityScore: number
  remedy: string
  hours: string
  warning: string
}

const TRANSIT_DATABASE = [
  {
    title: 'Saturn retrograde: Structural reflections in the career sphere.',
    vibeType: 'Saturnian Shift',
    summary: 'Saturn slows its pace, casting a sober, reflective light over professional ambitions. The planetary guidance suggests checking the foundations of your current structures rather than forcing immediate expansion. A quiet, patient review brings durable stability.',
    color: 'from-amber-600 to-yellow-500',
    badgeColor: 'text-amber-400 bg-amber-950/40 border-amber-900/30',
    remedy: 'Review old databases, configuration archives, or foundational roadmaps; a missed structural clue awaits discovery.',
    hours: 'Morning hours, when analytical focus is supported by lunar grounding.',
    warning: 'Demanding immediate external commitments from authority figures is unlikely to bear fruit in this cycle.'
  },
  {
    title: 'Venus conjunct Mars: Relational currents align with creative impulses.',
    vibeType: 'Venusian Alignment',
    summary: 'A delicate tension forms between personal expression and relational desire. The celestial movements highlight silent, unspoken adjustments in how you approach connection. There is a sense of something gathering beneath the surface, waiting for its season.',
    color: 'from-fuchsia-500 to-rose-500',
    badgeColor: 'text-fuchsia-400 bg-fuchsia-950/40 border-fuchsia-900/30',
    remedy: 'Consider allocating space for quiet listening today. Relational harmony is favored when external demands are set aside.',
    hours: 'Late afternoon, as the solar positioning aligns with relational nodes.',
    warning: 'A brief shadow period suggests caution in addressing long-standing family dynamics directly.'
  },
  {
    title: 'Jupiter trine Mercury: Expansive communications and conceptual shifts.',
    vibeType: 'Jovian Spark',
    summary: 'An intellectual current flows through the cosmic spaces, making complex architectures feel accessible. Insights arrive not in sudden flashes, but as a gradual widening of perspective. It is an auspicious cycle for writing down long-term designs.',
    color: 'from-blue-500 to-teal-500',
    badgeColor: 'text-blue-400 bg-blue-950/40 border-blue-900/30',
    remedy: 'Allow yourself to draft conceptual flowcharts and schemas without worrying about immediate practical constraints.',
    hours: 'Mid-morning, during Mercurys solar ascendance.',
    warning: 'Take care not to scatter focus over too many details; prioritize the core architectural blueprint.'
  },
  {
    title: 'Mercury in Virgo: Meticulous logic and quiet analytical focus.',
    vibeType: 'Mercurial Precision',
    summary: 'The mind settles into a period of quiet, meticulous organization. The stars favor cleaning the code, adjusting alignments, and setting up strict boundaries. It is a slow, steady tide of technical efficiency.',
    color: 'from-teal-500 to-emerald-500',
    badgeColor: 'text-teal-400 bg-teal-950/40 border-teal-900/30',
    remedy: 'Focus on cleaning up technical debt, formatting styles, and building solid validation checkers.',
    hours: 'Noon, when logical precision and mental clarity are at their peak.',
    warning: 'Do not let perfectionism paralyze you from sharing draft concepts with trusted collaborators.'
  },
  {
    title: 'Solar conjunct Moon: A cycle of internal integration and new intentions.',
    vibeType: 'Solar-Lunar Core',
    summary: 'The cosmic light dims slightly, prompting a turn inward. The solar and lunar energies merge, suggesting a period of rest and physical grounding. The noise of outer demands recedes, leaving space for internal clarity.',
    color: 'from-orange-500 to-amber-600',
    badgeColor: 'text-orange-400 bg-orange-950/40 border-orange-900/30',
    remedy: 'Spend time in quiet isolation, noting down what ideas feel authentic versus what is done out of habit.',
    hours: 'Late evening, under the soft shelter of the dark sky.',
    warning: 'Avoid high-exertion tasks or launching major marketing operations until the light returns.'
  },
  {
    title: 'Uranus conjunct Venus: Unexpected shifts in creative values.',
    vibeType: 'Uranian Tension',
    summary: 'A minor disruption triggers sudden updates in how you view resources and aesthetic values. The old patterns are shaken to make room for cleaner, more modern designs. Let the current carry you into new territory.',
    color: 'from-purple-500 to-pink-500',
    badgeColor: 'text-purple-400 bg-purple-950/40 border-purple-900/30',
    remedy: 'Experiment with unstyled prototypes or color palettes that you would normally avoid.',
    hours: 'Early afternoon, when creative flow aligns with high-order insights.',
    warning: 'Do not rush to delete old architectures; archive them safely while you build the new versions.'
  }
]

export default function CosmicWeatherCard({ phaseName, phaseRange, phaseIndex }: CosmicWeatherCardProps) {
  const [data, setData] = useState<TransitData | null>(null)

  useEffect(() => {
    // Generate deterministic values based on phaseIndex
    const transitIndex = phaseIndex % TRANSIT_DATABASE.length
    const baseTransit = TRANSIT_DATABASE[transitIndex]

    // Seeds for deterministic energy scores
    const seed = phaseIndex + 149
    const careerScore = 60 + (seed * 11) % 36
    const loveScore = 65 + (seed * 13) % 31
    const vitalityScore = 58 + (seed * 17) % 38

    setData({
      ...baseTransit,
      careerScore,
      loveScore,
      vitalityScore
    })
  }, [phaseIndex])

  if (!data) return null

  // Metric circle drawing helper
  const renderMetricCircle = (score: number, label: string, colorClass: string, strokeGradientId: string, stopColors: [string, string]) => {
    const radius = 22
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (score / 100) * circumference

    return (
      <div className="flex flex-col items-center flex-1 min-w-[70px] select-none">
        <div className="relative flex items-center justify-center w-14 h-14">
          <svg className="w-14 h-14 transform -rotate-90">
            <circle
              cx="28"
              cy="28"
              r={radius}
              className="text-white/[0.03]"
              strokeWidth="4"
              fill="transparent"
              stroke="currentColor"
            />
            <motion.circle
              cx="28"
              cy="28"
              r={radius}
              className={colorClass}
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              strokeLinecap="round"
              stroke={`url(#${strokeGradientId})`}
            />
            <defs>
              <linearGradient id={strokeGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={stopColors[0]} />
                <stop offset="100%" stopColor={stopColors[1]} />
              </linearGradient>
            </defs>
          </svg>
          <span className="absolute text-[11px] font-extrabold text-white">{score}%</span>
        </div>
        <span className="text-[9px] uppercase tracking-widest text-[#a0a2b5] font-semibold mt-2 text-center whitespace-nowrap">
          {label}
        </span>
      </div>
    )
  }

  return (
    <div className="relative w-full rounded-2xl bg-gradient-to-b from-white/[0.07] to-white/[0.02] border border-white/[0.08] backdrop-blur-xl p-6 overflow-hidden shadow-2xl flex flex-col justify-between h-full min-h-[460px]">
      
      {/* Visual Accent Corner Glow */}
      <div className={`absolute -top-12 -right-12 w-36 h-36 bg-gradient-to-br ${data.color} rounded-full filter blur-[50px] opacity-10 pointer-events-none`} />

      <div>
        {/* Date and Phase Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
          <div>
            <span className="text-[10px] uppercase tracking-widest text-amber-500 font-bold">
              15-Day Phase Forecast
            </span>
            <h3 className="text-xl md:text-2xl font-bold text-white mt-1">
              Phase Forecast: {phaseName}
            </h3>
            <span className="text-xs text-[#a0a2b5] block mt-1">
              Cycle Range: {phaseRange}
            </span>
            <span className={`inline-flex items-center mt-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${data.badgeColor}`}>
              {data.vibeType}
            </span>
          </div>

          {/* Three Metric Breakdown Circles */}
          <div className="flex items-center space-x-4 w-full sm:w-auto bg-black/20 border border-white/[0.03] rounded-xl p-3 shadow-inner">
            {renderMetricCircle(data.careerScore, 'Focus', 'text-amber-400', 'careerGrad', ['#f5c842', '#fb923c'])}
            {renderMetricCircle(data.loveScore, 'Relational', 'text-pink-400', 'loveGrad', ['#f472b6', '#db2777'])}
            {renderMetricCircle(data.vitalityScore, 'Vitality', 'text-teal-400', 'vitalityGrad', ['#2dd4bf', '#059669'])}
          </div>
        </div>

        {/* Newspaper Horoscope-Style Summary */}
        <div className="mb-6 space-y-4">
          <h4 className="text-[10px] uppercase tracking-widest text-[#a0a2b5] font-bold border-b border-white/[0.05] pb-2">
            Celestial Configurations
          </h4>
          <p className="text-white font-medium text-base leading-relaxed italic font-serif">
            "{data.title}"
          </p>
          <p className="text-[#a0a2b5] text-sm leading-relaxed font-serif">
            {data.summary}
          </p>
        </div>
      </div>

      {/* Plan Details Container */}
      <div className="relative border-t border-white/[0.08] pt-5 mt-auto">
        <h4 className="text-[10px] uppercase tracking-widest text-amber-500 font-bold mb-3">
          Planetary Influences & Flow
        </h4>

        {/* Action parameters */}
        <div className="space-y-3 font-serif text-sm">
          <div className="flex items-start space-x-3 text-[#f4f4f8]">
            <span className="text-amber-500 font-semibold mt-0.5">✦</span>
            <div>
              <span className="text-amber-400/90 font-medium mr-1 not-italic">Remedy:</span>
              <span className="text-[#a0a2b5] italic">{data.remedy}</span>
            </div>
          </div>
          <div className="flex items-start space-x-3 text-[#f4f4f8]">
            <span className="text-amber-500 font-semibold mt-0.5">✦</span>
            <div>
              <span className="text-amber-400/90 font-medium mr-1 not-italic">Auspicious Alignments:</span>
              <span className="text-[#a0a2b5] italic">{data.hours}</span>
            </div>
          </div>
          <div className="flex items-start space-x-3 text-[#f4f4f8]">
            <span className="text-amber-500 font-semibold mt-0.5">✦</span>
            <div>
              <span className="text-rose-400 font-medium mr-1 not-italic">Planetary Friction:</span>
              <span className="text-[#a0a2b5] italic">{data.warning}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
