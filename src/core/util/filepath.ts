import { glob } from "glob";

export function addFilePrefixToFilePath(filePath: string) {
    if (filePath.startsWith("file://")) {
        return filePath;
    }
    return "file://" + filePath;
}

export function removeFilePrefixFromFilePath(filePath: string) {
    if (filePath.startsWith("file://")) {
        return filePath.slice(7);
    }
    return filePath;
}

async function globAllFunctions(rootPath: string) {
    const globOption = `${rootPath}/**/*.rb`;
    const globResults = await glob(globOption);
    return globResults;
}

export async function pickFunctions(rootPath: string) {
    const globResult = await globAllFunctions(rootPath);
    const depthResult = globResult.reduce((a, b) => {
        const bLength = b.split("/").length;
        if (a[String(bLength)] === undefined) {
            a[String(bLength)] = [b];
            return a
        }
        a[String(bLength)]!.push(b);
        return a
    }, {} as Record<string, string[]>);
    // console.log(depthAnalysis);
    const depthAnalysis = Object.entries(depthResult)
    .map(([key, value]) => {
        return [key, value.length, value] as [string, number, string[]]
    })
    .sort((a, b) => {
        return a[1] - b[1]
    });
    return depthAnalysis;
}