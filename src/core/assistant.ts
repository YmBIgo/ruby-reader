import * as vscode from "vscode";
import * as vscodelc from "vscode-languageclient/node";
import fs from "fs/promises";

import {
  addFilePrefixToFilePath,
  removeFilePrefixFromFilePath,
} from "./util/filepath";
import { ChoiceTree, HistoryHandler, ProcessChoice } from "./history";
import { LLMModel } from "./llm/model";
import { Message, MessageType } from "./type/Message";
import {
  getFileLineAndCharacterFromFunctionName,
  getFunctionContentFromLineAndCharacter,
} from "./lsp";
import { buildLLMHanlder, LLMName } from "./llm";
import Anthropic from "@anthropic-ai/sdk";
import { AskResponse } from "./type/Response";
import {
  bugFixPrompt,
  mermaidPrompt,
  pickCandidatePromopt,
} from "./prompt/index_ja";
import pWaitFor from "p-wait-for";

let client: ClangdLanguageClient | null;

class ClangdLanguageClient extends vscodelc.LanguageClient {
  // Override the default implementation for failed requests. The default
  // behavior is just to log failures in the output panel, however output panel
  // is designed for extension debugging purpose, normal users will not open it,
  // thus when the failure occurs, normal users doesn't know that.
  //
  // For user-interactive operations (e.g. applyFixIt, applyTweaks), we will
  // prompt up the failure to users.

  override handleFailedRequest<T>(
    type: vscodelc.MessageSignature,
    error: any,
    token: vscode.CancellationToken | undefined,
    defaultValue: T
  ): T {
    if (
      error instanceof vscodelc.ResponseError &&
      type.method === "workspace/executeCommand"
    ) {
      vscode.window.showErrorMessage(error.message);
    }
    return super.handleFailedRequest(type, token, error, defaultValue);
  }
}

export const clangdDocumentSelector = [{ scheme: "file", language: "c" }];

export class LinuxReader {
  private apiHandler: LLMModel | null;
  private historyHanlder: HistoryHandler | null = null;
  private rootPath: string = "";
  private rootLine: number = -1;
  private rootCharacter: number = -1;
  private rootFunctionName: string = "";
  private purpose: string = "";

  private saySocket: (content: string) => void;
  private sendErrorSocket: (content: string) => void;
  private askSocket: (content: string) => Promise<AskResponse>;
  private mermaidSocket: (content: string) => void;
  private sendState: (messages: Message[]) => void;

  messages: Message[] = [];
  private askResponse?: string;
  private saveReportFolder: string;

  constructor(
    ask: (content: string) => Promise<AskResponse>,
    say: (content: string) => void,
    sendError: (content: string) => void,
    sendState: (messages: Message[]) => void,
    llmName: LLMName,
    // openai
    openAIModel: string,
    openAIApiKey: string,
    // anthropic
    anthropicModel: string,
    anthropicApiKey: string,
    // plamo
    plamoApiKey: string,
    // gemini
    geminiModel: string,
    geminiApiKey: string,
    // clangd
    clangdPath: string,
    linuxPath: string,
    compileCommandPath: string,
    reportPath: string
  ) {
    this.saySocket = (content: string) => {
      const m = this.addMessages(content, "say");
      sendState(m);
      say(content);
    };
    this.askSocket = (content: string) => {
      const m = this.addMessages(content, "ask");
      sendState(m);
      return ask(content);
    };
    this.sendErrorSocket = (content: string) => {
      const m = this.addMessages(content, "error");
      sendState(m);
      sendError(content);
    };
    this.mermaidSocket = (content: string) => {
      const m = this.addMessages(content, "mermaid");
      sendState(m);
    };
    this.sendState = sendState;
    const modelType =
      llmName === "openai"
        ? openAIModel
        : llmName === "anthropic"
        ? anthropicModel
        : llmName === "gemini"
        ? geminiModel
        : "";
    const apiKey =
      llmName === "openai"
        ? openAIApiKey
        : llmName === "anthropic"
        ? anthropicApiKey
        : llmName === "plamo"
        ? plamoApiKey
        : llmName === "gemini"
        ? geminiApiKey
        : "unknown llm name";
    this.apiHandler = buildLLMHanlder(llmName, modelType, apiKey);
    this.saveReportFolder = reportPath;
    if (!clangdPath || !linuxPath || !compileCommandPath) {
      return;
    }
    this.init(clangdPath, linuxPath, compileCommandPath);
  }

  private async init(
    clangdPath: string,
    linuxPath: string,
    compileCommand: string
  ) {
    const clangd: vscodelc.Executable = {
      command: clangdPath,
      args: [`--compile-commands-dir=${compileCommand}`, "--background-index"],
      options: {
        cwd: linuxPath,
        shell: true,
      },
    };
    const serverOptions: vscodelc.ServerOptions = clangd;
    const clientOptions: vscodelc.LanguageClientOptions = {
      documentSelector: clangdDocumentSelector,
      initializationOptions: {
        clangdFileStatus: true,
      },
      revealOutputChannelOn: vscodelc.RevealOutputChannelOn.Never,
    };
    if (client) {
      await client
        ?.restart()
        .then(() => {
          console.log("client restarting");
        })
        .catch(() => {
          console.error("client failed to start...");
        });
    } else {
      client = new ClangdLanguageClient(
        `Linux Reader`,
        serverOptions,
        clientOptions
      );
      await client
        ?.start()
        .then(() => {
          console.log("client starting");
        })
        .catch(() => {
          console.error("client failed to start...");
        });
    }
    console.log("init finished! with status", client.state);
  }

  async runFirstTaskWithHistory(
    currentFilePath: string,
    currentFunctionName: string,
    purpose: string,
    choiceTree: ChoiceTree
  ) {
    this.rootPath = currentFilePath;
    this.rootFunctionName = currentFunctionName;
    const [currentLine, currentCharacter] =
      await getFileLineAndCharacterFromFunctionName(
        currentFilePath,
        currentFunctionName,
        currentFunctionName,
        true
      );
    if (currentLine === -1 && currentCharacter === -1) {
      this.sendErrorSocket(
        `以下の内容は見つかりませんでした ${currentFunctionName} @ ${currentFilePath}...`
      );
    }
    this.rootLine = currentLine;
    this.rootCharacter = currentCharacter;
    this.purpose = purpose;
    this.historyHanlder = new HistoryHandler(
      this.rootPath,
      currentFunctionName,
      currentFunctionName
    );
    this.historyHanlder.overWriteChoiceTree(choiceTree);
    const historyTree = this.historyHanlder.showHistory();
    if (historyTree) {
      this.saySocket(historyTree);
    }
    const question = "過去の履歴の中から検索したいハッシュ値を入力してください。末端のノードからは検索できません";
    const result = await this.askSocket(question);
    const resultNumber = parseInt(result.ask);
    if (isNaN(resultNumber) || resultNumber > 999999) {
      this.runHistoryPoint(result.ask);
      return;
    }
    this.sendErrorSocket("ハッシュ値が見つかりませんでした。再度閉じて再試行してください");
  }

  async runFirstTask(
    currentFilePath: string,
    currentFunctionName: string,
    purpose: string
  ) {
    this.rootPath = currentFilePath;
    this.rootFunctionName = currentFunctionName;
    const [currentLine, currentCharacter] =
      await getFileLineAndCharacterFromFunctionName(
        currentFilePath,
        currentFunctionName,
        currentFunctionName,
        true
      );
    if (currentLine === -1 && currentCharacter === -1) {
      this.sendErrorSocket(
        `以下の内容は見つかりませんでした ${currentFunctionName} @ ${currentFilePath}...`
      );
    }
    this.rootLine = currentLine;
    this.rootCharacter = currentCharacter;
    this.purpose = purpose;
    this.historyHanlder = new HistoryHandler(
      this.rootPath,
      currentFunctionName,
      currentFunctionName
    );
    this.runInitialTask(this.rootPath, this.rootLine, this.rootCharacter);
  }

  private async runInitialTask(
    currentFilePath: string,
    currentLine: number,
    currentCharacter: number
  ) {
    let functionContent: string = "";
    try {
      functionContent = await getFunctionContentFromLineAndCharacter(
        currentFilePath,
        currentLine,
        currentCharacter
      );
    } catch (e) {
      console.error(e);
      this.sendErrorSocket(
        `以下の内容は見つかりませんでした ${currentFilePath}@${currentLine}:${currentCharacter}`
      );
      return;
    }
    this.runTask(currentFilePath, functionContent);
  }
  private async runTask(currentFilePath: string, functionContent: string) {
    const userPrompt = `
\`\`\`purpose
${this.purpose}
\`\`\`

\`\`\`code
${functionContent}
\`\`\``;
    console.log(userPrompt);
    const history: Anthropic.Messages.MessageParam[] = [
      { role: "user", content: userPrompt },
    ];
    let responseJSON: string;
    try {
      const response =
        (await this.apiHandler?.createMessage(
          pickCandidatePromopt,
          history,
          true
        )) ?? "{}";
      responseJSON = JSON.parse(response);
    } catch (e) {
      console.error(e);
      this.sendErrorSocket(`APIエラー`);
      this.saveChoiceTree();
      return;
    }
    if (!Array.isArray(responseJSON)) {
      console.error("respond JSON format is not Array...");
      this.sendErrorSocket(`返ってきた情報が間違っています...`);
      this.saveChoiceTree();
      return;
    }
    // TODO : 正確な型をつける
    const fileContentArray = functionContent.split("\n");
    let newHistoryChoices: ProcessChoice[] = [];
    let parsedContentCodeLineArray: string[] = [];
    let askQuestion = "";
    console.log(JSON.stringify(responseJSON));
    responseJSON.forEach((each_r, index) => {
      let isLongComment = false;
      let isLongComment2 = false;
      const fileCodeLine =
        fileContentArray.find((fcr) => {
          if (fcr.includes(each_r.code_line)) {
            return true;
          }
          return false;
        }) ??
        fileContentArray.find((fcr) => {
          const spaceRemovedRow = fcr.replace(/ /g, "").replace(/\t/g, "");
          let commentStartIndex: number = -1;
          let commentEndIndex: number = -1;
          const longCommentStart = spaceRemovedRow.matchAll(/\/\*/g);
          const longCommentEnd = spaceRemovedRow.matchAll(/\*\//g);
          for (const start_m of longCommentStart) {
            commentStartIndex = start_m.index;
            // 最初で破棄
            break;
          }
          for (const end_m of longCommentEnd) {
            // 最後まで読む
            commentEndIndex = end_m.index;
          }
          if (
            commentStartIndex !== -1 &&
            commentEndIndex !== -1 &&
            commentStartIndex < commentEndIndex
          ) {
            // 1行のコメントなのでskip
          } else if (isLongComment && commentEndIndex !== -1) {
            // 一旦複雑なケースは考慮しない（コメントの中でのコメント定義など）
            isLongComment = false;
          } else if (!isLongComment && commentStartIndex !== -1) {
            isLongComment = true;
          }
          if (isLongComment) {
            return;
          }
          if (spaceRemovedRow.startsWith("//")) {
            return;
          }
        }) ??
        each_r.code_line.includes(each_r["name"])
          ? each_r.code_line
          : fileContentArray.find((fcr) => {
              const spaceRemovedRow = fcr.replace(/ /g, "").replace(/\t/g, "");
              if (spaceRemovedRow.startsWith("//")) {
                return false;
              }
              let commentStartIndex: number = -1;
              let commentEndIndex: number = -1;
              const longCommentStart = spaceRemovedRow.matchAll(/\/\*/g);
              const longCommentEnd = spaceRemovedRow.matchAll(/\*\//g);
              for (const start_m of longCommentStart) {
                commentStartIndex = start_m.index;
                // 最初で破棄
                break;
              }
              for (const end_m of longCommentEnd) {
                // 最後まで読む
                commentEndIndex = end_m.index;
              }
              if (
                commentStartIndex !== -1 &&
                commentEndIndex !== -1 &&
                commentStartIndex < commentEndIndex
              ) {
                // 1行のコメントなのでskip
              } else if (isLongComment2 && commentEndIndex !== -1) {
                // 一旦複雑なケースは考慮しない（コメントの中でのコメント定義など）
                isLongComment2 = false;
              } else if (!isLongComment && commentStartIndex !== -1) {
                isLongComment2 = true;
              }
              if (isLongComment2) {
                return false;
              }
              return fcr.includes(each_r["name"]);
            }) ?? each_r["name"];
      parsedContentCodeLineArray.push(fileCodeLine);
      askQuestion += `${index} : ${each_r.name}\n`;
      askQuestion += `Details : ${each_r.description}\n`;
      askQuestion += `Whole Code Line : ${fileCodeLine}\n`;
      askQuestion += `Original Code : ${each_r.code_line}\n`;
      askQuestion += `Confidence : ${each_r.score}\n`;
      askQuestion += `----------------------------\n`;
      newHistoryChoices.push({
        functionName: each_r.name,
        functionCodeLine: fileCodeLine,
        originalFilePath: currentFilePath,
      });
    });
    let resultNumber = 0;
    let result: AskResponse | null = null;
    this.saySocket(`${askQuestion}`);
    for (;;) {
      result = await this.askSocket(`
表示したい詳細のインデックスを入力してください。
  - 5 を入力すると再試行できます
  - 6 を入力すると履歴を木構造で表示します
  - 7 を入力すると探索レポートを生成します
  - 8 を入力すると現在のファイルを表示します
  - 9 を入力すると現在の関数のマーメイド図を生成します
  - 10 を入力すると疑わしいバグを検出します
  - 11 を入力するとここまでの履歴をJSONで保存します
※ 文字列を入力すると、過去の履歴を検索するハッシュ値として認識されます`);
      console.log(`result : ${result.ask}`);
      resultNumber = Number(result.ask);
      const newMessages = this.addMessages(`User Enter ${result.ask}`, "user");
      this.sendState(newMessages);
      if (isNaN(resultNumber) || resultNumber > 999999) {
        // this.runHistoryPoint(result.ask);
        break;
      }
      if (resultNumber >= 0 && resultNumber < 5) {
        break;
      }
      if (resultNumber === 5) {
        // this.runTask(currentPath, functionContent);
        break;
      }
      if (resultNumber === 6) {
        const historyTree = this.historyHanlder?.showHistory();
        if (historyTree) {
          this.saySocket(historyTree);
        }
        continue;
      }
      if (resultNumber === 7) {
        await this.getReport();
        continue;
      }
      if (resultNumber === 8) {
        try {
          const openDoc = await vscode.workspace.openTextDocument(
            currentFilePath
          );
          await vscode.window.showTextDocument(openDoc, {
            preview: false, // タブの使い回しを避ける場合は false
            preserveFocus: false, // エディタにフォーカスを移す
          });
          const openDocText = openDoc.getText().split("\n");
          const functionLines = functionContent.split("\n").filter((fcr) => {
            return fcr.replace(/\s\t/g, "") !== "";
          });
          let functionStartLine = functionLines[0];
          let functionEndLine = functionLines.at(-1);
          const functionStartLineIndex =
            openDocText.findIndex((odt) => odt === functionStartLine) ?? 0;
          const positionStart = new vscode.Position(functionStartLineIndex, 0);
          const positionEnd = new vscode.Position(
            functionStartLineIndex + functionContent.split("\n").length,
            functionEndLine?.length ?? 10000
          );
          const selection = new vscode.Selection(positionStart, positionEnd);
          vscode.window.activeTextEditor!.selection = selection;
          // this.saySocket("\n\n----------\n" + functionContent + "\n----------\n\n");
          continue;
        } catch (e) {
          console.warn(e);
          continue;
        }
      } else if (resultNumber === 9) {
        await this.getMermaid(functionContent);
        continue;
      } else if (resultNumber === 10) {
        await this.getBugsReport();
        continue;
      } else if (resultNumber === 11) {
        this.saveChoiceTree();
        continue;
      }
    }
    if (isNaN(resultNumber) || resultNumber > 999999) {
      this.runHistoryPoint(result.ask);
      return;
    }
    if (resultNumber === 5) {
      this.runTask(currentFilePath, functionContent);
      return;
    }
    if (!responseJSON[resultNumber]) {
      this.sendErrorSocket(
        `あなたの選択肢 ${resultNumber} は正しい選択肢ではありません`
      );
      return;
    }
    this.historyHanlder?.addHistory(newHistoryChoices);
    this.saySocket(
      `Clangdは "${responseJSON[resultNumber].name}" を検索しています`
    );
    const [searchLine, searchCharacter] =
      await getFileLineAndCharacterFromFunctionName(
        currentFilePath,
        responseJSON[resultNumber].code_line,
        responseJSON[resultNumber].name,
        false
      );
    if (searchLine === -1 && searchCharacter === -1) {
      this.sendErrorSocket(`ファイルの内容の検索中に失敗しました`);
      this.saveChoiceTree();
      return;
    }
    const [newFile, newLine, newCharacter, newFunctionContent] =
      await this.queryClangd(currentFilePath, searchLine, searchCharacter);
    if (!newFile) {
      console.error("Clangd はファイルの検索に失敗しました");
      this.sendErrorSocket("Clangd はファイルの検索に失敗しました");
      this.saveChoiceTree();
      return;
    }
    this.historyHanlder?.choose(resultNumber, newFunctionContent);
    this.saySocket(
      `LLMは ${newFile}@${newLine}:${newCharacter} を検索しています`
    );
    this.runTask(removeFilePrefixFromFilePath(newFile), newFunctionContent);
  }

  private runHistoryPoint(historyHash: string) {
    const newRunConfig = this.historyHanlder?.moveById(historyHash);
    if (!newRunConfig) {
      this.sendErrorSocket(
        `指定された検索履歴のhash値が見つかりませんでした ${historyHash}`
      );
      this.saveChoiceTree();
      return;
    }
    const { functionCodeLine, originalFilePath } = newRunConfig;
    this.runTask(originalFilePath, functionCodeLine);
  }

  private async getReport() {
    const r = this.historyHanlder?.traceFunctionContent();
    if (!r) {
      this.sendErrorSocket(`レポート取得に失敗しました`);
      return;
    }
    const [result, functionResult] = r;
    this.saySocket(`Generate Report related to "${functionResult}"`);
    const userPrompt = `\`\`\`purpose
${this.purpose}
\`\`\`

${result}`;
    const history: Anthropic.MessageParam[] = [
      { role: "user", content: userPrompt },
    ];
    const response =
      (await this.apiHandler?.createMessage(
        pickCandidatePromopt,
        history,
        false
      )) || "failed to get result";
    const res = response + "\n\n - Details \n\n" + result;
    const fileName = `report_${Date.now()}.txt`;
    await fs.writeFile(`${this.saveReportFolder}/${fileName}`, res);
    this.saySocket(
      `Generate Report successfully @${this.saveReportFolder}/${fileName}`
    );
  }

  private async getMermaid(functionContent: string) {
    this.saySocket(`Start generating Mermaid diagram of the current function.`);
    const userPrompt = `\`\`\`content
${functionContent}
\`\`\``;
    const history: Anthropic.MessageParam[] = [
      { role: "user", content: userPrompt },
    ];
    const response =
      (await this.apiHandler?.createMessage(mermaidPrompt, history, false)) ||
      "failed to get result";
    this.saySocket(`Generate Mermaid diagram. Done!`);
    this.mermaidSocket(response);
  }
  private async getBugsReport() {
    const description = await this.askSocket(
      `読んでいるコードと関連する怪しい挙動があるなら書いてください（無ければnoと書いてください）`
    );
    const r = this.historyHanlder?.traceFunctionContent();
    if (!r) {
      this.sendErrorSocket(`バグレポート取得に失敗しました...`);
      return;
    }
    const [result, functionResult] = r;
    this.saySocket(`"${functionResult}"と関連するバグを探しています`);
    const userPrompt = `<functions or methods>
${result}
<the suspicious behavior (optional)>
${description ? description : "not provided..."}
`;
    const history: Anthropic.MessageParam[] = [
      { role: "user", content: userPrompt },
    ];
    const response =
      (await this.apiHandler?.createMessage(bugFixPrompt, history, false)) ||
      "failed to get result";
    this.saySocket("Generate Bugs Report. Done!");
    this.saySocket(response);
  }
  private async saveChoiceTree() {
    const choiceTreeWithAdditionalInfo = {
      ...this.historyHanlder?.getChoiceTree(),
      purpose: this.purpose,
      rootPath: this.rootPath,
      rootFunctionName: this.rootFunctionName
    };
    const choiceTreeString = JSON.stringify(choiceTreeWithAdditionalInfo);
    if (!choiceTreeString) {
      return;
    }
    const fileName = `choices_${Date.now()}.json`;
    await fs.writeFile(
      `${this.saveReportFolder}/${fileName}`,
      choiceTreeString
    );
    this.saySocket(
      `ここまでの調査履歴が "${this.saveReportFolder}/${fileName}" に保存されました`
    );
  }

  private async doQueryClangd(
    filePath: string,
    line: number,
    character: number,
    shouldWaitMs: number = 2000
  ): Promise<[string, number, number, any]> {
    console.log(line, character);
    let itemString: string = "";
    const fileContent = await fs.readFile(filePath, "utf-8");
    await pWaitFor(() => !!this.isClangdRunning(), {
      interval: 500,
    });
    await client?.sendNotification("textDocument/didOpen", {
      textDocument: {
        uri: addFilePrefixToFilePath(filePath),
        languageId: "c",
        version: 0,
        text: fileContent,
      },
    });
    if (shouldWaitMs) {
      await new Promise((resolve) => setTimeout(resolve, shouldWaitMs));
    }
    await client
      ?.sendRequest("textDocument/definition", {
        textDocument: {
          uri: addFilePrefixToFilePath(filePath),
        },
        position: { line, character },
      })
      .then((result) => {
        itemString = JSON.stringify(result);
      });
    let item: any = [];
    try {
      item = JSON.parse(itemString as any);
    } catch (e) {
      console.error(e);
      this.saveChoiceTree();
    }
    if (!Array.isArray(item) || item.length <= 0) {
      console.log("item not array", item);
      return ["", 0, 0, item];
    }
    const firstItem = item[0];
    const file = firstItem.uri;
    await client?.sendNotification("textDocument/didClose", {
      textDocument: {
        uri: addFilePrefixToFilePath(filePath),
        languageId: "c",
        version: 0,
        text: fileContent,
      },
    });
    return [
      file,
      firstItem.range.start.line,
      firstItem.range.start.character,
      item,
    ];
  }

  async queryClangd(
    filePath: string,
    line: number,
    character: number
  ): Promise<[string, number, number, string, any]> {
    const [newFilePath1, newLine1, newCharacter1, item1] =
      await this.doQueryClangd(filePath, line, character, 5000);
    let newFilePath2 = newFilePath1;
    let newLine2 = newLine1;
    let newCharacter2 = newCharacter1;
    let item2 = item1;

    for (let i = 0; i < 10; i++) {
      if (newFilePath2.endsWith(".h")) {
        [newFilePath2, newLine2, newCharacter2, item2] =
          await this.doQueryClangd(
            removeFilePrefixFromFilePath(newFilePath1),
            newLine1,
            newCharacter1
          );
      } else if (newFilePath2.endsWith(".c")) {
        break;
      }
    }
    const functionContent = await getFunctionContentFromLineAndCharacter(
      removeFilePrefixFromFilePath(newFilePath2),
      newLine2,
      newCharacter2
    );
    return [newFilePath2, newLine2, newCharacter2, functionContent, item2];
  }

  private isClangdRunning() {
    return client?.state === vscodelc.State.Running;
  }

  async doGC() {
    this.rootPath = "";
    this.rootLine = -1;
    this.rootCharacter = -1;
    this.saySocket = () => {};
    this.askSocket = async (content: string) => {
      return {} as AskResponse;
    };
    this.messages = [];
    this.sendState = () => {};
    this.historyHanlder = null;
    this.apiHandler = buildLLMHanlder("openai", "gpt-4.1", "no key");
  }

  handleWebViewAskResponse(askResponse: string) {
    this.askResponse = askResponse;
  }
  getWebViewAskResponse(): string | undefined {
    return this.askResponse;
  }
  clearWebViewAskResponse() {
    this.askResponse = undefined;
  }
  getMessages() {
    return this.messages;
  }
  addMessages(content: string, type: MessageType) {
    this.messages.push({ type, content, time: Date.now() });
    return this.messages;
  }
  setMessages(messages: Message[]) {
    this.messages = messages;
  }
}
