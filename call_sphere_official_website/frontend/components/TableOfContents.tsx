import type { Heading } from "@/lib/blog-utils";

export function TableOfContents({ headings }: { headings: Heading[] }) {
  if (headings.length < 3) return null;

  return (
    <nav
      aria-label="Table of contents"
      className="hidden lg:block sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        On this page
      </p>
      <ul className="mt-3 space-y-2 border-l border-slate-200">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              className={`block border-l-2 border-transparent text-sm text-slate-600 transition-colors hover:border-indigo-500 hover:text-indigo-600 ${
                h.level === 3 ? "pl-6" : "pl-4"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
