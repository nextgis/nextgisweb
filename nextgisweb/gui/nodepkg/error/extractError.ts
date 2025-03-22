import { BaseAPIError } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

const msgDefaultMessage = gettext("Something went wrong.");
const msgDefaultTitle = gettext("Error");

export interface ErrorInfo {
    message: string;
    title: string;
    detail?: string;
    data?: unknown;
}

export function extractError(error: unknown): ErrorInfo {
    if (error instanceof BaseAPIError) {
        return {
            message: error.message,
            title: error.title,
            detail: error.detail,
            data: error.data,
        };
    } else if (error instanceof Error) {
        return {
            message: error.message,
            title: error.name,
        };
    } else if (error && typeof error === "object") {
        return {
            message:
                "message" in error && typeof error.message === "string"
                    ? error.message
                    : msgDefaultMessage,
            title:
                "title" in error && typeof error.title === "string"
                    ? error.title
                    : msgDefaultTitle,
        };
    }

    return {
        message: msgDefaultMessage,
        title: msgDefaultTitle,
    };
}
