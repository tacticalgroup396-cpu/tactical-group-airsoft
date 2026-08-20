import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./db.js";
import { currentUser } from "./_auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === "GET") {
      const rows = await sql`
        SELECT id, title, game_date, location, status, notes
        FROM games ORDER BY game_date DESC
      `;
      return res.status(200).json(rows);
    }
    if (req.method === "POST") {
      const user = await currentUser(req);
      if (!user || user.role !== "commander") return res.status(403).json({ error: "Apenas o comandante pode criar jogos." });
      const { title, gameDate, location, status = "confirmado", notes = null } = req.body ?? {};
      if (!title || !gameDate || !location) return res.status(400).json({ error: "title, gameDate e location são obrigatórios." });
      const rows = await sql`
        INSERT INTO games (title, game_date, location, status, notes)
        VALUES (${title}, ${gameDate}, ${location}, ${status}, ${notes})
        RETURNING id, title, game_date, location, status, notes
      `;
      return res.status(201).json(rows[0]);
    }
    return res.status(405).json({ error: "Método não permitido." });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message ?? "Erro interno." });
  }
}
