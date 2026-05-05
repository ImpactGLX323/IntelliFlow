import Button from '@/components/ui/Button'

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden px-3 pb-10 pt-3 sm:px-5 sm:pb-14 sm:pt-5 lg:px-6">
      <div className="mx-auto max-w-[96rem] overflow-hidden rounded-[2rem] border border-black/8 shadow-[0_50px_140px_-72px_rgba(15,23,42,0.52)] dark:border-white/10">
        <div className="relative">
          <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline>
            <source src="/images/bg.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,22,15,0.78),rgba(17,24,39,0.56),rgba(10,10,10,0.72))] dark:bg-[linear-gradient(135deg,rgba(10,7,5,0.82),rgba(18,13,10,0.74),rgba(3,3,3,0.84))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_35%)]" />
          <div className="absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:54px_54px]" />

          <div className="relative mx-auto flex min-h-[max(30rem,calc(100vh-7rem))] max-w-6xl flex-col items-center justify-center px-5 py-16 text-center sm:px-8 sm:py-20 lg:px-10 lg:py-24">
            <div className="rounded-full border border-white/16 bg-white/12 px-4 py-2 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.42)] backdrop-blur-xl">
              <p className="font-montserrat text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f3ddca]">
                Supply-Chain Intelligence For Malaysia
              </p>
            </div>

            <h1 className="text-balance font-montserrat mt-8 max-w-5xl text-[clamp(2.4rem,8vw,6rem)] font-semibold leading-[0.92] tracking-[-0.06em] text-white drop-shadow-[0_18px_40px_rgba(0,0,0,0.32)]">
              IntelliFlow - expertise meets precision
            </h1>
            <p className="font-lexend mt-6 max-w-3xl text-sm leading-7 text-[#efe3d8] sm:text-base sm:leading-8 lg:text-lg">
              AI-powered inventory, logistics, compliance, and supply-flow intelligence for modern Malaysian businesses.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
              <Button href="/register" size="lg">
                Get Started
              </Button>
              <Button href="/plans" variant="outline" size="lg" className="!border-white/20 !bg-white/10 !text-white hover:!bg-white/18">
                Explore Plans
              </Button>
              <Button href="#mcp-rag" variant="ghost" size="lg" className="!text-white hover:!bg-white/12">
                See AI Agents
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
