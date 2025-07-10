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