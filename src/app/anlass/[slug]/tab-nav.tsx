"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { pfad: "aufgaben", label: "Aufgaben" },
  { pfad: "schichten", label: "Schichtplan" },
  { pfad: "infos", label: "Infos" },
];

export function TabNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-neutral-800">
      {TABS.map((tab) => {
        const href = `/anlass/${slug}/${tab.pfad}`;
        const aktiv = pathname.startsWith(href);
        return (
          <Link
            key={tab.pfad}
            href={href}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition ${
              aktiv
                ? "border-amber-400 text-amber-400"
                : "border-transparent text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
