import Link from "next/link";

const PRINCIPLES = [
  {
    title: "It won't give you the answer",
    body: "Every other AI hands you the conclusion. Foil is bounded so it can't. It asks the next question instead, because the struggle is where the learning lives.",
  },
  {
    title: "It scores how you think",
    body: "Each question you ask is read for curiosity, specificity, the assumptions it surfaces, and the evidence it reaches for. An invisible skill, made visible so you can feel it sharpen.",
  },
  {
    title: "Private when you want it",
    body: "By default Foil thinks with Claude, through a server that stores nothing. Want total privacy? Switch on a small in-browser model in one click and your questions never leave your machine. No account either way.",
  },
];

export default function Home() {
  return (
    <div className="bg-paper text-ink">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <span className="font-serif text-2xl tracking-tight">Foil</span>
        <div className="flex items-center gap-3">
          <Link
            href="/litepaper"
            className="text-sm font-medium text-ink/55 hover:text-ink"
          >
            Litepaper
          </Link>
          <Link
            href="/think"
            className="rounded-full border border-ink/20 px-4 py-1.5 text-sm font-medium hover:bg-ink/5"
          >
            Start thinking
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="py-16 sm:py-24">
          <p className="mb-5 text-sm font-medium uppercase tracking-widest text-accent">
            A thinking coach, not an answer machine
          </p>
          <h1 className="max-w-3xl font-serif text-4xl leading-[1.1] sm:text-6xl">
            The AI that won&rsquo;t give you the answer.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink/70 sm:text-xl">
            As AI gets better at producing answers, the scarce human skill becomes
            asking the right question and judging what comes back. Foil is built to
            train exactly that. Bring it anything you want to understand. It will
            interrogate your thinking, never do it for you.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/think"
              className="rounded-full bg-accent px-7 py-3 font-semibold text-paper"
            >
              Start an inquiry
            </Link>
            <Link
              href="/litepaper"
              className="rounded-full border border-ink/25 px-7 py-3 font-medium hover:bg-ink/5"
            >
              Read the litepaper
            </Link>
            <span className="text-sm text-ink/55">
              Free · open source · no account
            </span>
          </div>
        </section>

        <section className="border-t border-ink/10 py-16">
          <div className="grid gap-10 sm:grid-cols-3">
            {PRINCIPLES.map((p) => (
              <div key={p.title}>
                <h2 className="font-serif text-xl leading-snug">{p.title}</h2>
                <p className="mt-2.5 text-[0.95rem] leading-relaxed text-ink/65">{p.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-ink/10 py-16">
          <div className="rounded-3xl bg-card p-8 sm:p-12">
            <p className="text-sm font-medium uppercase tracking-widest text-ink/40">
              The question we built this around
            </p>
            <p className="mt-4 max-w-3xl font-serif text-2xl leading-snug sm:text-3xl">
              When machines can answer almost anything, where do humans still add
              value? In knowing what to ask, and whether the answer is any good.
            </p>
            <p className="mt-5 max-w-2xl leading-relaxed text-ink/65">
              That capability compounds across every subject and every job, and it is
              the one schooling optimizes for least. Foil is a small, simple tool for
              practicing it, for students, self-learners, and anyone who wants to
              think more clearly.
            </p>
            <Link
              href="/think"
              className="mt-7 inline-block rounded-full border border-ink/25 px-6 py-2.5 font-medium hover:bg-ink/5"
            >
              Try it now
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-5xl px-6 py-10 text-sm text-ink/50">
        <p>Open source under AGPL-3.0. Built as a digital public good.</p>
      </footer>
    </div>
  );
}
