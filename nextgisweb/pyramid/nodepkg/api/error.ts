import { BaseError } from "make-error";

import { gettext } from "@nextgisweb/pyramid/i18n";

import type { LunkwillData } from "./type";

export class BaseAPIError extends BaseError {
    title: string;

    constructor(message: string) {
        super(message || gettext("Something went wrong."));
        this.title = gettext("Unknown API error");
    }
}

export class NetworksResponseError extends BaseAPIError {
    readonly detail: string;

    // prettier-ignore
    constructor(message?: string) {
        super(message || gettext("There is no response from the server or problem connecting to server."));
        this.title = gettext("Network error");
        this.detail = gettext("Check network connectivity and try again later.");
    }
}

export class InvalidResponseError extends BaseAPIError {
    constructor(message?: string) {
        super(message || gettext("Something went wrong."));
        this.title = gettext("Unexpected server response");
    }
}

export interface ServerResponseErrorData {
    message: string;
    title?: string;
    detail?: string;
    exception?: string;
}

export class ServerResponseError extends BaseAPIError {
    readonly detail: string | null;
    readonly data: ServerResponseErrorData;

    constructor(data: ServerResponseErrorData) {
        super(data.message);
        this.title = data.title || this.title;
        this.detail = data.detail || null;
        this.data = data;
    }
}

export class LunkwillError extends BaseError {
    readonly title: string;
    readonly data: LunkwillData;

    // prettier-ignore
    constructor(message?: string, data: LunkwillData = {}) {
        super(message || gettext("Unexpected error while processing long-running request."));
        this.title = gettext("Long-running request error");
        this.data = data;
    }
}

export class LunkwillRequestCancelled extends LunkwillError {
    constructor(data: LunkwillData) {
        super(gettext("Long-running request was cancelled."), data);
    }
}

export class LunkwillRequestFailed extends LunkwillError {
    constructor(data: LunkwillData) {
        super(undefined, data);
    }
}
