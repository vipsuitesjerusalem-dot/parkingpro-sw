
import { GoogleGenAI } from "@google/genai";

/**
 * Generates a helpful parking management insight using Gemini 3 Flash.
 * Analyzes occupancy trends and gives a short professional tip.
 * Implementation follows senior engineer guidelines: fresh instance per call and exponential backoff for robustness.
 */
export const getParkingInsight = async (totalSlots: number, occupiedCount: number, bookings: any[]) => {
  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    try {
      // Create a fresh instance right before making an API call to ensure up-to-date config
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a parking logistics assistant for an apartment complex. 
        Analyze the current status:
        - Total slots available: ${totalSlots}
        - Slots currently reserved: ${occupiedCount}
        - Total booking history entries: ${bookings.length}
        
        Provide a brief (max 2 sentences) professional and encouraging insight for the property manager.`,
      });

      // response.text is a getter property, not a method
      return response.text?.trim() || "Operations are running smoothly today.";
    } catch (error: any) {
      console.error("Gemini Insight Error:", error);
      
      // If the error indicates a fatal configuration issue, return a default message
      if (error?.message?.includes("Requested entity was not found")) {
        return "Insight currently unavailable. Check system configuration.";
      }

      retries--;
      if (retries === 0) return "Operations are running smoothly today.";
      
      // Graceful retry logic with exponential backoff to handle transient API issues
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  
  return "Operations are running smoothly today.";
};
