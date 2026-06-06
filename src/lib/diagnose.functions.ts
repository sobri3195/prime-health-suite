import { createServerFn } from "@tanstack/react-start";

export type DiagnoseInput = {
  keluhan: string;
  gejala: string[];
  durasi: string;
  nyeri: number;
  usia?: number | null;
  riwayat?: string;
};

export type DiagnoseResult = {
  risk: "Rendah" | "Sedang" | "Tinggi";
  urgency: string;
  summary: string;
  possible_conditions: { name: string; likelihood: "rendah" | "sedang" | "tinggi"; reason: string }[];
  red_flags: string[];
  recommendations: string[];
  next_steps: string[];
  disclaimer: string;
};

const SYSTEM_PROMPT = `Anda adalah Prime AI Mata, asisten skrining oftalmologi berbahasa Indonesia.
Tujuan: bantu pasien memahami kemungkinan kondisi mata, tingkat urgensi, dan langkah perawatan awal.
Aturan:
- Bukan pengganti diagnosis dokter; sebut hal ini dengan jelas.
- Jika ada red flag (penurunan penglihatan mendadak, nyeri hebat, trauma, kilatan cahaya, floaters baru banyak, pasca operasi), tandai Risiko "Tinggi" dan rekomendasikan IGD/dokter mata segera.
- Gunakan bahasa Indonesia yang sederhana, ramah, dan empatik.
- Selalu balas memanggil tool "diagnose_eye" dengan struktur yang diminta.`;

export const diagnoseEye = createServerFn({ method: "POST" })
  .inputValidator((d: DiagnoseInput) => d)
  .handler(async ({ data }): Promise<DiagnoseResult> => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY tidak tersedia");

    const userMsg = [
      `Keluhan utama: ${data.keluhan || "-"}`,
      `Gejala terpilih: ${data.gejala.join(", ") || "-"}`,
      `Durasi: ${data.durasi || "-"}`,
      `Tingkat nyeri (0-10): ${data.nyeri}`,
      data.usia ? `Usia: ${data.usia}` : "",
      data.riwayat ? `Riwayat / catatan: ${data.riwayat}` : "",
    ].filter(Boolean).join("\n");

    const body = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg },
      ],
      tools: [{
        type: "function",
        function: {
          name: "diagnose_eye",
          description: "Berikan hasil skrining mata terstruktur",
          parameters: {
            type: "object",
            properties: {
              risk: { type: "string", enum: ["Rendah", "Sedang", "Tinggi"] },
              urgency: { type: "string" },
              summary: { type: "string" },
              possible_conditions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    likelihood: { type: "string", enum: ["rendah", "sedang", "tinggi"] },
                    reason: { type: "string" },
                  },
                  required: ["name", "likelihood", "reason"],
                  additionalProperties: false,
                },
              },
              red_flags: { type: "array", items: { type: "string" } },
              recommendations: { type: "array", items: { type: "string" } },
              next_steps: { type: "array", items: { type: "string" } },
              disclaimer: { type: "string" },
            },
            required: ["risk", "urgency", "summary", "possible_conditions", "red_flags", "recommendations", "next_steps", "disclaimer"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "diagnose_eye" } },
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (resp.status === 429) throw new Error("Terlalu banyak permintaan. Coba lagi sebentar.");
    if (resp.status === 402) throw new Error("Kredit AI workspace habis. Tambah kredit di Settings.");
    if (!resp.ok) {
      const t = await resp.text();
      console.error("AI gateway error", resp.status, t);
      throw new Error("Gagal memanggil AI engine");
    }

    const json = await resp.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("AI tidak mengembalikan hasil terstruktur");
    const args = JSON.parse(toolCall.function.arguments);
    return args as DiagnoseResult;
  });
