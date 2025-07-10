import { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { LLMModel } from "./model";

const MAX_RETRY = 5; // PLaMoは調子が悪い

export class PlamoHanlder implements LLMModel {
  private modelName: string = "PLaMo";
  private attemptCount: number;
  private apiKey: string;
  constructor(apiKey: string) {
    this.attemptCount = 0;
    this.apiKey = apiKey;
  }
  async createMessage(
    systemPrompt: string,
    messages: MessageParam[],
    isJSON: boolean
  ): Promise<string> {
    const tranformedMessages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    ];
    try {
      const response = await fetch(
        "https://platform.preferredai.jp/api/completion/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            messages: tranformedMessages,
            model: "plamo-2.0-prime",
          }),
        }
      );
      const result = (await response.json()) as any;
      if (isJSON) {
        JSON.parse(
          result.choices[0].message.content
            .replace("```json", "")
            .replace(/```/g, "")
        );
      }
      return (
        result.choices[0].message.content
          .replace("```json", "")
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
