import Anthropic from "@anthropic-ai/sdk";
import { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import OpenAI from "openai";

export function covertAnthropicMessageToOpenAiMessage(systemPrompt: string, history: MessageParam[]) {
  const openaiHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [{
    role: "developer",
    content: systemPrompt
  }];
  history.forEach((ah) => {
    if (ah.role === "assistant") {
      openaiHistory.push({
        role: "assistant",
        content: covertAnthropicContentToOpenAIContent(ah.content),
      });
      return;
    } else if (ah.role === "user") {
      openaiHistory.push({
        role: "user",
        content: covertAnthropicContentToOpenAIContent(ah.content),
      });
      return;
    } else {
      openaiHistory.push({
        role: "user",
        content: covertAnthropicContentToOpenAIContent(ah.content),
      });
      return;
    }
  });
  return openaiHistory;
}

function covertAnthropicContentToOpenAIContent(
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
