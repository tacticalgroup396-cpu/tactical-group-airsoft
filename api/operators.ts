import type { VercelRequest, VercelResponse } from "@vercel/node";
import bcrypt from "bcryptjs";
import { sql } from "./db.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const rows = await sql`SELECT id, name, nickname, role, rank, games_count, function, active, created_at FROM operators WHERE active = true ORDER BY games_count DESC, nickname ASC`;
      return res.status(200).json(rows);
    }
    if (req.method === "POST") {
      const { name, nickname, password, rank = "recruta", function: operatorFunction = null } = req.body ?? {};
      if (!name || !nickname || !password) return res.status(400).json({ error: "Nome, apelido e senha são obrigatórios." });
      const countRows = await sql`SELECT count(*)::int AS count FROM operators`;
      const role = Number(countRows[0]?.count || 0) === 0 ? "commander" : "operator";
      const passwordHash = await bcrypt.hash(password, 12);
      const rows = await sql`INSERT INTO operators (name, nickname, password_hash, role, rank, function) VALUES (${name}, ${nickname}, ${passwordHash}, ${role}, ${rank}, ${operatorFunction}) RETURNING id, name, nickname, role, rank, games_count, function, active`;
      return res.status(201).json(rows[0]);
    }
    return res.status(405).json({ error: "Método não permitido." });
  } catch (error: any) {
    const duplicate = error?.code === "23505";
    return res.status(duplicate ? 409 : 500).json({ error: duplicate ? "Esse apelido já está cadastrado." : (error?.message ?? "Erro interno.") });
  }
}
