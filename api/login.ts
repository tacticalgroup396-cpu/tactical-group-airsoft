import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { sql } from "./db.js";
import { hashToken, newToken, sessionCookie } from "./_auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  try {
    const { nickname, password } = req.body ?? {};
    const rows = await sql`SELECT * FROM operators WHERE nickname = ${nickname} AND active = true LIMIT 1`;
    if (!rows[0] || !(await bcrypt.compare(password ?? "", rows[0].password_hash))) {
      return res.status(401).json({ error: "Apelido ou senha inválidos." });
    }
    const token = newToken();
    await sql`INSERT INTO sessions (token_hash, operator_id, expires_at) VALUES (${hashToken(token)}, ${rows[0].id}, now() + interval '7 days')`;
    const { password_hash: _, ...safeUser } = rows[0] as any;
    res.setHeader("Set-Cookie", sessionCookie(token));
    return res.status(200).json({ user: safeUser });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message ?? "Erro interno." });
  }
}
