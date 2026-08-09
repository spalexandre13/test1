// Abstraction Groq / Ollama. Renvoie du texte brut ; le parsing est a l'appelant.
import Groq from "groq-sdk";

export type EntreeChat = {
  system: string;
  user: string;
  jsonMode?: boolean;
  temperature?: number;
};

export function fournisseurActuel(): "groq" | "ollama" {
  return (process.env.AI_PROVIDER ?? "groq").toLowerCase() === "ollama" ? "ollama" : "groq";
}

async function chatGroq(e: EntreeChat): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY manquante dans .env");
  const client = new Groq({ apiKey, baseURL: process.env.GROQ_BASE_URL });
  const res = await client.chat.completions.create({
    model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
    temperature: e.temperature ?? 0.4,
    response_format: e.jsonMode ? { type: "json_object" } : undefined,
    messages: [
      { role: "system", content: e.system },
      { role: "user", content: e.user }
    ]
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}

async function chatOllama(e: EntreeChat): Promise<string> {
  const url = (process.env.OLLAMA_URL ?? "http://localhost:11434").replace(/\/$/, "");
  const res = await fetch(`${url}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL ?? "llama3.1:8b",
      stream: false,
      format: e.jsonMode ? "json" : undefined,
      options: { temperature: e.temperature ?? 0.4 },
      messages: [
        { role: "system", content: e.system },
        { role: "user", content: e.user }
      ]
    })
  });
  if (!res.ok) throw new Error(`Ollama ${res.status} : ${await res.text()}`);
  const data = (await res.json()) as { message?: { content?: string } };
  return data.message?.content?.trim() ?? "";
}

export async function chat(e: EntreeChat): Promise<string> {
  return fournisseurActuel() === "ollama" ? chatOllama(e) : chatGroq(e);
}
