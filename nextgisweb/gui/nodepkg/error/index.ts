/** @entrypoint */
import { NetworksResponseError } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import showModal from "../showModal";

import { ErrorModal } from "./ErrorModal";
import type { ErrorModalProps } from "./ErrorModal";
import { ErrorPage } from "./ErrorPage";
import type { ApiError } from "./type";

function extractError(error: ApiError): ApiError {
    // Temporary solution to detect instance of @nextgisweb/pyramid/api/BaseAPIError
    if (error.name && error.message && error.title) {
        return {
            title: error.title,
            message: error.message,
            detail: error.detail || null,
            data:
                error.data && typeof error.data !== "string" && error.data.data
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
            const fallback = new NetworksResponseError();
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

function errorModal(error: ApiError, props?: Partial<ErrorModalProps>) {
    return showModal(ErrorModal, { error: extractError(error), ...props });
}

export { ErrorPage, errorModal, extractError };
