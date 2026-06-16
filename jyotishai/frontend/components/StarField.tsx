'use client'
import { useEffect, useRef } from 'react'

export default function StarField() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    for (let i = 0; i < 80; i++) {
      const star = document.createElement('div')
      const size = Math.random() * 2 + 0.5
      const duration = 2 + Math.random() * 4
      const delay = Math.random() * 4

      star.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        background: white;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: twinkle ${duration}s ease-in-out infinite ${delay}s;
        pointer-events: none;
      `
      container.appendChild(star)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed', inset: 0, overflow: 'hidden', zIndex: 0, pointerEvents: 'none'
      }}
    />
  )
}
