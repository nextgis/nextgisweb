import { BaseError } from 'make-error';
import CachedJed from '../i18n/CachedJed'

// To break circular dependency use cached version of jed
// which downloads locale data in background.
const i18n = new CachedJed('pyramid');


export class BaseAPIError extends BaseError {
    constructor(message) {
        super(message);
        this.title = i18n.gettext("Unknown API error");
    }
};

export class NetworksResponseError extends BaseAPIError {
    constructor(message) {
        super(message);
        this.title = i18n.gettext("Network error");
    }
};

export class InvalidResponseError extends BaseAPIError {
    constructor(message) {
        super(message);
        this.title = i18n.gettext("Invalid API response");
    }
};

export class ServerResponseError extends BaseAPIError {
    constructor(data) {
        super(data.message);
        this.data = data;
    }
}
