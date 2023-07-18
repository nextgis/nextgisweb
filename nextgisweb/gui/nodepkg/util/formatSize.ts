const UNITS_FROM_KIB = ["KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

export function formatSize(size: number): string {
    size /= 1024; // Convert into KB as units starts

    let i = 0;
    while (size >= 1024) {
        size /= 1024;
        ++i;
    }

    return size.toFixed(1) + " " + UNITS_FROM_KIB[i];
}
