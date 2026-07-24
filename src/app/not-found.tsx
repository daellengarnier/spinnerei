import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-4xl font-bold">Nicht gefunden</h1>
      <p className="text-neutral-400">Diesen Anlass oder diese Seite gibt es nicht.</p>
      <Link href="/" className="text-amber-400 hover:underline">
        ← Zur Übersicht
      </Link>
    </main>
  );
}
