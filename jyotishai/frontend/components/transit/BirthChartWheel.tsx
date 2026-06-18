'use client'

import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BirthChartWheelProps {
  phaseIndex: number
}

// Astrological symbols and names
const PLANETS = [
  { name: 'Sun', symbol: '☉', color: '#f5c842', angle: 30, radius: 110 },
  { name: 'Moon', symbol: '☽', color: '#c8b8f8', angle: 120, radius: 125 },
  { name: 'Mercury', symbol: '☿', color: '#8a63f5', angle: 75, radius: 95 },
  { name: 'Venus', symbol: '♀', color: '#e879f9', angle: 210, radius: 115 },
  { name: 'Mars', symbol: '♂', color: '#f87171', angle: 330, radius: 100 },
  { name: 'Jupiter', symbol: '♃', color: '#fb923c', angle: 160, radius: 130 },
  { name: 'Saturn', symbol: '♄', color: '#a3a3a3', angle: 280, radius: 105 },
]

const ZODIAC_SIGNS = [
  { name: 'Aries', symbol: '♈' },
  { name: 'Taurus', symbol: '♉' },
  { name: 'Gemini', symbol: '♊' },
  { name: 'Cancer', symbol: '♋' },
  { name: 'Leo', symbol: '♌' },
  { name: 'Virgo', symbol: '♍' },
  { name: 'Libra', symbol: '♎' },
  { name: 'Scorpio', symbol: '♏' },
  { name: 'Sagittarius', symbol: '♐' },
  { name: 'Capricorn', symbol: '♑' },
  { name: 'Aquarius', symbol: '♒' },
  { name: 'Pisces', symbol: '♓' },
]

export default function BirthChartWheel({ phaseIndex }: BirthChartWheelProps) {
  const [isRecalculating, setIsRecalculating] = useState(false)
  const pulseTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Map 24 phase steps to a 365-day rotation equivalent (approx 15.2 days per phase)
  const sliderValue = phaseIndex * 15.2

  // Trigger brief pulse animation on slider change to simulate calculation
  useEffect(() => {
    setIsRecalculating(true)
    if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    pulseTimeoutRef.current = setTimeout(() => {
      setIsRecalculating(false)
    }, 450)

    return () => {
      if (pulseTimeoutRef.current) clearTimeout(pulseTimeoutRef.current)
    }
  }, [phaseIndex])

  // Parallax rotation calculations based on sliderValue (representing days)
  const zodiacRotation = sliderValue * 0.4
  const housesRotation = -sliderValue * 0.15
  const aspectsRotation = sliderValue * 0.6
  const planetsRotation = sliderValue * 0.25

  return (
    <div className="relative flex items-center justify-center w-full max-w-[400px] aspect-square mx-auto">
      {/* Background ambient glow */}
      <div className="absolute inset-0 bg-radial-glow rounded-full filter blur-[60px] opacity-20 pointer-events-none transition-all duration-300" 
           style={{
             background: isRecalculating 
               ? 'radial-gradient(circle, rgba(245,200,66,0.3) 0%, transparent 70%)'
               : 'radial-gradient(circle, rgba(138,99,245,0.2) 0%, transparent 70%)'
           }}
      />

      {/* SVG Astrological Wheel */}
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full drop-shadow-[0_0_30px_rgba(3,3,8,0.8)] select-none"
      >
        <defs>
          {/* Gradients */}
          <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f5c842" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0d0d19" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="coreEarth" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#030308" />
          </radialGradient>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f5c842" />
            <stop offset="50%" stopColor="#fffbeb" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#6d28d9" />
          </linearGradient>
          
          {/* Subtle Outer Glow Filter */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Outer Limit Ring */}
        <circle cx="200" cy="200" r="195" fill="none" stroke="url(#goldGradient)" strokeWidth="1" strokeOpacity="0.2" />
        <circle cx="200" cy="200" r="190" fill="none" stroke="url(#goldGradient)" strokeWidth="1.5" strokeOpacity="0.4" />

        {/* ================= LAYER 1: ZODIAC WHEEL ================= */}
        <g style={{ transform: `rotate(${zodiacRotation}deg)`, transformOrigin: '200px 200px', transition: 'transform 0.1s ease-out' }}>
          {/* Zodiac outer divider */}
          <circle cx="200" cy="200" r="165" fill="none" stroke="rgba(200, 184, 248, 0.15)" strokeWidth="1" />
          
          {/* Zodiac segments & symbols */}
          {ZODIAC_SIGNS.map((sign, idx) => {
            const angle = idx * 30
            const textAngle = angle + 15
            const rad = (textAngle * Math.PI) / 180
            const x = 200 + 177 * Math.cos(rad)
            const y = 200 + 177 * Math.sin(rad)
            
            // Boundary lines
            const lineRad = (angle * Math.PI) / 180
            const lx1 = 200 + 165 * Math.cos(lineRad)
            const ly1 = 200 + 165 * Math.sin(lineRad)
            const lx2 = 200 + 190 * Math.cos(lineRad)
            const ly2 = 200 + 190 * Math.sin(lineRad)

            return (
              <g key={sign.name}>
                {/* Sector line */}
                <line x1={lx1} y1={ly1} x2={lx2} y2={ly2} stroke="rgba(245, 200, 66, 0.25)" strokeWidth="0.75" />
                
                {/* Zodiac Symbol */}
                <text
                  x={x}
                  y={y}
                  fill={isRecalculating ? '#f5c842' : '#a0a2b5'}
                  fontSize="12"
                  fontWeight="500"
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="transition-colors duration-200"
                  style={{ transform: `rotate(${textAngle + 90}deg)`, transformOrigin: `${x}px ${y}px` }}
                >
                  {sign.symbol}
                </text>
              </g>
            )
          })}
        </g>

        {/* ================= LAYER 2: HOUSE CUSPS ================= */}
        <g style={{ transform: `rotate(${housesRotation}deg)`, transformOrigin: '200px 200px', transition: 'transform 0.15s ease-out' }}>
          <circle cx="200" cy="200" r="135" fill="none" stroke="rgba(200, 184, 248, 0.1)" strokeWidth="1" />
          
          {/* House lines and labels */}
          {Array.from({ length: 12 }).map((_, idx) => {
            const angle = idx * 30
            const lineRad = (angle * Math.PI) / 180
            const lx1 = 200 + 60 * Math.cos(lineRad)
            const ly1 = 200 + 60 * Math.sin(lineRad)
            const lx2 = 200 + 135 * Math.cos(lineRad)
            const ly2 = 200 + 135 * Math.sin(lineRad)

            const textAngle = angle + 15
            const textRad = (textAngle * Math.PI) / 180
            const tx = 200 + 75 * Math.cos(textRad)
            const ty = 200 + 75 * Math.sin(textRad)

            return (
              <g key={`house-${idx}`}>
                <line
                  x1={lx1}
                  y1={ly1}
                  x2={lx2}
                  y2={ly2}
                  stroke="rgba(200, 184, 248, 0.12)"
                  strokeWidth="0.5"
                  strokeDasharray="2 2"
                />
                <text
                  x={tx}
                  y={ty}
                  fill="rgba(160, 162, 181, 0.4)"
                  fontSize="7"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {idx + 1}
                </text>
              </g>
            )
          })}
        </g>

        {/* ================= LAYER 3: ASPECT LINES ================= */}
        <g style={{ transform: `rotate(${aspectsRotation}deg)`, transformOrigin: '200px 200px', transition: 'transform 0.18s ease-out' }}>
          {/* Conjunction, Trine, Square aspect representations */}
          {/* Sun Trine Moon */}
          <line x1={200 + 80 * Math.cos((30 * Math.PI) / 180)} y1={200 + 80 * Math.sin((30 * Math.PI) / 180)}
                x2={200 + 90 * Math.cos((120 * Math.PI) / 180)} y2={200 + 90 * Math.sin((120 * Math.PI) / 180)}
                stroke="rgba(245, 200, 66, 0.4)" strokeWidth={isRecalculating ? '1.5' : '0.75'}
                strokeDasharray="1 1" className="transition-all duration-200" />
          
          {/* Mars Square Jupiter */}
          <line x1={200 + 70 * Math.cos((330 * Math.PI) / 180)} y1={200 + 70 * Math.sin((330 * Math.PI) / 180)}
                x2={200 + 95 * Math.cos((160 * Math.PI) / 180)} y2={200 + 95 * Math.sin((160 * Math.PI) / 180)}
                stroke="rgba(248, 113, 113, 0.3)" strokeWidth={isRecalculating ? '1.2' : '0.5'} />

          {/* Venus Sextile Saturn */}
          <line x1={200 + 85 * Math.cos((210 * Math.PI) / 180)} y1={200 + 85 * Math.sin((210 * Math.PI) / 180)}
                x2={200 + 75 * Math.cos((280 * Math.PI) / 180)} y2={200 + 75 * Math.sin((280 * Math.PI) / 180)}
                stroke="rgba(200, 184, 248, 0.35)" strokeWidth="0.5" strokeDasharray="3 2" />

          {/* Mercury Opposing Moon */}
          <line x1={200 + 65 * Math.cos((75 * Math.PI) / 180)} y1={200 + 65 * Math.sin((75 * Math.PI) / 180)}
                x2={200 + 90 * Math.cos((255 * Math.PI) / 180)} y2={200 + 90 * Math.sin((255 * Math.PI) / 180)}
                stroke="rgba(138, 99, 245, 0.25)" strokeWidth="0.75" />
        </g>

        {/* ================= LAYER 4: PLANETS ================= */}
        <g style={{ transform: `rotate(${planetsRotation}deg)`, transformOrigin: '200px 200px', transition: 'transform 0.12s ease-out' }}>
          {PLANETS.map((planet) => {
            const rad = (planet.angle * Math.PI) / 180
            const px = 200 + planet.radius * Math.cos(rad)
            const py = 200 + planet.radius * Math.sin(rad)

            return (
              <g key={planet.name} className="cursor-pointer group">
                {/* Orbit path for visual aid */}
                <circle cx="200" cy="200" r={planet.radius} fill="none" stroke="rgba(200, 184, 248, 0.04)" strokeWidth="1" />
                
                {/* Connector line to center */}
                <line x1="200" y1="200" x2={px} y2={py} stroke="rgba(200, 184, 248, 0.08)" strokeWidth="0.5" />

                {/* Planet Node Glow (on recalculating or hover) */}
                <circle
                  cx={px}
                  cy={py}
                  r="14"
                  fill="rgba(13, 13, 25, 0.85)"
                  stroke={planet.color}
                  strokeWidth={isRecalculating ? '2' : '1'}
                  className="transition-all duration-300 shadow-lg"
                  style={{
                    filter: isRecalculating ? 'url(#glow)' : 'none',
                    strokeOpacity: isRecalculating ? 1 : 0.6
                  }}
                />

                {/* Planet Symbol */}
                <text
                  x={px}
                  y={py}
                  fill={planet.color}
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {planet.symbol}
                </text>

                {/* Planet Hover Label placeholder */}
                <title>{planet.name}</title>
              </g>
            )
          })}
        </g>

        {/* ================= CENTER CORE ================= */}
        {/* Dynamic Glowing rings under center earth */}
        <circle
          cx="200"
          cy="200"
          r="60"
          fill="url(#centerGlow)"
          className="pointer-events-none"
        />

        <AnimatePresence>
          {isRecalculating && (
            <motion.circle
              initial={{ r: 24, opacity: 0.8 }}
              animate={{ r: 55, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              cx="200"
              cy="200"
              fill="none"
              stroke="url(#goldGradient)"
              strokeWidth="1.5"
            />
          )}
        </AnimatePresence>

        {/* Central Earth Node (Vedic Center) */}
        <circle
          cx="200"
          cy="200"
          r="24"
          fill="url(#coreEarth)"
          stroke="url(#goldGradient)"
          strokeWidth="1.5"
          className="shadow-2xl"
        />

        {/* Minimal Earth Symbol / Center Core Art */}
        <circle cx="200" cy="200" r="10" fill="none" stroke="rgba(245, 200, 66, 0.15)" strokeWidth="1" />
        <line x1="200" y1="188" x2="200" y2="212" stroke="rgba(245, 200, 66, 0.3)" strokeWidth="0.75" />
        <line x1="188" y1="200" x2="212" y2="200" stroke="rgba(245, 200, 66, 0.3)" strokeWidth="0.75" />
        <circle cx="200" cy="200" r="3" fill="#f5c842" />
      </svg>

      {/* Recalculating Badge in the corner of the chart container */}
      <div className="absolute top-2 right-2 flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-[#0d0d19]/80 border border-white/5 backdrop-blur-md text-[9px] uppercase tracking-wider text-amber-400 font-semibold select-none shadow-md">
        <span className={`w-1.5 h-1.5 rounded-full bg-amber-400 ${isRecalculating ? 'animate-ping' : ''}`} />
        <span>{isRecalculating ? 'Calculating Transits' : 'Calculated'}</span>
      </div>
    </div>
  )
}
