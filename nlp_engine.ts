import { GoogleGenAI } from "@google/genai";

export async function calculatePenalty(team: string, newsText: string): Promise<number> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const prompt = `Analiza este texto sobre el equipo ${team}:\n\n"${newsText}"\n\nDevuelve únicamente un JSON válido con esta estructura: {"penalizacion_calculada": [número entre 0 y -0.08 dependiendo de la gravedad de las bajas]}`;
      
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        }
      });
      const data = JSON.parse(response.text || "{}");
      return data.penalizacion_calculada || 0;
    } catch (err) {
      console.warn("Gemini LLM falló, usando RegEx fallback.");
    }
  }

  // Fallback RegEx (Opción C del usuario)
  const text = newsText.toLowerCase();
  let penalty = 0;
  
  if (text.match(/lesión|lesionado|baja|sancionado|sanción|roto/g)) {
    penalty -= 0.03;
    if (text.match(/grave|meses|estrella|titular|capitán|clave/g)) {
      penalty -= 0.05; // -0.08 total
    }
  } else if (text.match(/duda|molestias|rotación/g)) {
    penalty -= 0.01;
  }
  
  return Math.max(-0.08, Math.min(0, penalty));
}
