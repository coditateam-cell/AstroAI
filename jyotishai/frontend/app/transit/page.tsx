'use client'

import StarField from '@/components/StarField'
import CosmicTransitSlider from '@/components/transit/CosmicTransitSlider'
import Link from 'next/link'

export default function TransitPage() {
  return (
    <main className="min-h-screen flex flex-col position-relative overflow-x-hidden bg-[#030308] pb-12">
      {/* Twinkling Star Background */}
      <StarField />

      {/* Premium Header */}
      <header className="relative z-20 flex justify-between items-center px-6 md:px-12 py-5 border-b border-white/[0.05] bg-[#030308]/70 backdrop-blur-xl">
        <div className="flex items-center space-x-3 select-none">
          <span className="text-2xl">🔮</span>
          <span className="font-extrabold text-lg tracking-wider bg-gradient-to-r from-amber-200 via-yellow-100 to-indigo-300 bg-clip-text text-transparent">
            JyotishAI
          </span>
        </div>
        <div className="flex items-center space-x-4">
          <Link
            href="/onboarding"
            className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-[#f4f4f8] transition-all border border-white/5 shadow-md flex items-center gap-1.5"
          >
            ← Back to Onboarding
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <section className="relative z-10 flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 pt-8 md:pt-12">
        <div className="mb-8 md:mb-10 text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-3 select-none shadow-md">
            Interactive Forecast
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
            Cosmic Transit Weather
          </h1>
          <p className="text-sm md:text-base text-[#a0a2b5] mt-3 leading-relaxed">
            Witness how the planetary orbits shift and recalculate Vedic transits in real-time. Drag the cosmic dial to forecast the next 12 months.
          </p>
        </div>

        {/* Interactive Widget */}
        <CosmicTransitSlider />
      </section>
    </main>
  )
}
