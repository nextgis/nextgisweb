/** @entrypoint */
import ReactDOM from "react-dom";
import i18n from "@nextgisweb/pyramid/i18n!gui";
import { NetworksResponseError } from "@nextgisweb/pyramid/api";
import { ErrorModal } from "./ErrorModal";
import { ErrorPage } from "./ErrorPage";

function extract(error) {
    // Temporary solution to detect instance of @nextgisweb/pyramid/api/BaseAPIError
    if (error.name && error.message && error.title) {
        return {
            title: error.title,
            message: error.message,
            detail: error.detail || null,
            data: error.data && error.data.data ? error.data.data : null,
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
                title: fallback.error,
                message: fallback.message,
                detail: fallback.detail,
            };
        }
    }

    return {
        title:
            typeof error.title === "string"
                ? error.title
                : i18n.gettext("Unexpected error"),
        message:
            typeof error.message === "string"
                ? error.message
                : i18n.gettext("Something went wrong."),
    };
}

function errorModal(error) {
    const fragmentNode = document.createDocumentFragment();

    setTimeout(() => {
        ReactDOM.render(
            <ErrorModal error={extract(error)}></ErrorModal>,
            fragmentNode
        );
    });
}

export { errorModal, ErrorPage };
