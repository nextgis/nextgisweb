import "whatwg-fetch";

import {
    NetworksResponseError,
    InvalidResponseError,
    ServerResponseError
} from "./error";


export async function request(path, options) {
    options = Object.assign({}, {
        method: "GET",
        credentials: "same-origin",
        headers: {},
    }, options);

    let urlParams = "";
    if (options.query !== undefined) {
        urlParams = "?" + (new URLSearchParams(options.query)).toString();
        delete options.query;
    }

    if (options.json !== undefined) {
        options.body = JSON.stringify(options.json);
        options.headers["Content-Type"] = "application/json";
        delete options.json;
    }

    const url = ngwConfig.applicationUrl +
        (path.startsWith("/") ? "" : "/") +
        path + urlParams;

    let response;
    try {
        response = await window.fetch(url, options);
    } catch (e) {
        throw new NetworksResponseError();
    }

    const respCType = response.headers.get("content-type");
    const respJSON = respCType && respCType.includes("application/json");

    if (!respJSON) {
        throw new InvalidResponseError();
    };

    let body;
    try {
        body = await response.json();
    } catch (e) {
        throw new InvalidResponseError();
    };

    if (400 <= response.status && response.status <= 599) {
        throw new ServerResponseError(body);
    };

    return body;
}


