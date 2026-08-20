import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import { sql } from "./_db";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido." });
  const { prompt, operatorId = null } = req.body ?? {};
  if (!prompt) return res.status(400).json({ error: "prompt é obrigatório." });
  if (!process.env.GOOGLE_CLOUD_PROJECT) return res.status(503).json({ error: "Vertex AI não configurado." });

  try {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const credentialsPath = "/tmp/tactical-gcp.json";
      fs.writeFileSync(credentialsPath, process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;
    }
    const ai = new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION || "global",
    });
    const model = process.env.VERTEX_MODEL || "gemini-2.5-flash";
    const response = await ai.models.generateContent({
      model,
      contents: `Você é o assistente oficial do Tactical Group Airsoft. Responda em português, de forma objetiva e segura. Não incentive condutas perigosas. Pedido: ${prompt}`,
    });
    const text = response.text ?? "";
    await sql`INSERT INTO ai_logs (operator_id, prompt, response) VALUES (${operatorId}, ${prompt}, ${text})`;
    return res.status(200).json({ text });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message ?? "Falha no Vertex AI." });
  }
}
