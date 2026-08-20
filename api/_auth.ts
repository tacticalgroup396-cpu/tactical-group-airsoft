import crypto from "node:crypto";
import { sql } from "./db.js";

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function parseCookies(value = "") {
  return Object.fromEntries(value.split(";").map(v => v.trim()).filter(Boolean).map(v => {
    const i = v.indexOf("=");
    return i < 0 ? [v, ""] : [v.slice(0, i), decodeURIComponent(v.slice(i + 1))];
  }));
}

export async function currentUser(req: any) {
  const token = parseCookies(req.headers?.cookie || "")["tg_session"];
  if (!token) return null;
  const rows = await sql`
    SELECT o.id, o.name, o.nickname, o.role, o.rank, o.games_count, o.function, o.active
    FROM sessions s JOIN operators o ON o.id = s.operator_id
    WHERE s.token_hash = ${hashToken(token)} AND s.expires_at > now() AND o.active = true
    LIMIT 1
  `;
  return rows[0] || null;
}

export function newToken() { return crypto.randomBytes(32).toString("hex"); }

export function sessionCookie(token: string, maxAge = 60 * 60 * 24 * 7) {
  return `tg_session=${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
