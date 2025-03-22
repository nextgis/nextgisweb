export function isAbortError(error: unknown): error is DOMException {
    return Boolean(
        error &&
            typeof error === "object" &&
            "name" in error &&
            error.name === "AbortError"
    );
}
