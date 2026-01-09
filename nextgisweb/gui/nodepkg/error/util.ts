export function isAbortError(error: unknown): error is DOMException {
    return Boolean(
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "AbortError"
    );
}

export function makeAbortError(message?: string) {
    return new DOMException(message, "AbortError");
}
