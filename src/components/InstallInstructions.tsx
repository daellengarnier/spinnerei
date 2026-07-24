import { Icon } from "@/components/Icon";

// Kurzanleitung: App auf den Homebildschirm legen (iOS & Android).
export function InstallInstructions() {
  return (
    <div className="space-y-4 text-sm text-dim">
      <p>So hast du die Spinnerei-Orga wie eine App auf dem Handy – mit einem Tipp offen, ohne Browser-Leiste:</p>
      <div className=" border border-line bg-surface2 p-3">
        <p className="mb-1 flex items-center gap-2 font-semibold text-ink">
          <Icon name="external" size={16} className="text-accent" /> iPhone (Safari)
        </p>
        <ol className="list-decimal space-y-0.5 pl-5">
          <li>Unten auf das <b>Teilen</b>-Symbol tippen (Viereck mit Pfeil nach oben).</li>
          <li>Etwas runterscrollen → <b>„Zum Home-Bildschirm“</b>.</li>
          <li><b>„Hinzufügen“</b> tippen – fertig.</li>
        </ol>
      </div>
      <div className=" border border-line bg-surface2 p-3">
        <p className="mb-1 flex items-center gap-2 font-semibold text-ink">
          <Icon name="external" size={16} className="text-accent" /> Android (Chrome)
        </p>
        <ol className="list-decimal space-y-0.5 pl-5">
          <li>Oben rechts auf das <b>Menü</b> (drei Punkte) tippen.</li>
          <li><b>„Zum Startbildschirm hinzufügen“</b> wählen.</li>
          <li><b>„Hinzufügen“</b> bestätigen.</li>
        </ol>
      </div>
    </div>
  );
}
