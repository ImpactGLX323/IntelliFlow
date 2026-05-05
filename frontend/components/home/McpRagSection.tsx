const panels = [
  {
    title: 'Inventory MCP',
    body: 'Reads stock ledgers, transfer movements, and reservation positions before recommendations are generated.',
  },
  {
    title: 'Sales MCP',
    body: 'Measures sales velocity, product mix shifts, and order pressure to flag replenishment actions early.',
  },
  {
    title: 'Returns MCP',
    body: 'Surfaces return-driven margin leakage so teams can isolate problem SKUs and reverse-logistics costs.',
  },
  {
    title: 'Logistics MCP',
    body: 'Tracks delayed shipments, route risk, customs blockers, and operational fallout across open orders.',
  },
  {
    title: 'Malaysia Compliance RAG',
    body: 'Retrieves trusted compliance context for invoicing, audit readiness, and documentation-sensitive flows.',
  },
]

export default function McpRagSection() {
  return (
    <section id="mcp-rag" className="px-4 py-14 sm:px-6 sm:py-20">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-[#604630] bg-[linear-gradient(180deg,rgba(49,34,25,0.5),rgba(22,18,16,0.8))] px-6 py-8 text-white shadow-[0_50px_120px_-72px_rgba(15,23,42,0.7)] backdrop-blur-[26px] sm:px-8 sm:py-10 lg:px-12 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(35,23,17,0.98),rgba(18,13,10,0.98))]">
        <div className="max-w-3xl">
          <p className="font-montserrat text-xs font-semibold uppercase tracking-[0.28em] text-[#ff9b3d]/78">
            MCP + RAG Operations Layer
          </p>
          <h2 className="text-balance font-montserrat mt-5 text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[0.98] tracking-[-0.05em]">
            MCP and RAG Agents That Boost Inventory Flow
          </h2>
          <p className="font-lexend mt-5 text-sm leading-8 text-[#c5cfda] sm:text-base">
            Instead of giving generic chatbot answers, IntelliFlow agents connect to inventory, sales, returns, logistics, and compliance data through structured tools. That means the system can explain what is happening, why it matters, and what action should be taken.
          </p>
          <p className="font-lexend mt-4 text-sm leading-8 text-[#c5cfda] sm:text-base">
            The operational layer is built to read inventory context, analyze sales velocity, detect return-based profit leakage, observe logistics delays, answer compliance questions from trusted documents, and create structured recommendations.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {panels.map((panel) => (
            <article
              key={panel.title}
              className="rounded-[1.6rem] border border-[#c39569]/14 bg-[#8f6442]/14 p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_22px_50px_-28px_rgba(0,0,0,0.45)] active:scale-[0.99]"
            >
              <p className="font-montserrat text-sm font-semibold uppercase tracking-[0.14em] text-white">
                {panel.title}
              </p>
              <p className="font-lexend mt-4 text-sm leading-7 text-[#c5cfda]">
                {panel.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
