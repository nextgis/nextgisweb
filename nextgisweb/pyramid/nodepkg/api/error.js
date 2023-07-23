import { BaseError } from "make-error";

import { gettext } from "@nextgisweb/pyramid/i18n";

export class BaseAPIError extends BaseError {
    constructor(message) {
        super(message || gettext("Something went wrong."));
        this.title = gettext("Unknown API error");
    }
}

export class NetworksResponseError extends BaseAPIError {
    constructor(message) {
        super(message || gettext("There is no response from the server or problem connecting to server."));
        this.title = gettext("Network error");
        this.detail = gettext("Check network connectivity and try again later.");
    }
}

export class InvalidResponseError extends BaseAPIError {
    constructor(message) {
        super(message || gettext("Something went wrong."));
        this.title = gettext("Unexpected server response");
    }
}

export class ServerResponseError extends BaseAPIError {
    constructor(data) {
        super(data.message);
        this.title = data.title || this.title;
        this.detail = data.detail || null;
        this.data = data;
    }
}

export class LunkwillError extends BaseError {
    constructor(message, data = {}) {
        super(message || gettext("Unexpected error while processing long-running request."));
        this.title = gettext("Long-running request error");
        this.data = data;
    }
}

export class LunkwillRequestCancelled extends LunkwillError {
    constructor(data) {
        super(gettext("Long-running request was cancelled."), data);
    }
}

export class LunkwillRequestFailed extends LunkwillError {
    constructor(data) {
        super(undefined, data);
    }
}
