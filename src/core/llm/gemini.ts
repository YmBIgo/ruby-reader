import { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { GoogleGenAI } from "@google/genai";

import { LLMModel } from "./model";
import { convertAnthropicMessageToGeminiMessage } from "./transformGemini";

const MAX_RETRY = 3;

export class GeminiHandler implements LLMModel {
  private modelName: string;
  private attemptCount: number;
  private client: GoogleGenAI;
  constructor(modelName: string, apiKey: string) {
    this.modelName = modelName;
    this.attemptCount = 0;
    this.client = new GoogleGenAI({ apiKey });
  }
  async createMessage(
    systemPrompt: string,
    messages: MessageParam[],
    isJSON: boolean
  ): Promise<string> {
    try {
      const response = await this.client.models.generateContent({
        model: this.modelName,
        contents: convertAnthropicMessageToGeminiMessage(messages),
        config: {
          maxOutputTokens: 8192,
          systemInstruction: systemPrompt,
        },
      });
      this.attemptCount = 0;
      const responseText = response.text;
      if (isJSON) {
        JSON.parse(
          responseText?.replace("```json", "").replace(/```/g, "") ?? "unknown"
        );
      }
      return responseText?.replace("```json", "").replace(/```/g, "") ?? "{}";
    } catch (e) {
      console.error(e);
      this.attemptCount += 1;
      if (this.attemptCount >= MAX_RETRY) {
        throw new Error("fail to get api gemini response");
      }
      return this.createMessage(systemPrompt, messages, isJSON);
    }
  }
  getModel(): string {
    return this.modelName;
  }
}
