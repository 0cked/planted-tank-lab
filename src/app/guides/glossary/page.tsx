import type { Metadata } from "next";
import Link from "next/link";

import {
  glossaryLetter,
  glossaryLetterId,
  glossaryTermId,
  GLOSSARY_ALPHABET,
  PLANTED_TANK_GLOSSARY,
} from "@/lib/guides/glossary";

const GUIDE_TITLE = "Planted Aquarium Glossary | PlantedTankLab";
const GUIDE_DESCRIPTION =
  "A practical glossary of common planted tank terms, from PAR and KH to EI dosing, rhizomes, algae types, and layout language.";

export const metadata: Metadata = {
  title: GUIDE_TITLE,
  description: GUIDE_DESCRIPTION,
  openGraph: {
    title: GUIDE_TITLE,
    description: GUIDE_DESCRIPTION,
    url: "/guides/glossary",
  },
};

const LETTER_GROUPS = (() => {
  const sorted = [...PLANTED_TANK_GLOSSARY].sort((left, right) =>
    left.term.localeCompare(right.term, "en", { sensitivity: "base" }),
  );

  const grouped = new Map<string, typeof sorted>();
  for (const term of sorted) {
    const letter = glossaryLetter(term.term);
    const existing = grouped.get(letter);
    if (existing) {
      existing.push(term);
      continue;
    }
    grouped.set(letter, [term]);
  }

  return GLOSSARY_ALPHABET.map((letter) => ({
    letter,
    terms: grouped.get(letter) ?? [],
  })).filter((entry) => entry.terms.length > 0);
})();

const LETTER_SET = new Set(LETTER_GROUPS.map((entry) => entry.letter));

export default function GlossaryGuidePage() {
  return (
    <main className="mx-auto max-w-6xl space-y-6 px-6 py-14">
      <section className="ptl-surface p-7 sm:p-9">
        <p className="ptl-kicker">Guides</p>
        <h1 className="mt-3 ptl-page-title">Planted tank glossary</h1>
        <p className="mt-4 max-w-[82ch] ptl-lede text-neutral-700">
          Quick-reference definitions for common aquascaping vocabulary, chemistry shorthand, and
          maintenance terms. Use this while planning in the{" "}
          <Link href="/builder" className="font-semibold text-emerald-800 hover:underline">
            visual builder
          </Link>{" "}
          and while running calculations in{" "}
          <Link href="/tools" className="font-semibold text-emerald-800 hover:underline">
            tools
          </Link>
          .
        </p>

        <nav aria-label="Glossary letters" className="mt-6 flex flex-wrap gap-1.5">
          {GLOSSARY_ALPHABET.map((letter) =>
            LETTER_SET.has(letter) ? (
              <a
                key={letter}
                href={`#${glossaryLetterId(letter)}`}
                className="rounded-md border bg-white px-2.5 py-1 text-xs font-semibold text-neutral-800 transition hover:border-neutral-300"
                style={{ borderColor: "var(--ptl-border)" }}
              >
                {letter}
              </a>
            ) : (
              <span
                key={letter}
                className="rounded-md border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-semibold text-neutral-400"
              >
                {letter}
              </span>
            ),
          )}
        </nav>
      </section>

      {LETTER_GROUPS.map((entry) => (
        <section
          key={entry.letter}
          id={glossaryLetterId(entry.letter)}
          className="ptl-surface p-6 sm:p-7"
        >
          <h2 className="text-2xl font-semibold tracking-tight text-neutral-950">{entry.letter}</h2>
          <div className="mt-4 grid gap-3">
            {entry.terms.map((term) => (
              <article
                key={term.term}
                id={glossaryTermId(term.term)}
                className="rounded-xl border bg-white/75 p-4"
                style={{ borderColor: "var(--ptl-border)" }}
              >
                <h3 className="text-base font-semibold text-neutral-900">{term.term}</h3>
                <p className="mt-2 text-sm text-neutral-700">{term.definition}</p>
                {term.links && term.links.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {term.links.map((link) => (
                      <Link
                        key={`${term.term}-${link.href}`}
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
