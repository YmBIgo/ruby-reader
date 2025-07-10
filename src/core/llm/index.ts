import { AnthropicHandler } from "./anthropic";
import { GeminiHandler } from "./gemini";
import { OpenAIHandler } from "./openai";
import { PlamoHanlder } from "./plamo";

export type LLMName = "anthropic" | "openai" | "plamo" | "gemini"

export function buildLLMHanlder(llmName: LLMName, modelName: string, apiKey: string) {
    switch(llmName){
        case "anthropic":
            return new AnthropicHandler(modelName, apiKey);
        case "openai":
            return new OpenAIHandler(modelName, apiKey);
        case "plamo":
            return new PlamoHanlder(apiKey);
        case "gemini":
            return new GeminiHandler(modelName, apiKey);
        default:
            return null;
    }
}