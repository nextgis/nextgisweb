import { BaseError } from "@nextgisweb/jsrealm/error";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { LunkwillData } from "./type";

interface BaseAPIErrorOpts<D> {
    title?: string;
    detail?: string;
    data?: D;
}

export class BaseAPIError<D = unknown> extends BaseError {
    readonly message: string;
    readonly title: string;
    readonly detail?: string;
    readonly data?: D;

    protected defaultMessage = gettext("Something went wrong.");
    protected defaultTitle = gettext("Unknown API error");
    protected defaultDetail: string | undefined = undefined;

    constructor(message?: string, options: BaseAPIErrorOpts<D> = {}) {
        super(message);
        this.message = message ?? this.defaultMessage;
        this.title = options.title ?? this.defaultTitle;
        this.detail = options.detail ?? this.defaultDetail;
        this.data = options.data;
    }
}

// prettier-ignore
export class NetworkResponseError extends BaseAPIError<undefined> {
    protected defaultMessage = gettext("There is no response from the server or problem connecting to server.");
    protected defaultTitle = gettext("Network error");
    protected defaultDetail = gettext("Check network connectivity and try again later.");
}

export class InvalidResponseError extends BaseAPIError<undefined> {
    protected defaultMessage = gettext("Something went wrong.");
    protected defaultTitle = gettext("Unexpected server response");
}

export interface ServerResponseErrorData {
    message?: string;
    title?: string;
    detail?: string;
    exception?: string;
    status_code: number;
}

export class ServerResponseError extends BaseAPIError<ServerResponseErrorData> {
    readonly exception?: string;
    readonly status_code: number;

    constructor(data: ServerResponseErrorData) {
        super(data.message, {
            title: data.title,
            detail: data.detail,
            data: data,
        });
        this.exception = data.exception;
        this.status_code = data.status_code;
    }
}

// prettier-ignore
export class LunkwillError extends BaseAPIError<LunkwillData> {
    protected defaultMessage = gettext("Unexpected error while processing long-running request.");
    protected defaultTitle = gettext("Long-running request error");

    constructor(message?: string, data: LunkwillData = {}) {
        super(message, { data });
    }
}

export class LunkwillRequestCancelled extends LunkwillError {
    protected defaultMessage = gettext("Long-running request was cancelled.");
}

export class LunkwillRequestFailed extends LunkwillError {}
