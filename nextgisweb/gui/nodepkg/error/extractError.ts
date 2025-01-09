import { NetworkResponseError } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { isApiError } from "./util";

export function extractError(error: unknown) {
    if (isApiError(error)) {
        if (error.name && error.message && error.title) {
            return {
                title: error.title,
                message: error.message,
                detail: error.detail || null,
                data:
                    error.data &&
                    typeof error.data === "object" &&
                    error.data.data
                        ? error.data.data
                        : null,
            };
        } else if (error.response) {
            const response = error.response;
            if (
                response.status === undefined ||
                response.status === 0 ||
                response.data === undefined
            ) {
                const fallback = new NetworkResponseError();
                return {
                    title: fallback.title,
                    message: fallback.message,
                    detail: fallback.detail,
                };
            }
        }

        return {
            title:
                typeof error.title === "string"
                    ? error.title
                    : gettext("Unexpected error"),
            message:
                typeof error.message === "string"
                    ? error.message
                    : gettext("Something went wrong."),
        };
    }

    return {
        title: gettext("Error"),
        message: gettext("Something went wrong."),
        stack_trace:
            typeof error === "object" && error !== null
                ? JSON.stringify(error)
                : gettext("An unknown error occurred."),
    };
}
