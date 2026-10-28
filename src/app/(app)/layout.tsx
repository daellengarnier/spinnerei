"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthContext";
import { api } from "@/lib/apiClient";
import { Avatar, Spinner, Modal, NameToast } from "@/components/Ui";
import { InstallInstructions } from "@/components/InstallInstructions";
import { PushPrompt } from "@/components/PushPrompt";
import { enablePush, refreshPushSilently, pushSupported } from "@/lib/pushClient";
import { Icon, type IconName } from "@/components/Icon";

const TABS: { href: string; label: string; icon: IconName; exact: boolean; badge?: boolean }[] = [
  { href: "/", label: "Anlässe", icon: "home", exact: true },
  { href: "/mine", label: "Meine Sachen", icon: "tasks", exact: false },
  { href: "/hq", label: "HQ", icon: "tent", exact: false },
];

// Home-Tab gilt auch innerhalb eines Anlasses/Ressorts als aktiv.
function tabAktiv(t: (typeof TABS)[number], pathname: string): boolean {
  return t.exact
    ? pathname === t.href || ["/anlass", "/ressort", "/todo"].some((p) => pathname.startsWith(p))
    : pathname.startsWith(t.href);
}

// Seiten, die auf dem Desktop die volle Breite nutzen (Raster, Timeline).
function seiteBreit(pathname: string): boolean {
  return pathname === "/" || ["/hq", "/anlass", "/ressort"].some((p) => pathname.startsWith(p));
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [pushMsg, setPushMsg] = useState("");
  const [pushBusy, setPushBusy] = useState(false);
  const [googleMeldung, setGoogleMeldung] = useState("");

  // Rückmeldung nach «Mit Google verknüpfen» (?google=…), danach Parameter entfernen.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("google");
    if (!code) return;
    setGoogleMeldung(
      {
        verknuepft: "Dein Konto ist jetzt mit Google verknüpft — ab sofort geht «Mit Google anmelden».",
        schon_vergeben: "Dieses Google-Konto ist schon mit einem anderen Profil verknüpft.",
        domain: "Nur @kulturspinnerei.ch-Konten können verknüpft werden.",
      }[code] ?? "Das Verknüpfen mit Google hat nicht geklappt. Bitte nochmals versuchen.",
    );
    params.delete("google");
    const rest = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : ""));
  }, []);
  const menuRef = useRef<HTMLDivElement>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshPushSilently();
  }, []);

  const enableNotifications = async () => {
    setPushBusy(true);
    setPushMsg("");
    const r = await enablePush();
    if (r.ok) {
      await fetch("/api/push/test", { method: "POST", credentials: "include" }).catch(() => undefined);
      setPushMsg("Aktiviert – du solltest gleich eine Test-Benachrichtigung sehen.");
    } else {
      setPushMsg(r.error ?? "Fehlgeschlagen.");
    }
    setPushBusy(false);
  };

  const onAvatarFile = async (f: File) => {
    setUploadingAvatar(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      const res = await fetch("/api/users/avatar", { method: "POST", body: fd, credentials: "include" });
      if (res.ok) window.location.reload();
    } finally {
      setUploadingAvatar(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  };

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/login");
    else if (user.mustChangePassword) router.replace("/passwort?forced=1");
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const poll = async () => {
      try {
        const { count } = await api.get<{ count: number }>("/activity/unread-count");
        if (active) setUnread(count);
      } catch {
        /* ignorieren */
      }
    };
    poll();
    const id = setInterval(poll, 20000);
    const onFocus = () => poll();
    const onPing = () => poll();
    window.addEventListener("focus", onFocus);
    window.addEventListener("spinnerei:refresh-inbox", onPing);
    return () => {
      active = false;
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("spinnerei:refresh-inbox", onPing);
    };
  }, [user]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  if (loading || !user || user.mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner label="Lade …" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col lg:max-w-6xl">
      <header className="pt-safe brand-header sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/pwa-192x192.png" alt="" className="h-9 w-9 shrink-0" />

            <span className="flex flex-col leading-none">
              <span className="brand-wordmark">Spinnerei</span>
              <span className="brand-sub">Orga</span>
            </span>
          </Link>
          {/* Desktop: Tabs in der Kopfzeile statt unten. */}
          <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                  tabAktiv(t, pathname) ? "bg-surface text-white" : "text-white/60 hover:bg-surface/60 hover:text-white"
                }`}
              >
                <Icon name={t.icon} size={18} />
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <Link href="/inbox" className="relative grid h-10 w-10 place-items-center rounded-full text-white/90 hover:bg-surface/60 active:scale-95" aria-label="Benachrichtigungen">
              <Icon name="bell" size={22} />
              {unread > 0 && (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-terra px-1 text-[10px] font-bold text-white ring-2 ring-accent">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
            <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen((o) => !o)} className="relative flex items-center gap-2 rounded-full ring-2 ring-line2 active:scale-95">
              <Avatar name={user.name} color={user.avatarColor} size={34} userId={user.id} showName={false} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 overflow-hidden  bg-surface py-1 shadow-lg ring-1 ring-line">
                <div className="border-b border-line px-4 py-2">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-xs text-dim">{user.email}</p>
                  {user.rolle === "admin" && <span className="chip mt-1 bg-accent/10 text-accent-dark">Admin</span>}
                </div>
                <button onClick={() => { setMenuOpen(false); router.push("/inbox"); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-surface2">
                  <Icon name="bell" size={17} className="text-dim" /> Inbox
                  {unread > 0 && (
                    <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-terra px-1 text-[10px] font-bold text-white">{unread > 99 ? "99+" : unread}</span>
                  )}
                </button>
                <button onClick={() => { setMenuOpen(false); avatarFileRef.current?.click(); }} disabled={uploadingAvatar} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-surface2">
                  <Icon name="user" size={17} className="text-dim" /> {uploadingAvatar ? "Lädt …" : "Profilbild ändern"}
                </button>
                <button onClick={() => { setMenuOpen(false); setInstallOpen(true); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-surface2">
                  <Icon name="download" size={17} className="text-dim" /> App installieren
                </button>
                {pushSupported() && (
                  <button onClick={enableNotifications} disabled={pushBusy} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-surface2">
                    <Icon name="bell" size={17} className="text-dim" /> {pushBusy ? "Aktiviere …" : "Benachrichtigungen aktivieren"}
                  </button>
                )}
                {pushMsg && <p className="px-4 pb-2 text-xs text-dim">{pushMsg}</p>}
                {user.rolle === "admin" && (
                  <button onClick={() => { setMenuOpen(false); router.push("/admin"); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-surface2">
                    <Icon name="gear" size={17} className="text-dim" /> Administration
                  </button>
                )}
                {user.googleVerknuepft ? (
                  <p className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-dim">
                    <Icon name="check" size={17} className="text-accent" /> Mit Google verknüpft
                  </p>
                ) : (
                  <a href="/api/auth/google?modus=verknuepfen" className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-surface2">
                    <Icon name="user" size={17} className="text-dim" /> Mit Google verknüpfen
                  </a>
                )}
                <button onClick={() => { setMenuOpen(false); router.push("/passwort"); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm hover:bg-surface2">
                  <Icon name="key" size={17} className="text-dim" /> Passwort ändern
                </button>
                <button onClick={async () => { await logout(); router.replace("/login"); }} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-terra-dark hover:bg-terra-light">
                  <Icon name="logout" size={17} /> Abmelden
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-4 pb-24 lg:px-8 lg:py-6 lg:pb-12">
        {googleMeldung && (
          <button
            onClick={() => setGoogleMeldung("")}
            className="mb-3 block w-full border border-accent/40 bg-accent/10 px-3 py-2 text-left text-sm text-accent"
          >
            {googleMeldung} <span className="text-dim">(schliessen)</span>
          </button>
        )}
        <PushPrompt />
        {/* Listen- und Formularseiten bleiben auf dem Desktop lesbar schmal. */}
        <div className={seiteBreit(pathname) ? "" : "lg:mx-auto lg:max-w-3xl"}>{children}</div>
      </main>

      <nav className="pb-safe tabbar fixed inset-x-0 bottom-0 z-30 mx-auto max-w-2xl lg:hidden">
        <div className="grid grid-cols-3 px-2 pt-1">
          {TABS.map((t) => {
            const isActive = tabAktiv(t, pathname);
            return (
              <Link key={t.href} href={t.href} className={`relative flex flex-col items-center gap-0.5 py-1 text-[10px] font-extrabold ${isActive ? "text-white" : "text-white/60"}`}>
                <span className={`relative grid h-7 w-[58px] place-items-center rounded-full transition-colors ${isActive ? "bg-surface text-white" : "text-white/70"}`}>
                  <Icon name={t.icon} size={21} />
                  {t.badge && unread > 0 && (
                    <span className="absolute right-2 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-terra px-1 text-[10px] font-bold text-white ring-2 ring-[#2d4a2c]">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </span>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <input
        ref={avatarFileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && onAvatarFile(e.target.files[0])}
      />
      {installOpen && (
        <Modal open onClose={() => setInstallOpen(false)} title="App installieren" footer={<button className="btn-primary w-full" onClick={() => setInstallOpen(false)}>Alles klar</button>}>
          <InstallInstructions />
        </Modal>
      )}
      <NameToast />
    </div>
  );
}
