import Anthropic from "@anthropic-ai/sdk";
import { LLMModel } from "./model";

const MAX_RETRY = 3;

export class AnthropicHandler implements LLMModel {
  private modelName: string;
  private attemptCount: number;
  private client: Anthropic;
  constructor(modelName: string, apiKey: string) {
    this.modelName = modelName;
    this.attemptCount = 0;
    this.client = new Anthropic({ apiKey });
  }
  async createMessage(
    systemPrompt: string,
    history: Anthropic.Messages.MessageParam[],
    isJSON: boolean
  ): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.modelName,
        system: systemPrompt,
        max_tokens: 8192,
        messages: history,
      });
      const type = response.content[0].type;
      if (type === "text") {
        if (isJSON) {
          JSON.parse(
            response.content[0].text.replace("```json", "").replace(/```/g, "")
          );
        }
        return response.content[0].text
          .replace("```json", "")
          .replace(/```/g, "");
      } else if (type === "web_search_tool_result") {
        return Array.isArray(response.content[0].content)
          ? response.content[0].content[0].encrypted_content
          : `{"error": "web search error occurs..."}`;
      } else {
        return "{}";
      }
    } catch (e) {
      console.error(e);
      if (this.attemptCount >= MAX_RETRY) {
        throw new Error("fail to get api anthropic response");
      }
      return this.createMessage(systemPrompt, history, isJSON);
    }
  }
  getModel() {
    return this.modelName;
  }
}
