import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { GOOGLE_STATE_COOKIE, authUrl, cookieSecure, googleConfig } from "@/lib/google";

// Start «Mit Google anmelden». ?modus=verknuepfen verbindet stattdessen das
// eingeloggte Konto mit Google.
export async function GET(request: Request) {
  const c = googleConfig();
  if (!c.eingerichtet) return NextResponse.redirect(new URL("/login?google=nicht_eingerichtet", c.appUrl));

  const verknuepfen = new URL(request.url).searchParams.get("modus") === "verknuepfen";
  if (verknuepfen && !(await getCurrentUser())) return NextResponse.redirect(new URL("/login", c.appUrl));

  const state = crypto.randomBytes(24).toString("base64url");
  const res = NextResponse.redirect(authUrl(state));
  res.cookies.set(GOOGLE_STATE_COOKIE, `${state}.${verknuepfen ? "verknuepfen" : "login"}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: cookieSecure(),
    path: "/api/auth/google",
    maxAge: 600,
  });
  return res;
}
