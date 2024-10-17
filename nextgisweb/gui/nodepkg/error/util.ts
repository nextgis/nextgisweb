import type { ApiError } from "./type";

export function isError(error: unknown): error is Error {
    return typeof error === "object" && error !== null;
}

export function isApiError(error: unknown): error is ApiError {
    return isError(error) && "message" in error && "title" in error;
}

export function isAbortError(error: unknown): error is ApiError {
    return isError(error) && "name" in error && error.name === "AbortError";
}
