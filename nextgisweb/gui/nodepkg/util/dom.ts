export function mergeClasses(
    ...args: (string | false | undefined)[]
): string | undefined {
    const parts = args.filter((a) => Boolean(a));
    return parts.length > 0 ? parts.join(" ") : undefined;
}
