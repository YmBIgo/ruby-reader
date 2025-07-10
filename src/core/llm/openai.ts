import { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import OpenAI from "openai";

import { LLMModel } from "./model";
import { covertAnthropicMessageToOpenAiMessage } from "./transform";

const MAX_RETRY = 3;

export class OpenAIHandler implements LLMModel {
  private modelName: string;
  private attemptCount: number;
  private client: OpenAI;
  constructor(modelName: string, apiKey: string) {
    this.modelName = modelName;
    this.attemptCount = 0;
    this.client = new OpenAI({ apiKey });
  }
  async createMessage(
    systemPrompt: string,
    messages: MessageParam[],
    isJSON: boolean
  ): Promise<string> {
    const openAIMessages = covertAnthropicMessageToOpenAiMessage(
      systemPrompt,
      messages
    );
    try {
      const response = await this.client.chat.completions.create({
        messages: openAIMessages,
        model: this.modelName,
        max_completion_tokens: 8192,
      });
      this.attemptCount = 0;
      if (isJSON) {
        JSON.parse(
          response.choices[0].message.content
            ?.replace("```json", "")
            .replace(/```/g, "") ?? "unknown"
        );
      }
      return (
        response.choices[0].message.content
          ?.replace("```json", "")
          .replace(/```/g, "") ?? "{}"
      );
    } catch (e) {
      console.error(e);
      this.attemptCount += 1;
      if (this.attemptCount >= MAX_RETRY) {
        throw new Error("fail to get api openai response");
      }
      return this.createMessage(systemPrompt, messages, isJSON);
    }
  }
  getModel(): string {
    return this.modelName;
  }
}
