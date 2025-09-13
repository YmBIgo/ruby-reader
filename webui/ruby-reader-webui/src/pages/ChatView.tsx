import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { Message } from "../type/Message";
import VscodeButton from "@vscode-elements/react-elements/dist/components/VscodeButton";
import VscodeTextfield from "@vscode-elements/react-elements/dist/components/VscodeTextfield";
import Mermaid from "../components/Mermaid";
import VscodeIcon from "@vscode-elements/react-elements/dist/components/VscodeIcon";
import { vscode } from "../utils/vscode";
import { VscodeProgressRing } from "@vscode-elements/react-elements";

type ChatViewType = {
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setIsSettingPage: Dispatch<SetStateAction<boolean>>;
};

const INPUT_PHASE_NUMBER = [0, 1, 2, 6, 8, 9];
const BACK_PHASE_NUMBER = [1, 2, 3, 6, 7, 8, 9, 10];
const SHOW_HISTORY_NUMBER = [0, 1, 2, 6, 8, 9];
const INPUT_PHASE_TEXT = [
  `Enter "file path you want to search"`, // 0
  `Next, enter "the first line of the function to search"`, // 1
  `Next, enter "Purpose"`, // 2
  `Enter "Start Task" to start to explore.`, // 3
  "", // 4
  "", // 5
  "Please enter the file path of the history JSON to start the search.", // 6
  `Enter "Start Task" to start to explore.`, // 7
  `Please enter the folder you want to search`, // 8
  `Please enter the purpose of folder and file search`, // 9
  `Enter "Start Task" to start to explore.`, // 10
];

const ChatView: React.FC<ChatViewType> = ({
  messages,
  setMessages,
  setIsSettingPage,
}) => {
  // 0はrootPath入力
  // 1はrootFunctionName入力
  // 2は目的入力
  // 3は確認
  // 4は入力画面
  // 5はdisable中
  // 6はhistory入力中
  // 7はhistory確認
  // 8はfolder入力中
  // 9はfolder目的入力
  // 10はfoler確認
  const [inputPhase, setInputPhase] = useState<0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10>(
    0
  );
  // normal input
  const [rootPath, setRootPath] = useState<string>("");
  const [rootFunctionName, setRootFunctionName] = useState<string>("");
  const [purpose, setPurpose] = useState<string>("");
  // history input
  const [historyPath, setHistoryPath] = useState<string>("");
  // folder input
  const [folderPath, setFolderPath] = useState<string>("");
  const [folderPurpose, setFolderPurpose] = useState<string>("");
  const task =
    rootPath && rootFunctionName && purpose
      ? `File Path you want to search : ${rootPath}
First line of the function to search: ${rootFunctionName}
Purpose: ${purpose}`
      : historyPath
      ? `Input history path is ${historyPath}`
      : folderPath && folderPurpose
      ? `Folder Search Path you want to search : ${folderPath}
Purpose : ${folderPurpose}`
      : "Task is not started";

  const lastMessage = messages[messages.length - 1];
  const [inputText, setInputText] = useState<string>("");
  const primaryButtonText =
    inputPhase === 0
      ? `Enter "file path you want to search"`
      : inputPhase === 1
      ? `Enter "First line of the function to search"`
      : inputPhase === 2
      ? "Enter Purpose"
      : inputPhase === 3
      ? "Start Task"
      : inputPhase === 4
      ? "Select"
      : inputPhase === 5
      ? "　"
      : inputPhase === 6
      ? `Enter "the file path of the history"`
      : inputPhase === 7
      ? "Start Task"
      : inputPhase === 8
      ? "Enter the folder path you want to search"
      : inputPhase === 9
      ? "Enter Purpose"
      : inputPhase === 10
      ? "Start Task"
      : "Unknown Command";

  const secondaryButtonText =
    inputPhase === 0
      ? "　"
      : inputPhase === 1
      ? "Back"
      : inputPhase === 2
      ? "Back"
      : inputPhase === 3
      ? "Back"
      : inputPhase === 4
      ? "Cancel"
      : inputPhase === 5
      ? "　"
      : inputPhase === 6
      ? "Back to Normal Input"
      : inputPhase === 7
      ? "Back"
      : inputPhase === 8
      ? "Back to Normal Input"
      : inputPhase === 9
      ? "Back"
      : inputPhase === 10
      ? "Back"
      : "Unknown Command";

  const handleSecondaryButtonClick = () => {
    if (BACK_PHASE_NUMBER.includes(inputPhase)) {
      if (inputPhase === 1) {
        setRootFunctionName("");
      } else if (inputPhase === 2) {
        setPurpose("");
      } else if (inputPhase === 3) {
        // skip
      } else if (inputPhase === 4) {
        vscode.postMessage({
          type: "Reset",
        });
        setRootPath("");
        setRootFunctionName("");
        setPurpose("");
        setInputPhase(0);
        setMessages([
          {
            type: "say",
            content:
              `Please enter the "file path you want to search", the "first line of the function to search," and the "purpose."`,
            time: Date.now(),
          },
          {
            type: "say",
            content: `Enter "file path you want to search"`,
            time: Date.now() + 100,
          },
        ]);
        return;
      } else if (inputPhase === 6) {
        setMessages((m) => [
          ...m,
          {
            type: "say",
            content: INPUT_PHASE_TEXT[0],
            time: Date.now() + 100,
          },
        ]);
        setInputText("");
        setInputPhase(0);
        return;
      } else if (inputPhase === 7) {
        setHistoryPath("");
      } else if (inputPhase === 8) {
        setMessages((m) => [
          ...m,
          {
            type: "say",
            content: INPUT_PHASE_TEXT[0],
            time: Date.now() + 100,
          },
        ]);
        setInputText("");
        setInputPhase(0);
        return;
      } else if (inputPhase === 9) {
        setFolderPath("");
      } else if (inputPhase === 10) {
        setFolderPurpose("");
      }
      setMessages((m) => [
        ...m,
        {
          type: "say",
          content: INPUT_PHASE_TEXT[inputPhase - 1],
          time: Date.now() + 100,
        },
      ]);
      setInputText("");
      setInputPhase((i_phase) => (i_phase - 1) as 0 | 1 | 2);
    } else {
      return;
    }
  };

  const handlePrimaryButtonClick = () => {
    if (INPUT_PHASE_NUMBER.includes(inputPhase)) {
      if (inputPhase === 0) {
        setRootPath(inputText);
      } else if (inputPhase === 1) {
        setRootFunctionName(inputText);
      } else if (inputPhase === 2) {
        setPurpose(inputText);
      } else if (inputPhase === 6) {
        setHistoryPath(inputText);
      } else if (inputPhase === 8) {
        setFolderPath(inputText);
      } else if (inputPhase === 9) {
        setFolderPurpose(inputText);
      }
      setMessages((m) => [
        ...m,
        {
          type: "user",
          content: inputText,
          time: Date.now(),
        },
        {
          type: "say",
          content: INPUT_PHASE_TEXT[inputPhase + 1],
          time: Date.now() + 100,
        },
      ]);
      setInputText("");
      setInputPhase((ip) => {
        const newphase = ip + 1;
        if (newphase < 11 && newphase >= 0) return newphase as 0 | 1 | 2 | 3 | 7 | 9 | 10;
        return ip;
      });
    } else if (inputPhase === 3) {
      setMessages([]);
      vscode.postMessage({
        type: "Init",
        rootPath,
        rootFunctionName,
        purpose,
      });
      setInputPhase(5);
    } else if (inputPhase === 4) {
      if (!inputText.trim()) {
        return;
      }
      vscode.postMessage({
        type: "Ask",
        askResponse: inputText.trim(),
      });
      setInputPhase(5);
    } else if (inputPhase === 7) {
      setMessages([]);
      vscode.postMessage({
        type: "InitHistory",
        historyPath,
      });
      setInputPhase(5);
    } else if (inputPhase === 10) {
      setMessages([]);
      vscode.postMessage({
        type: "InitFolder",
        folder: folderPath,
        purpose: folderPurpose
      });
      setInputPhase(5);
    }
  };

  const gotoHistoryPhase = () => {
    setRootPath("");
    setRootFunctionName("");
    setPurpose("");
    setMessages((m) => [
      ...m,
      {
        type: "user",
        content: "Enter from history Json",
        time: Date.now(),
      },
      {
        type: "say",
        content: INPUT_PHASE_TEXT[6],
        time: Date.now() + 100,
      },
    ]);
    setInputPhase(6);
  };

  const gotoFolderPhase = () => {
    setRootPath("");
    setRootFunctionName("");
    setPurpose("");
    setMessages((m) => [
      ...m,
      {
        type: "user",
        content: "Enter from folder path",
        time: Date.now(),
      },
      {
        type: "say",
        content: INPUT_PHASE_TEXT[8],
        time: Date.now() + 100,
      },
    ]);
    setInputPhase(8);
  }

  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.type === "ask") {
      setInputPhase(4);
      const messagesContainer = document.getElementById("messages");
      messagesContainer?.lastElementChild?.scrollIntoView({
        block: "end",
        behavior: "smooth",
      });
    }
  }, [lastMessage]);

  return (
    <div
      style={{
        width: "350px",
        height: "95vh",
        overflow: "scroll",
        position: "relative",
        borderRight: "1px solid black",
      }}
      id="container"
    >
      <div
        style={{
          border: "3px solid blue",
          backgroundColor: "white",
          padding: "10px",
          borderRadius: "10px",
          width: "310px",
          margin: "10px 10px",
          position: "fixed",
          top: "0px",
          left: "10px",
          whiteSpace: "break-spaces",
          overflow: "scroll",
        }}
      >
        <p style={{ color: "black", margin: "0" }}>
          {task}
          <hr />
          If the setup has not been completed yet, please complete the setup.
          <br />
          <VscodeButton
            onClick={() => {
              setIsSettingPage(true);
              vscode.postMessage({
                type: "Reset",
              });
              setRootPath("");
              setRootFunctionName("");
              setPurpose("");
              setInputPhase(0);
              setMessages([
                {
                  type: "say",
                  content:
                    `Please enter the "file path you want to search", the "first line of the function to search", and the "purpose".`,
                  time: Date.now(),
                },
                {
                  type: "say",
                  content: `Enter "file path you want to search"`,
                  time: Date.now() + 100,
                },
              ]);
            }}
          >
            Setting Page
          </VscodeButton>
          <br />
        </p>
      </div>
      <div
        id="messages"
        style={{
          width: "310px",
          padding: "10px",
          margin: "150px 0 50px",
          height: "calc(100vh - 320px)",
        }}
      >
        <div
          style={{
            padding: "10px",
            margin: "10px 0",
            height: "50px",
            width: "310px",
          }}
        ></div>
        {messages.map((message) =>
          message.type === "ask" || message.type === "say" ? (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-start",
                backgroundColor: "white",
                padding: "10px",
                margin: "10px 0",
                whiteSpace: "break-spaces",
                width: "310px",
                color: "black",
                overflow: "scroll",
              }}
            >
              {message.content}
            </div>
          ) : message.type === "error" ? (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                backgroundColor: "#dc3545",
                color: "white",
                padding: "10px",
                margin: "10px 0",
                whiteSpace: "break-spaces",
                width: "310px",
                overflow: "scroll",
              }}
            >
              Error Occurs... Please try again...
              <br />
              Reason : {message.content}
              <br />
              Please press "here" above to reset...
            </div>
          ) : message.type === "mermaid" ? (
            <div
              style={{
                padding: "10px",
                margin: "10px 0",
                width: "310px",
                overflow: "scroll",
              }}
            >
              <Mermaid code={message.content} />
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                backgroundColor: "#4cc764",
                color: "white",
                padding: "10px",
                margin: "10px 0",
                whiteSpace: "break-spaces",
                width: "310px",
                overflow: "scroll",
              }}
            >
              {message.content}
            </div>
          )
        )}
        {inputPhase === 5 || messages.length === 0 ? (
          <VscodeProgressRing
            style={{ width: "50px", height: "50px", textAlign: "center" }}
          />
        ) : (
          <></>
        )}
        <div
          style={{
            padding: "10px",
            margin: "10px 0",
            height: "100px",
            width: "310px",
          }}
        ></div>
      </div>
      {SHOW_HISTORY_NUMBER.includes(inputPhase) && (
        <div
          style={{
            position: "fixed",
            bottom: "100px",
            left: "0px",
            backgroundColor: "#00000070",
            height: "45px",
            width: "350px",
            paddingTop: "10px",
            paddingLeft: "10px",
          }}
        >
          {inputPhase !== 6 &&
          <VscodeButton
            onClick={gotoHistoryPhase}
              style={{ width: "150px", margin: "5px 10px" }}
          >
              Move to history search
            </VscodeButton>
          }
          {inputPhase !== 8 && inputPhase !== 9 &&
            <VscodeButton
              onClick={gotoFolderPhase}
              style={{ width: "150px", margin: "5px 10px" }}
            >
              Move to folder search
          </VscodeButton>
          }
        </div>
      )}
      <div
        style={{
          position: "fixed",
          bottom: "10px",
          left: "0px",
          backgroundColor: "#00000070",
          height: "80px",
          width: "350px",
          paddingTop: "10px",
          paddingLeft: "10px",
        }}
      >
        <VscodeTextfield
          value={inputText}
          onChange={(e) =>
            setInputText((e?.target as HTMLTextAreaElement)?.value || "")
          }
          disabled={inputPhase === 5}
          min={3}
        />
        <br />
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <VscodeButton
            disabled={inputPhase === 5}
            onClick={handleSecondaryButtonClick}
            secondary
          >
            {secondaryButtonText || "　"}
          </VscodeButton>
          <VscodeButton
            disabled={inputPhase === 5}
            onClick={handlePrimaryButtonClick}
          >
            {primaryButtonText || <VscodeIcon name="sync" />}
          </VscodeButton>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
