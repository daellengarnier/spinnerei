// Petzi-Event-ID aus dem Petzilink ziehen (z. B. …petzi.ch/events/64217/ → 64217).
export function petziEventIdAusLink(link: string): number | null {
  const m = link.match(/(\d{3,})/);
  return m ? Number(m[1]) : null;
}
