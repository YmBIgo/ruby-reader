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
    .slice(line, line + 20)
    .join("\n");
  if (!failSafeFileContent.includes("{")) {
    return fileContentSplit.slice(line, line + 5).join("\n");
  }
  let fileResultArray = [];
  let startArrowCount = 0;
  let endArrowCount = 0;
  let isLongComment = false;
  for (let row of fileContentStart) {
    fileResultArray.push(row);
    if (row.replace(/\s\t/g, "").startsWith("//")) {
      continue;
    }
    let commentStartIndex: number = -1;
    let commentEndIndex: number = -1;
    const longCommentStart = row.matchAll(/\/\*/g);
    const longCommentEnd = row.matchAll(/\*\//g);
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
    startArrowCount += row.match(/\{/g)?.length ?? 0;
    endArrowCount += row.match(/\}/g)?.length ?? 0;
    if (
      startArrowCount === endArrowCount &&
      startArrowCount + endArrowCount !== 0
    ) {
      return fileResultArray.join("\n");
    }
  }
  console.error("error", startArrowCount, endArrowCount);
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
  const memberAccessFunction = functionName.split("->");
  const memberAccessFunctionName =
    memberAccessFunction[memberAccessFunction.length - 1];
  const wholeFunctionName = !memberAccessFunctionName.includes("(") && memberAccessFunction.length === 1
    ? memberAccessFunctionName + "("
    : memberAccessFunction.length > 1
    ? memberAccessFunctionName + ")"
    : memberAccessFunctionName;
  const simplfiedFunctionName = isFirst || memberAccessFunction.length > 1
    ? [wholeFunctionName.split(",")[0].replace(/^[\s\t]*/g, "")]
    : [" " + wholeFunctionName.split(",")[0].replace(/^[\s\t]*/g, ""),
      "\t" + wholeFunctionName.split(",")[0].replace(/^[\s\t]*/g, "")];
  const fileContentArray = fileContent.split("\n");
  let isLongComment = false;
  for (let i in fileContentArray) {
    const index = isNaN(Number(i)) ? -1 : Number(i);
    const row = fileContentArray[index];
    if (row.replace(/\s\t/g, "").startsWith("//")) {
      continue;
    }
    let commentStartIndex: number = -1;
    let commentEndIndex: number = -1;
    const longCommentStart = row.matchAll(/\/\*/g);
    const longCommentEnd = row.matchAll(/\*\//g);
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
    let functionIndex = row.indexOf(simplfiedFunctionName[0]);
    if (!isFirst && functionIndex >= 0) {
      functionIndex += 1;
    }
    if (functionIndex === -1 && simplfiedFunctionName.length === 2) {
      functionIndex = row.indexOf(simplfiedFunctionName[1]);
      if (!isFirst && functionIndex >= 0) {
        functionIndex += 1;
      }
    }
    if (functionIndex >= 0) {
      return [index, functionIndex];
    }
  }
  return [-1, -1];
}
