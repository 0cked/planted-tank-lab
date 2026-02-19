import type { Metadata } from "next";
import Link from "next/link";

import { GLOSSARY_LETTERS, GLOSSARY_TERMS } from "@/lib/guides/glossary";

const GUIDE_TITLE = "Planted Tank Glossary";
const GUIDE_DESCRIPTION =
  "Definitions for core planted aquarium terms, from PAR and EI dosing to algae types, plant propagation, and water chemistry basics.";

export const metadata: Metadata = {
  title: GUIDE_TITLE,
  description: GUIDE_DESCRIPTION,
  openGraph: {
    title: GUIDE_TITLE,
    description: GUIDE_DESCRIPTION,
    url: "/guides/glossary",
  },
};

type GroupedTerms = Record<string, typeof GLOSSARY_TERMS>;

function groupTermsByLetter(): GroupedTerms {
  const groups: GroupedTerms = {};

  for (const letter of GLOSSARY_LETTERS) {
    groups[letter] = GLOSSARY_TERMS.filter((term) => term.letter === letter);
  }

  return groups;
}

export default function GlossaryGuidePage() {
  const groupedTerms = groupTermsByLetter();

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-14">
      <section className="ptl-surface p-7 sm:p-9">
        <p className="ptl-kicker">Guides</p>
        <h1 className="mt-3 ptl-page-title">Planted tank glossary</h1>
        <p className="mt-4 max-w-[80ch] ptl-lede text-neutral-700">
          Quick definitions for common planted aquarium language, with direct links to tools and
          guides where each concept is used in practice.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {GLOSSARY_LETTERS.map((letter) => (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="rounded-lg border bg-white/75 px-2.5 py-1 text-xs font-semibold text-neutral-800 transition hover:border-neutral-300 hover:bg-white"
              style={{ borderColor: "var(--ptl-border)" }}
            >
              {letter}
            </a>
          ))}
        </div>

        <p className="mt-4 text-sm text-neutral-700">
          {GLOSSARY_TERMS.length} terms total. Need layout context too? Start with the{" "}
          <Link href="/guides/plant-placement" className="font-semibold text-emerald-800 hover:underline">
            plant placement guide
          </Link>{" "}
          and then use this glossary while tuning your setup.
        </p>
      </section>

      {GLOSSARY_LETTERS.map((letter) => (
        <section key={letter} id={`letter-${letter}`} className="ptl-surface p-6 sm:p-7">
          <h2 className="text-lg font-semibold tracking-wide text-neutral-900">{letter}</h2>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            {groupedTerms[letter].map((term) => (
              <article
                key={term.id}
                id={term.id}
                className="rounded-2xl border bg-white/75 p-4"
                style={{ borderColor: "var(--ptl-border)" }}
              >
                <h3 className="text-sm font-semibold text-neutral-900">{term.term}</h3>
                <p className="mt-2 text-sm text-neutral-700">{term.definition}</p>

                {term.links.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {term.links.map((link) => (
                      <Link
                        key={`${term.id}-${link.href}`}
                        href={link.href}
                        className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 transition hover:border-neutral-300"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
