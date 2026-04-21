'use client'

import CopilotDock from '@/components/copilot/CopilotDock'
import Sidebar from '@/components/layout/Sidebar'
import Topbar from '@/components/layout/Topbar'

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="hud-workspace min-h-screen p-3 text-white sm:p-6">
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-32 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.16),transparent_62%)]" />

      <div className="ive-device relative z-10 mx-auto flex min-h-[calc(100vh-1.5rem)] w-full max-w-[1680px] overflow-hidden rounded-[1.8rem] sm:min-h-[calc(100vh-3rem)] sm:rounded-[2.7rem]">
        <Sidebar />
        <div className="relative z-10 min-w-0 flex-1 overflow-x-hidden">
          <Topbar />
          <main className="mx-auto w-full max-w-7xl overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:pr-[420px]">
            {children}
          </main>
        </div>
        <CopilotDock />
      </div>
    </div>
  )
}
