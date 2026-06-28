import { GoogleGenAI } from '@google/genai';

// Initialize the client. 
// It automatically looks for the process.env.GEMINI_API_KEY environment variable.
const ai = new GoogleGenAI();

export async function generateText(userPrompt) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: userPrompt,
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("Failed to communicate with AI model.");
  }
}