import { BaseError } from "make-error";
import { LazyJed } from "../i18n/jed";

// To break circular dependency use cached version of jed
// which downloads locale data in background.
const i18n = new LazyJed("pyramid");

export class BaseAPIError extends BaseError {
    constructor(message) {
        super(message || i18n.gettext("Something went wrong."));
        this.title = i18n.gettext("Unknown API error");
    }
}

export class NetworksResponseError extends BaseAPIError {
    constructor(message) {
        super(message || i18n.gettext("There is no response from the server or problem connecting to server."));
        this.title = i18n.gettext("Network error");
        this.detail = i18n.gettext("Check network connectivity and try again later.");
    }
}

export class InvalidResponseError extends BaseAPIError {
    constructor(message) {
        super(message || i18n.gettext("Something went wrong."));
        this.title = i18n.gettext("Unexpected server response");
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
        super(message || i18n.gettext("Unexpected error while processing long-running request."));
        this.title = i18n.gettext("Long-running request error");
        this.data = data;
    }
}

export class LunkwillRequestCancelled extends LunkwillError {
    constructor(data) {
        super(i18n.gettext("Long-running request was cancelled."), data);
    }
}

export class LunkwillRequestFailed extends LunkwillError {
    constructor(data) {
        super(undefined, data);
    }
}
