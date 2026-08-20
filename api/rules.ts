import type { VercelRequest, VercelResponse } from "@vercel/node";
import { sql } from "./_db";

export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    const rows = await sql`SELECT id, title, description, sort_order FROM rules ORDER BY sort_order ASC`;
    return res.status(200).json(rows);
  } catch (error: any) {
    return res.status(500).json({ error: error?.message ?? "Erro interno." });
  }
}
