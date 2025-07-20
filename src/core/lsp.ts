import fs from "fs/promises";

export async function getFunctionContentFromLineAndCharacter(
  filePath: string,
  line: number,
  character: number
) {
  let originalFileContent: string = "";
  console.log(filePath, line, character);
  try {
    originalFileContent = await fs.readFile(filePath, "utf-8");
  } catch (e) {
    console.error(e);
    return "";
  }
  const fileContentSplit = originalFileContent.split("\n");
  const fileContentStart = fileContentSplit.slice(line);
  const failSafeFileContent = fileContentSplit
    .slice(line, line + 1)
    .join("\n");
  const doIncludeInFailSafeIndex = failSafeFileContent.search(/\sdo[\s]+/)
  const defIncludeInFailSafeIndex = failSafeFileContent.search(/^[\s]*def\s/);
  const arrowIncludeInFailSafeIndex = failSafeFileContent.indexOf("{");
  const failSafeIndex = [
    doIncludeInFailSafeIndex === -1 ? Infinity : doIncludeInFailSafeIndex,
    defIncludeInFailSafeIndex === -1 ? Infinity : defIncludeInFailSafeIndex,
    arrowIncludeInFailSafeIndex === -1 ? Infinity : arrowIncludeInFailSafeIndex
  ];
  const failSafeMinValue = Math.min(...failSafeIndex)
  const startIndex = failSafeMinValue === Infinity
    ? -1
    : failSafeIndex.find((i) => i === failSafeMinValue);
  const startType = failSafeMinValue === Infinity
    ? " "
    : startIndex === 0
      ? "do"
      : startIndex === 1
        ? "def"
        : startIndex === 2
          ? "\{"
          : " "
  const endType = startIndex === 2 ? "\}" : "end"
  const startRegexp = new RegExp(`\\s*${escapeRegExp(startType)}\\s*`, "g")
  const endRegexp = new RegExp(`^\\s*${escapeRegExp(endType)}\\s*$`, "g")
  let fileResultArray = [];
  let startArrowCount = startType === " " ? 1 : 0;
  let endArrowCount = 0;
  let isLongComment = false;
  for (let row of fileContentStart) {
    fileResultArray.push(row);
    if (row.replace(/\s/g, "").startsWith("#")) {
      continue;
    }
    let commentStartIndex: number = -1;
    let commentEndIndex: number = -1;
    const longCommentStart = row.matchAll(/=begin/g);
    const longCommentEnd = row.matchAll(/=end/g);
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
      continue;
    }
    if (startType === "\{") {
      startArrowCount += row.match(startRegexp)?.length ?? 0;
    } else {
      startArrowCount += row.match(/\s+do\s*/g)?.length ?? 0;
      startArrowCount += row.match(/^\s*def\s/g)?.length ?? 0;
      const ifExistsCount = row.match(/^\s*if\s/g)?.length ?? 0;
      const untilExistsCount = row.match(/^\s*until\s/g)?.length ?? 0;
      const unlessExistsCount = row.match(/^\s*unless\s/g)?.length ?? 0;
      const whileExistsCount = row.match(/^\s*while\s/g)?.length ?? 0
      const lambdaExistsCount = row.match(/^\s*lambda\s/g)?.length ?? 0;
      if (ifExistsCount > 0 || whileExistsCount > 0 || untilExistsCount > 0 || unlessExistsCount > 0 || lambdaExistsCount > 0) {
        const isReturnExists = row.match(/[\s]*return/g);
        const isQuestionExists = row.match(/\?/g);
        if (!isReturnExists && !isQuestionExists) {
          startArrowCount += ifExistsCount;
          startArrowCount += whileExistsCount;
          startArrowCount += untilExistsCount;
          startArrowCount += unlessExistsCount;
          startArrowCount += lambdaExistsCount;
        }
      }
    }
    endArrowCount += row.match(endRegexp)?.length ?? 0;
    if (
      startArrowCount === endArrowCount &&
      startArrowCount + endArrowCount !== 0
    ) {
      console.log(startArrowCount, endArrowCount)
      return fileResultArray.join("\n");
    }
  }
  console.error("error", startArrowCount, endArrowCount, fileResultArray.length);
  return "";
}

export async function getFileLineAndCharacterFromFunctionName(
  filePath: string,
  codeLine: string,
  functionName: string,
  isFirst: boolean = false
): Promise<[number, number]> {
  let fileContent: string = "";
  try {
    fileContent = await fs.readFile(filePath, "utf-8");
  } catch (e) {
    console.error(e);
    return [-1, -1];
  }
  const codeLineRegexp = new RegExp(`\\s${escapeRegExp(codeLine)}[\\s\\(\\)\\{\\|]{1}`, "g");
  const functionNameRegexp = new RegExp(`\\s*${escapeRegExp(functionName)}[\\s\\(\\)\\{\\|]{1}`, "g");
  const defClassFunctionRegexp = new RegExp(`\\s(def|class)\\s+${escapeRegExp(functionName)}`, "g");
  const memberAccessFunction = functionName.split("::");
  const memberAccessFunctionName = "::" + memberAccessFunction[memberAccessFunction.length - 1];
  const memberAccessFunctionRegexp = new RegExp(`${escapeRegExp(memberAccessFunctionName)}\\s*[\\(\\)\\{]*`, "g")
  const dotAccessFunction = functionName.split(".");
  const dotAccessFunctionName = "." + dotAccessFunction[dotAccessFunction.length - 1];
  const dotAccessFunctionRegexp = new RegExp(`${escapeRegExp(dotAccessFunctionName)}\\s*[\\(\\)\\{]*`, "g");
  const fileContentArray = fileContent.split("\n");
  let isLongComment = false;
  console.log("dot member : ", dotAccessFunction, memberAccessFunction);
  for (let i in fileContentArray) {
    const index = isNaN(Number(i)) ? -1 : Number(i);
    const row = "\n" + fileContentArray[index] + "\n";
    if (row.replace(/\s/g, "").startsWith("#")) {
      continue;
    }
    let commentStartIndex: number = -1;
    let commentEndIndex: number = -1;
    const longCommentStart = row.matchAll(/=begin/g);
    const longCommentEnd = row.matchAll(/=end/g);
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
      continue;
    }
    if (!isFirst) {
      const defOrClassMatched = row.search(defClassFunctionRegexp);
      if (defOrClassMatched !== -1) {
        console.log("def class found...");
        continue;
      }
    }
    let functionIndex = row.search(codeLineRegexp);
    if (dotAccessFunction.length > 1 && functionIndex !== -1) {
      functionIndex = row.search(dotAccessFunctionRegexp);
    } else if (memberAccessFunction.length > 1 && functionIndex !== -1) {
      functionIndex = row.search(memberAccessFunctionRegexp);
    } else if (functionIndex !== -1) {
      functionIndex = row.search(functionNameRegexp);
    }
    if (functionIndex !== -1) {
      return [index, functionIndex];
    }
  }
  return [-1, -1];
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
