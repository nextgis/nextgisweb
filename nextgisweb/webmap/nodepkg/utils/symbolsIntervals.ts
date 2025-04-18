export function restoreSymbols(intervals: string[]): {
    [symbolIndex: number]: boolean;
} {
    const legendMap: Record<number, boolean> = {};

    if (Array.isArray(intervals)) {
        intervals.forEach((interval) => {
            const [startStr, endStr] = interval.split("-");
            const start = Number(startStr);
            const end = endStr !== undefined ? Number(endStr) : start;

            for (let idx = start; idx <= end; idx++) {
                legendMap[idx] = true;
            }
        });
    }
    return legendMap;
}
