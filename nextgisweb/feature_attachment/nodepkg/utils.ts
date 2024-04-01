export function fileSizeToString(size: number) {
    const units = ["B", "KB", "MB", "GB"];
    let i = 0;
    while (size >= 1024) {
        size /= 1024;
        ++i;
    }
    return size.toFixed(0) + " " + units[i];
}
