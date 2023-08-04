/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Create a sorter function for sorting objects by a given attribute
 *
 * @template T - The type of objects to sort. Defaults to Record<string, any>.
 * @param {keyof T} attr - The key of the attribute to sort by.
 * @returns {(a: T, b: T) => number} A sorter function that compares two objects.
 * @example
 *
 * const mountains = [
 *     { name: "Mount Elbrus", height: 5642 },
 *     { name: "Mount Kazbek", height: 5033 },
 *     { name: "Mount Narodnaya", height: 4569 },
 *     { name: "Klyuchevskaya Sopka", height: 4750 },
 *     { name: "Mount Belukha", height: 4506 },
 * ];
 *
 * const heightSorter = sorterFactory("height");
 *
 * mountains.sort(heightSorter); // Sorts by height attribute
 */
export function sorterFactory<
    T extends Record<string, any> = Record<string, any>,
>(attr: keyof T): (a: T, b: T) => number {
    return (a: T, b: T) => {
        const va = a[attr];
        const vb = b[attr];
        if (va > vb) return 1;
        if (vb > va) return -1;
        return 0;
    };
}
