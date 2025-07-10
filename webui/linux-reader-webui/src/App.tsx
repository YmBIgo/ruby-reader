import { useEvent } from "react-use";
import { useState } from "react";

import type { Message } from "./type/Message"
import ChatView from "./pages/ChatView";
import SettingView from "./pages/SettingView";
import type OpenAI from "openai";
import type Anthropic from "@anthropic-ai/sdk";

function App() {

  const [messages, setMessages] = useState<Message[]>([
    {
      type: "say",
      content: "「検索したいファイルパス」と「検索する関数の１行」と「目的」を入力してください",
      time: Date.now()
    },
    {
      type: "say",
      content: "「検索したいファイルパス」を入力してください",
      time: Date.now() + 100
    }
  ]);
  const [isSettingPage, setIsSettingPage] = useState(false);

  const [initClangdPath, setInitClangPath] = useState<string>("");
  const [initLinuxPath, setInitLinuxPath] = useState<string>("");
  const [initCompileCommandPath, setInitCompileCommandPath] = useState<string>("");
  const [initReportPath, setInitReportPath] = useState<string>("");
  const [initLlmName, setInitLlmName] = useState<"openai" | "anthropic" | "plamo" | "">("");
  const [initOpenAIApiKey, setInitOpenAIApiKey] = useState<string>("");
  const [initAnthropicApiKey, setInitAnthropicApiKey] = useState<string>("");
  const [initPlamoApiKey, setInitPlamoApiKey] = useState<string>("");
  const [initGeminiApiKey, setInitGeminiApiKey] = useState<string>("");
  const [initOpenAIModelName, setInitOpenAIModelName] = useState<OpenAI.ChatModel | "">("");
  const [initAnthropicModelName, setInitAnthropicModelName] = useState<Anthropic.Model | "">("");
  const [initGeminiModelName, setInitGeminiModelName] = useState<string>("");

  useEvent("message", (event: MessageEvent) => {
    const originalMessage = typeof event.data === "string"
      ? event.data : event.data.toString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedMessage: any;
    try {
      if (typeof originalMessage === "string") {
        parsedMessage = JSON.parse(originalMessage);
      } else if (typeof originalMessage === "object") {
        parsedMessage = originalMessage;
      } else {
        parsedMessage = JSON.parse(originalMessage);
      }
    } catch (e) {
      console.error(e);
      parsedMessage = {};
    }
    const type = parsedMessage?.type;
    switch (type) {
      case "ask":
      case "say":
        break;
      case "state":
        setMessages(parsedMessage.state);
        break;
      case "init":
        setInitClangPath(parsedMessage.clangd);
        setInitLinuxPath(parsedMessage.linuxPath);
        setInitCompileCommandPath(parsedMessage.compileCommand);
        setInitReportPath(parsedMessage.report);
        setInitLlmName(parsedMessage.llmName);
        setInitOpenAIApiKey(parsedMessage.openaiApi);
        setInitOpenAIModelName(parsedMessage.openaiModel);
        setInitAnthropicApiKey(parsedMessage.anthropicApi);
        setInitAnthropicModelName(parsedMessage.anthropicModel);
        setInitPlamoApiKey(parsedMessage.plamoApi);
        setInitGeminiApiKey(parsedMessage.geminiApi);
        setInitGeminiModelName(parsedMessage.geminiModel);
        if (!parsedMessage.clangd || !parsedMessage.linuxPath || !parsedMessage.compileCommand) {
          setIsSettingPage(true);
        }
        if (parsedMessage.llmName === "openai" && (!parsedMessage.openaiApi || !parsedMessage.openaiModel)) {
          setIsSettingPage(true);
        }
        if (parsedMessage.llmName === "anthropic" && (!parsedMessage.anthropicApi || !parsedMessage.anthropicModel)) {
          setIsSettingPage(true);
        }
        if (parsedMessage.llmName === "plamo" && !parsedMessage.plamoApi) {
          setIsSettingPage(true);
        }
        if (parsedMessage.llmName === "gemini" && (!parsedMessage.geminiApi || !parsedMessage.geminiModel)) {
          setIsSettingPage(true);
        }
        break;
      default:
        break;
    }
  })

  return (
    <div style={{height: "90vh"}}>
      { isSettingPage
      ?
      <SettingView
        setIsSettingPage={setIsSettingPage}
        initClangdPath ={initClangdPath}
        initLinuxPath={initLinuxPath}
        initCompileCommandPath={initCompileCommandPath}
        initReportPath={initReportPath}
        initLlmName={initLlmName}
        initOpenAIApiKey={initOpenAIApiKey}
        initAnthropicApiKey={initAnthropicApiKey}
        initPlamoApiKey={initPlamoApiKey}
        initGeminiApiKey={initGeminiApiKey}
        initOpenAIModelName={initOpenAIModelName}
        initAnthropicModelName={initAnthropicModelName}
        initGeminiModelName={initGeminiModelName}
      />
      :
      <ChatView
        setIsSettingPage={setIsSettingPage}
        messages={messages}
        setMessages={setMessages}
      />
      }
    </div>
  )
}

export default App
