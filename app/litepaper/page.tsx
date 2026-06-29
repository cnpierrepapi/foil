import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Foil Litepaper: the AI that won't give you the answer",
  description:
    "A full overview of Foil: why it refuses to give answers, how it scores your thinking, the learning science behind it, and how it keeps your inquiry private.",
};

type Dimension = { term: string; text: string };
type Section = {
  id: string;
  title: string;
  paras: string[];
  dimensions?: Dimension[];
};

// The litepaper content lives as plain strings so the prose reads naturally
// (apostrophes, quotes) without escaping, and so it stays free of em dashes.
const SECTIONS: Section[] = [
  {
    id: "summary",
    title: "In short",
    paras: [
      "Foil is a thinking coach. It helps you get better at two things: asking good questions, and judging whether an answer is any good.",
      "It does one thing that no other AI tool does. It refuses to give you the answer. Instead it asks you the next useful question, and it scores how well you are thinking.",
      "You bring a claim, a question, an argument, or something in the world you want to understand. Foil works through it with you. You do the thinking. It never does it for you.",
      "Foil runs on Claude by default. You can switch to a private model that runs inside your own browser. There is no account, no tracking, and no cost to use it.",
      "It is free and open source, released under the AGPL license, and built to be a public good.",
    ],
  },
  {
    id: "problem",
    title: "The problem: answers are now cheap",
    paras: [
      "For most of history, the hard part of learning was getting the answer. Facts were scarce. You had to find them, remember them, and repeat them back.",
      "That world is ending. A machine can now answer almost any question for free, in seconds, at any hour of the day.",
      "When answers are everywhere, knowing an answer is worth less. The value moves to the parts of thinking that the machine cannot do for you.",
      "Two human skills survive this shift. The first is knowing what to ask. The second is knowing whether the answer you got is any good.",
      "School was built for the old world. It still rewards recall and finished answers. It spends very little time training the skill of inquiry itself.",
      "Foil is built for the new world. It trains the one capability that keeps its value as machines get better at everything else.",
    ],
  },
  {
    id: "skill",
    title: "The skill that stays scarce",
    paras: [
      "Good thinking starts with a good question. A vague question gets a vague answer. A sharp question opens a real path.",
      "Most people were never taught how to ask. They were taught how to answer.",
      "Asking well is a skill. Like any skill, it gets better with practice and honest feedback.",
      "The second half of the skill is judgment. When an answer arrives, you have to weigh it. Is the reasoning sound? What is it assuming? What evidence would change it?",
      "These two moves, asking and judging, compound across every subject and every job. They are the core of what we call critical thinking.",
      "Foil makes both moves visible, so you can feel them sharpen over time.",
    ],
  },
  {
    id: "what",
    title: "What Foil is",
    paras: [
      "Foil is a Socratic coach. The name comes from the idea of a foil, something that sharpens you by pushing back.",
      "You start an inquiry by bringing a source. It can be a claim from the news, a question you are studying, a line of argument, or a phenomenon you cannot explain.",
      "You investigate by asking questions and reasoning out loud, the same way you would with a sharp tutor sitting next to you.",
      "Foil reads each move you make. It replies with one probing question that moves your own thinking one step forward. It also scores the quality of your move.",
      "The whole experience fits on one screen. There is no setup, no feed, and no engagement loop. You think, and then you leave.",
    ],
  },
  {
    id: "rule",
    title: "The one rule: it never gives the answer",
    paras: [
      "Every other AI tool is built to hand you the conclusion. Foil is built so that it cannot.",
      "The model is bound by a hard rule. It will not state the fact, the definition, or the chain of reasoning that settles your question.",
      "If you ask it for the answer, it will warmly decline and turn the request back into a sharper question you can pursue yourself.",
      "This is not a limitation we are working around. It is the whole point. The struggle is where the learning happens.",
      "Learning science backs this up. When you have to retrieve and build an idea yourself, it sticks. When someone hands it to you, it slips away.",
      "So Foil withholds the answer on purpose. The reward is that you build the thinking, not just collect the result.",
    ],
  },
  {
    id: "session",
    title: "How a session works",
    paras: [
      "A session is a short, focused run called an episode. An episode is fourteen exchanges long.",
      "You ask or reason. Foil asks back and scores you. You go again. This repeats until the episode is complete.",
      "Fourteen exchanges is long enough to go deep on one idea, and short enough to finish in a single sitting.",
      "When the episode ends, Foil shows you a summary of how you thought across the whole session.",
      "Everything is saved on your device, so you can come back and watch your progress build over time.",
    ],
  },
  {
    id: "scoring",
    title: "How your thinking is scored",
    paras: [
      "After every message you send, Foil scores your move on four dimensions. Each one runs from zero to five.",
      "The score is honest, not flattering. A vague first question should score low. That is useful information, not an insult.",
      "These four dimensions are not random. They are the load bearing parts of clear reasoning. Together they describe what it means to think well about anything.",
    ],
    dimensions: [
      {
        term: "Curiosity",
        text: "Are you opening the question up and going deeper, or closing it down and staying on the surface?",
      },
      {
        term: "Specificity",
        text: "Is your question precise and concrete enough to actually be answered, or is it still too broad?",
      },
      {
        term: "Assumptions",
        text: "Are you naming and testing the premises hidden inside your question, or taking them for granted?",
      },
      {
        term: "Evidence",
        text: "Are you reaching for proof, mechanism, or a counter example, rather than just asserting?",
      },
    ],
  },
  {
    id: "mastery",
    title: "Mastery, skill cards, and the report card",
    paras: [
      "At the end of an episode, Foil turns your four scores into one headline number called Mastery. It runs from 1.00 to 4.99.",
      "Mastery is the average of your four dimensions, rescaled so that small gains are visible and the number always means the same thing.",
      "You also get a set of skill cards, in the style of a language learning app. They show your strongest dimension, your weakest dimension, and how the number was worked out.",
      "A radar chart draws your four scores as a shape. As you improve, the shape grows and becomes more balanced. You get to watch your thinking take form.",
      "You can download a report card as an image and keep it or share it.",
      "Your profile page shows your Mastery over time and a list of past episodes, so you can see the trend move as you practice.",
    ],
  },
  {
    id: "science",
    title: "The learning science behind it",
    paras: [
      "Foil is not built on a hunch. It rests on a body of research about how people actually learn to think.",
      "The Socratic method is the oldest part. A good teacher does not lecture. They ask the question that lets the student see the next step for themselves.",
      "Constructivism says that understanding is built by the learner, not poured in. You learn by making and testing your own ideas.",
      "Work on productive struggle and desirable difficulty shows that effort during learning is what makes it last. Learning that feels too easy is forgotten fast.",
      "The generation effect shows that producing an answer yourself, even a wrong one, beats reading the right answer.",
      "Vygotsky described the zone of proximal development, the gap between what you can do alone and what you can do with the right nudge. Foil aims its question right at that gap.",
      "Frameworks for critical thinking, such as the Paul and Elder model, name the parts of good reasoning: clarity, precision, assumptions, and evidence. Foil scores against those same parts.",
      "The Question Formulation Technique treats asking questions as a teachable skill in its own right. Foil makes that skill the main event.",
      "Deliberate practice, studied by Anders Ericsson, shows that skill grows through focused repetition with immediate feedback. An episode is exactly that.",
    ],
  },
  {
    id: "privacy",
    title: "Privacy and responsible AI",
    paras: [
      "Foil is built to be responsible by design, not by promise.",
      "The core safety feature is the rule itself. The model is bounded so that it cannot give the answer or do the thinking for you. Responsible behavior is the product, not a disclaimer.",
      "By default, Foil thinks with Claude, through a server that stores nothing. It keeps no transcripts and no accounts. Your inquiry is not logged.",
      "If you want total privacy, you can switch on a small open model that runs entirely inside your browser. Your questions never leave your machine, and it works offline after the first load.",
      "That on device option is opt in. The default is the cloud model, because it gives the best coaching for most people. The private option is one click away whenever you want it.",
      "There is no tracking, no advertising, and no data harvesting. The tool does not try to keep you on it. When you are done thinking, you close it.",
    ],
  },
  {
    id: "who",
    title: "Who it is for",
    paras: [
      "Students who want to understand a subject, not just pass the test on it.",
      "Self learners who read widely and want to reason about what they read.",
      "Anyone who has to weigh claims for a living, including writers, analysts, founders, and decision makers.",
      "Teachers who want a calm tool that builds the habit of inquiry in their students.",
      "It works for any subject. You bring the source. Foil brings the questions.",
    ],
  },
  {
    id: "not",
    title: "What Foil is not",
    paras: [
      "It is not a search engine. It will not look things up for you.",
      "It is not a homework machine. It will not write your essay or solve your problem set.",
      "It is not a chatbot that agrees with you. It pushes back.",
      "It is not an attention trap. There is no feed, no daily streak pressure, and no notifications begging you to return.",
      "It does not pretend to be your friend. It treats you as a capable thinker who wants to get sharper.",
    ],
  },
  {
    id: "open",
    title: "Open source and the public good",
    paras: [
      "Foil is released under the AGPL license. Anyone can read the code, run it, and build on it.",
      "A tool that trains thinking should be open about how it works. You can see exactly what the model is told and how your scores are computed.",
      "Building it as a public good means it is not designed to extract value from you. It is designed to give you a skill and then get out of the way.",
    ],
  },
  {
    id: "roadmap",
    title: "Where it is going",
    paras: [
      "The first version focuses on one learner, one source, and one clean loop. That foundation is live now.",
      "Planned directions include deeper progress tracking, more ways to bring in a source, and tools for teachers to use Foil with a class.",
      "The constraint will never change. Whatever we add, Foil will never start giving you the answer.",
    ],
  },
];

export default function Litepaper() {
  return (
    <div className="bg-paper text-ink">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-serif text-2xl tracking-tight">
          Foil
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-sm font-medium text-ink/55 hover:text-ink">
            Home
          </Link>
          <Link
            href="/think"
            className="rounded-full border border-ink/20 px-4 py-1.5 text-sm font-medium hover:bg-ink/5"
          >
            Start thinking
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24">
        {/* Title block */}
        <section className="py-12 sm:py-16">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-accent">
            Litepaper
          </p>
          <h1 className="font-serif text-4xl leading-[1.1] sm:text-5xl">
            Foil: the AI that won&rsquo;t give you the answer.
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink/70">
            A coach for the one skill that stays human as machines get better at
            everything. Here is what it is, how it works, and why it is built the
            way it is.
          </p>
          <p className="mt-5 text-sm text-ink/45">
            Version 1.0 · June 2026 · Open source under AGPL-3.0
          </p>
        </section>

        {/* Contents */}
        <nav className="rounded-2xl border border-ink/10 bg-card px-6 py-5">
          <p className="mb-3 text-[0.7rem] font-semibold uppercase tracking-widest text-ink/40">
            Contents
          </p>
          <ol className="grid gap-1.5 sm:grid-cols-2">
            {SECTIONS.map((s, i) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-[0.95rem] text-ink/70 hover:text-accent"
                >
                  <span className="tabular-nums text-ink/40">{i + 1}. </span>
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections */}
        <div className="mt-4">
          {SECTIONS.map((s, i) => (
            <section
              key={s.id}
              id={s.id}
              className="scroll-mt-20 border-t border-ink/10 py-10"
            >
              <h2 className="font-serif text-2xl leading-snug sm:text-3xl">
                <span className="tabular-nums text-ink/30">{i + 1}. </span>
                {s.title}
              </h2>
              <div className="mt-4 space-y-4">
                {s.paras.map((p, j) => (
                  <p key={j} className="text-[1.02rem] leading-relaxed text-ink/75">
                    {p}
                  </p>
                ))}
              </div>
              {s.dimensions && (
                <dl className="mt-6 space-y-4 border-l-2 border-accent/40 pl-5">
                  {s.dimensions.map((d) => (
                    <div key={d.term}>
                      <dt className="font-serif text-lg">{d.term}</dt>
                      <dd className="mt-0.5 text-[0.98rem] leading-relaxed text-ink/65">
                        {d.text}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </section>
          ))}
        </div>

        {/* Closing CTA */}
        <section className="mt-6 rounded-3xl bg-card p-8 sm:p-12">
          <h2 className="font-serif text-2xl leading-snug sm:text-3xl">Try it</h2>
          <p className="mt-4 max-w-2xl leading-relaxed text-ink/70">
            The fastest way to understand Foil is to use it. Bring one thing you
            have been trying to understand, and ask your first question about it.
          </p>
          <Link
            href="/think"
            className="mt-7 inline-block rounded-full bg-accent px-7 py-3 font-semibold text-paper"
          >
            Start an inquiry
          </Link>
        </section>
      </main>

      <footer className="mx-auto max-w-3xl px-6 py-10 text-sm text-ink/50">
        <p>Open source under AGPL-3.0. Built as a digital public good.</p>
      </footer>
    </div>
  );
}
