import "whatwg-fetch";

import {
    NetworksResponseError,
    InvalidResponseError,
    ServerResponseError,
    LunkwillError,
    LunkwillRequestCancelled,
    LunkwillRequestFailed,
} from "./error";

export async function request(path, options) {
    const defaults = {
        method: "GET",
        credentials: "same-origin",
        headers: {},
    };
    options = Object.assign({}, defaults, options);

    let urlParams = "";
    if (options.query !== undefined) {
        urlParams = "?" + new URLSearchParams(options.query).toString();
        delete options.query;
    }

    let useLunkwill = false;
    if (options.lunkwill !== undefined) {
        options.lunkwill.toHeaders(options.headers);
        delete options.lunkwill;
        useLunkwill = true;
    }

    if (options.json !== undefined) {
        options.body = JSON.stringify(options.json);
        options.headers["Content-Type"] = "application/json";
        delete options.json;
    }

    const url =
        ngwConfig.applicationUrl +
        (path.startsWith("/") ? "" : "/") +
        path +
        urlParams;

    let response;
    try {
        response = await window.fetch(url, options);
    } catch (e) {
        if (e.name === 'AbortError') {
            throw e;
        }
        throw new NetworksResponseError();
    }

    if (useLunkwill) {
        response = await handleLunkwillResponse(response);
    }

    const respCType = response.headers.get("content-type");
    const respJSON = respCType && (
        respCType.includes("application/json") ||
        respCType.includes("application/vnd.lunkwill.request-summary+json")
    );

    if (!respJSON) {
        throw new InvalidResponseError();
    }

    let body;
    try {
        body = await response.json();
    } catch (e) {
        throw new InvalidResponseError();
    }

    if (400 <= response.status && response.status <= 599) {
        throw new ServerResponseError(body);
    }

    return body;
}

export class LunkwillParam {
    static VALUES = [null, 'suggest', 'require'];

    constructor() {
        this.value = LunkwillParam.VALUES[0];
    }

    update(value, cond = true) {
        if (!cond) {
            return;
        }

        const index = LunkwillParam.VALUES.indexOf(value);
        if (index < 0) {
            throw `Invalid lunkwill option value: ${value}`;
        }

        if (index > LunkwillParam.VALUES.indexOf(this.value)) {
            this.value = value;
        }
    }

    suggest(cond = true) { this.update('suggest', cond) }
    require(cond = true) { this.update('require', cond) }

    toHeaders(headers) {
        if (this.value !== null) {
            headers['X-Lunkwill'] = this.value;
        }
    }
}

async function handleLunkwillResponse(lwResp) {
    const ct = lwResp.headers.get("content-type")
    if (ct === undefined || !ct.includes("application/vnd.lunkwill.request-summary+json")) {
        return lwResp;
    }

    let lwData = await responseJson(lwResp);
    let delay = lwData.delay_ms;
    const retry = lwData.retry_ms !== undefined ? lwData.retry_ms : 2000;
    const sum = `/api/lunkwill/${lwData.id}/summary`;
    const res = `/api/lunkwill/${lwData.id}/response`;

    const sleep = (msec) => new Promise(resolve => setTimeout(resolve, msec))

    let failed = false;
    let ready = false;
    while (!ready) {
        await sleep(failed ? retry : delay);
        failed = false;

        let lwResp, lwData;
        try {
            lwResp = await window.fetch(sum, {credentials: "same-origin"});
            lwData = await lwResp.json();
        } catch (e) {
            failed = true;
            continue;
        }

        switch (lwData.status) {
            case undefined:
                throw new LunkwillError(undefined, lwData);
            case "ready":
                ready = true;
                break;
            case "cancelled":
                throw new LunkwillRequestCancelled(lwData);
            case "failed":
                throw new LunkwillRequestFailed(lwData);
            case "spooled":
            case "processing":
            case "buffering":
                delay = lwData.delay_ms;
                break;
            default:
                throw new LunkwillError(undefined, lwData);
        }
    }

    try {
        return await window.fetch(res, {credentials: "same-origin"});
    } catch (e) {
        throw new NetworksResponseError();
    }
}

async function responseJson(response) {
    try {
        return response.json();
    } catch (e) {
        throw new InvalidResponseError();
    }
}
