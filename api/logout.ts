import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./db.js";
import { hashToken, parseCookies } from "./_auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const token = parseCookies(req.headers?.cookie || {})["tg_session"];
  if (token) await sql`DELETE FROM sessions WHERE token_hash = ${hashToken(token)}`;
  res.setHeader("Set-Cookie", "tg_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  return res.status(200).json({ ok: true });
}
