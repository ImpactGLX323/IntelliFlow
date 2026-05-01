import Button from '@/components/ui/Button'

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden px-4 pb-14 pt-4 sm:px-6 sm:pb-18 sm:pt-6">
      <div className="mx-auto max-w-[88rem] overflow-hidden rounded-[2.2rem] border border-black/8 shadow-[0_50px_140px_-72px_rgba(15,23,42,0.52)] dark:border-white/10">
        <div className="relative">
          <video className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline>
            <source src="/images/bg.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,22,15,0.78),rgba(17,24,39,0.56),rgba(10,10,10,0.72))] dark:bg-[linear-gradient(135deg,rgba(10,7,5,0.82),rgba(18,13,10,0.74),rgba(3,3,3,0.84))]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_35%)]" />

          <div className="relative mx-auto flex min-h-[calc(100vh-5.5rem)] max-w-6xl flex-col items-center justify-center px-6 py-20 text-center sm:px-10 sm:py-24">
            <div className="rounded-full border border-white/16 bg-white/12 px-4 py-2 shadow-[0_18px_45px_-28px_rgba(15,23,42,0.42)] backdrop-blur-xl">
              <p className="font-montserrat text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f3ddca]">
                Supply-Chain Intelligence For Malaysia
              </p>
            </div>

            <h1 className="text-balance font-montserrat mt-8 max-w-4xl text-[clamp(2.7rem,7vw,5.4rem)] font-semibold leading-[0.94] tracking-[-0.06em] text-white">
              IntelliFlow - expertise meets precision
            </h1>
            <p className="font-lexend mt-6 max-w-3xl text-base leading-8 text-[#efe3d8] sm:text-lg">
              AI-powered inventory, logistics, compliance, and supply-flow intelligence for modern Malaysian businesses.
            </p>

            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
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
