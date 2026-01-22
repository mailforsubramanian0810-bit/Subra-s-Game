
import { GoogleGenAI, Type } from "@google/genai";
import { GameState, MoveSuggestion } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const getMoveSuggestion = async (gameState: GameState): Promise<MoveSuggestion | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
        Analyze this Carrom board state and suggest the best move for the current player (${gameState.turn}).
        Board size is 740x740. Center is (370, 370).
        Coins remaining: ${gameState.coins.filter(c => !c.inPocket).length}.
        Current Turn: ${gameState.turn}.
        
        Suggest:
        1. Angle (0-360 degrees) where 270 is straight ahead.
        2. Power (1-100).
        3. A brief tactical explanation.
        
        Return in JSON format.
      `,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            angle: { type: Type.NUMBER },
            power: { type: Type.NUMBER },
            explanation: { type: Type.STRING }
          },
          required: ["angle", "power", "explanation"]
        }
      }
    });

    const text = response.text;
    if (text) {
      return JSON.parse(text) as MoveSuggestion;
    }
  } catch (error) {
    console.error("Error getting move suggestion:", error);
  }
  return null;
};

export const generateBoardTheme = async (prompt: string): Promise<string | null> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
  } catch (error) {
    console.error("Error generating theme:", error);
  }
  return null;
};
