'use client'

import { useEffect, useState } from 'react'

const phases = [
  'Syncing workspace atmosphere',
  'Rendering supply-flow surfaces',
  'Preparing Malaysian control layers',
]

export default function HomeLoadingPhase() {
  const [phaseIndex, setPhaseIndex] = useState(0)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const phaseTimer = window.setInterval(() => {
      setPhaseIndex((current) => Math.min(current + 1, phases.length - 1))
    }, 320)
    const exitTimer = window.setTimeout(() => {
      setHidden(true)
    }, 1100)

    return () => {
      window.clearInterval(phaseTimer)
      window.clearTimeout(exitTimer)
    }
  }, [])

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[120] flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(86,58,39,0.16),transparent_32%),rgba(10,8,7,0.78)] backdrop-blur-xl transition-all duration-500 ${
        hidden ? 'opacity-0' : 'opacity-100'
      }`}
      aria-hidden={hidden}
    >
      <div className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(47,31,22,0.88),rgba(20,15,12,0.94))] px-8 py-7 shadow-[0_30px_90px_-50px_rgba(0,0,0,0.75)]">
        <p className="font-montserrat text-[11px] font-semibold uppercase tracking-[0.28em] text-[#d9b38d]">
          Loading Home Surface
        </p>
        <p className="font-montserrat mt-4 text-2xl font-semibold text-white">
          {phases[phaseIndex]}
        </p>
        <div className="mt-5 h-2 w-64 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#f0d7be,#d7ff4d)] transition-all duration-300"
            style={{ width: `${((phaseIndex + 1) / phases.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
