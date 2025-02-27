import showModal from "../showModal";

import { ErrorModal } from "./ErrorModal";
import type { ErrorModalProps } from "./ErrorModal";
import { extractError } from "./extractError";
import { isAbortError, isApiError, isError } from "./util";

function errorModal(error: unknown, props?: Partial<ErrorModalProps>) {
    return showModal(ErrorModal, { error: extractError(error), ...props });
}

export { errorModal, extractError, isAbortError, isApiError, isError };
