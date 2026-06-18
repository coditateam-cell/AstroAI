'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import BirthChartWheel from './BirthChartWheel'
import CosmicWeatherCard from './CosmicWeatherCard'

interface Phase {
  name: string
  range: string
  monthLabel: string
  isEarly: boolean
  year: number
  month: number
}

export default function CosmicTransitSlider() {
  const [mounted, setMounted] = useState(false)
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [phases, setPhases] = useState<Phase[]>([])

  useEffect(() => {
    // Dynamically generate 24 phase steps client-side starting from today
    const today = new Date()
    const phasesList: Phase[] = []
    
    let currentYear = today.getFullYear()
    let currentMonth = today.getMonth() // 0-11
    let isEarly = today.getDate() <= 15

    for (let i = 0; i < 24; i++) {
      const d = new Date(currentYear, currentMonth, 1)
      const monthName = format(d, 'MMMM')
      const monthShort = format(d, 'MMM')
      const phaseName = `${isEarly ? 'Early' : 'Late'} ${monthName} ${currentYear}`
      
      let dateRange = ''
      if (isEarly) {
        dateRange = `${monthName} 1 – 15, ${currentYear}`
      } else {
        const lastDay = new Date(currentYear, currentMonth + 1, 0).getDate()
        dateRange = `${monthName} 16 – ${lastDay}, ${currentYear}`
      }

      phasesList.push({
        name: phaseName,
        range: dateRange,
        monthLabel: monthShort,
        isEarly,
        year: currentYear,
        month: currentMonth
      })

      // Shift to next phase
      if (isEarly) {
        isEarly = false
      } else {
        isEarly = true
        currentMonth++
        if (currentMonth > 11) {
          currentMonth = 0
          currentYear++
        }
      }
    }

    setPhases(phasesList)
    setMounted(false)
    const t = setTimeout(() => setMounted(true), 50)
    return () => clearTimeout(t)
  }, [])

  if (!mounted || phases.length === 0) {
    return (
      <div className="w-full min-h-[500px] flex items-center justify-center text-amber-500/50">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin" />
          <span className="text-xs uppercase tracking-widest font-semibold">Aligning Celestial Spheres...</span>
        </div>
      </div>
    )
  }

  const activePhase = phases[phaseIndex]
  const fillPercentage = (phaseIndex / 23) * 100

  return (
    <div className="w-full flex flex-col space-y-8 md:space-y-12">
      {/* Dynamic inline styles for range slider cross-browser compatibility */}
      <style jsx global>{`
        input[type='range'].cosmic-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #f5c842;
          border: 3px solid #030308;
          box-shadow: 0 0 15px rgba(245, 200, 66, 0.8), 0 0 3px rgba(255, 255, 255, 0.5);
          cursor: grab;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        input[type='range'].cosmic-slider::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.15);
          box-shadow: 0 0 25px rgba(245, 200, 66, 1), 0 0 5px rgba(255, 255, 255, 0.8);
        }
        input[type='range'].cosmic-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #f5c842;
          border: 3px solid #030308;
          box-shadow: 0 0 15px rgba(245, 200, 66, 0.8);
          cursor: grab;
          transition: transform 0.1s ease;
        }
        input[type='range'].cosmic-slider::-moz-range-thumb:active {
          cursor: grabbing;
          transform: scale(1.15);
        }
      `}</style>

      {/* Grid Layout: Birth Chart + Cosmic Weather Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center lg:items-stretch">
        
        {/* Left: Birth Chart SVG Component */}
        <div className="lg:col-span-5 flex items-center justify-center p-4 lg:p-6 bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.05] rounded-2xl backdrop-blur-sm">
          <div className="w-full flex flex-col items-center">
            <h4 className="text-[10px] uppercase tracking-widest text-[#a0a2b5] font-semibold mb-4 text-center">
              Astro-Position Calculations
            </h4>
            <BirthChartWheel phaseIndex={phaseIndex} />
          </div>
        </div>

        {/* Right: Unlocked Weather Card Component */}
        <div className="lg:col-span-7">
          <CosmicWeatherCard
            phaseName={activePhase.name}
            phaseRange={activePhase.range}
            phaseIndex={phaseIndex}
          />
        </div>
      </div>

      {/* Bottom Timeline Controls */}
      <div className="w-full bg-gradient-to-r from-white/[0.05] to-white/[0.02] border border-white/[0.06] backdrop-blur-md rounded-2xl p-6 md:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-white tracking-wide">
              15-Day Cycle Planner
            </h3>
            <p className="text-xs text-[#a0a2b5]">
              Drag to view general cosmic weather patterns and specific metrics during bi-weekly phases.
            </p>
          </div>
          <div className="flex items-center space-x-3 bg-black/40 border border-white/[0.05] rounded-xl px-4 py-2 self-start md:self-auto shadow-inner">
            <span className="text-xs text-[#a0a2b5] uppercase tracking-wider font-semibold">Active Cycle:</span>
            <span className="text-sm font-extrabold text-amber-400">
              {activePhase.name}
            </span>
          </div>
        </div>

        {/* Range Slider Track */}
        <div className="relative mt-8 mb-6 px-1">
          {/* Track Underlay */}
          <div className="absolute top-[9px] left-0 right-0 h-1.5 bg-white/[0.06] rounded-full pointer-events-none" />
          
          {/* Mapped Track Fill */}
          <div 
            className="absolute top-[9px] left-0 h-1.5 bg-gradient-to-r from-purple-600 to-amber-400 rounded-full pointer-events-none shadow-[0_0_8px_rgba(245,200,66,0.3)] transition-all duration-100"
            style={{ width: `calc(${fillPercentage}% - ${fillPercentage * 0.1}px)` }}
          />

          {/* HTML5 Range Slider: 24 Steps (0-23) */}
          <input
            type="range"
            min="0"
            max="23"
            value={phaseIndex}
            onChange={(e) => setPhaseIndex(parseInt(e.target.value))}
            className="cosmic-slider absolute -top-1 left-0 w-full h-6 appearance-none bg-transparent cursor-pointer outline-none z-10"
          />

          {/* Month Marker Ticks (displayed only once per month at the start) */}
          <div className="relative w-full h-12 mt-6 select-none">
            {phases.map((tick, index) => {
              // We only want to draw labels at the start of each month (isEarly = true)
              if (!tick.isEarly) return null

              const percent = (index / 23) * 100
              const isActive = (index <= phaseIndex)
              
              return (
                <div
                  key={`${tick.name}-${index}`}
                  className="absolute transform -translate-x-1/2 flex flex-col items-center group transition-colors duration-200"
                  style={{ left: `${percent}%` }}
                >
                  {/* Tick Dot */}
                  <div 
                    className={`w-1.5 h-1.5 rounded-full transition-all duration-300 border ${
                      isActive 
                        ? 'bg-amber-400 border-amber-400 scale-125 shadow-[0_0_8px_#f5c842]' 
                        : 'bg-[#030308] border-white/20'
                    }`} 
                  />
                  
                  {/* Month Label */}
                  <span 
                    className={`text-[10px] mt-2.5 font-bold transition-all duration-300 ${
                      isActive 
                        ? 'text-amber-400 scale-105' 
                        : 'text-white/40 group-hover:text-white/60'
                    }`}
                  >
                    {tick.monthLabel}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
