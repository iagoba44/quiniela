import { GoogleGenAI, Type } from "@google/genai";
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
  const response = await ai.models.generateContent({
    model: "gemini-3.6-flash",
    contents: "Busca los jugadores lesionados o sancionados actualmente del Real Madrid. Devuelve un JSON con la lista de jugadores.",
    config: {
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            jugador: { type: Type.STRING },
            estado: { type: Type.STRING, description: "lesionado, sancionado o duda" },
            penalizacion_calculada: { type: Type.NUMBER, description: "Penalización a la probabilidad del equipo entre -0.08 y -0.01" }
          }
        }
      }
    }
  });
  console.log(response.text);
}
run();
