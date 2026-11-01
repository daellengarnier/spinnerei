import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { GOOGLE_STATE_COOKIE, authUrl, cookieSecure, driveAuthUrl, googleConfig } from "@/lib/google";
import { DRIVE_SCOPE } from "@/lib/googleDrive";

// Start «Mit Google anmelden». ?modus=verknuepfen verbindet stattdessen das
// eingeloggte Konto mit Google, ?modus=drive (nur Admin) verbindet Google Drive
// für die Beleg-Ablage.
export async function GET(request: Request) {
  const c = googleConfig();
  if (!c.eingerichtet) return NextResponse.redirect(new URL("/login?google=nicht_eingerichtet", c.appUrl));

  const angefragt = new URL(request.url).searchParams.get("modus");
  const modus = angefragt === "verknuepfen" || angefragt === "drive" ? angefragt : "login";
  const ich = modus === "login" ? null : await getCurrentUser();
  if (modus !== "login" && !ich) return NextResponse.redirect(new URL("/login", c.appUrl));
  if (modus === "drive" && ich?.rolle !== "admin") return NextResponse.redirect(new URL("/", c.appUrl));

  const state = crypto.randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(modus === "drive" ? driveAuthUrl(state, DRIVE_SCOPE) : authUrl(state));
  res.cookies.set(GOOGLE_STATE_COOKIE, `${state}.${modus}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}
