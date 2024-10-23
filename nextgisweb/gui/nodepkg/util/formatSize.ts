const UNITS_FROM_KIB = ["KiB", "MiB", "GiB", "TiB", "PiB"];

export function formatSize(size: number): string {
    let i = 0;
    size /= 1024; // Convert into KB as units starts

    while (size >= 1024 && i < UNITS_FROM_KIB.length) {
        size /= 1024;
        ++i;
    }

    return size.toFixed(1) + " " + UNITS_FROM_KIB[i];
}
