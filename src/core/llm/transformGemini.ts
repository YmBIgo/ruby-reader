import Anthropic from "@anthropic-ai/sdk";
import { Content } from "@google/genai";

export function convertAnthropicMessageToGeminiMessage(history: Anthropic.MessageParam[]): Content[] {
    const geminiHistory: Content[] = [];
    history.forEach((h) => {
        if (h.role === "assistant") {
            geminiHistory.push({role: "model", parts: [{text: covertAnthropicContentToGeminiContent(h.content)}]});
        } else if (h.role === "user") {
            geminiHistory.push({role: "user", parts: [{text: covertAnthropicContentToGeminiContent(h.content)}]});
        }
    });
    return geminiHistory;
}

function covertAnthropicContentToGeminiContent(
  content: string | Anthropic.Messages.ContentBlockParam[]
): string {
  if (typeof content === "string") {
    return content;
  } else {
    return content
      .map((c) => {
        if (c.type === "text") {
          return c.text;
        } else if (c.type === "document") {
          return c.title;
        } else if (c.type === "web_search_tool_result") {
          return c.content;
        } else {
          return "not supported type...";
        }
      })
      .join("");
  }
}
