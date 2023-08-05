import { LoaderCache } from "@nextgisweb/pyramid/util/loader";

import {
    InvalidResponseError,
    LunkwillError,
    LunkwillRequestCancelled,
    LunkwillRequestFailed,
    NetworksResponseError,
    ServerResponseError,
} from "./error";
import { cache } from "./cache";

import type { ServerResponseErrorData } from "./error";
import type { LunkwillData, RequestOptions, ToReturn } from "./type";

function lunkwillCheckResponse(lwResp: Response) {
    const ct = lwResp.headers.get("content-type");
    return (
        ct !== undefined &&
        ct !== null &&
        ct.includes("application/vnd.lunkwill.request-summary+json")
    );
}

async function responseJson(response: Response) {
    try {
        return response.json();
    } catch (e) {
        throw new InvalidResponseError();
    }
}

async function lunkwillResponseUrl(lwResp: Response) {
    const lwData = await responseJson(lwResp);
    let delay = lwData.delay_ms;
    const retry = lwData.retry_ms !== undefined ? lwData.retry_ms : 2000;
    const sum = `/api/lunkwill/${lwData.id}/summary`;
    const res = `/api/lunkwill/${lwData.id}/response`;

    const sleep = (msec: number) =>
        new Promise((resolve) => setTimeout(resolve, msec));

    let failed = false;
    let ready = false;
    while (!ready) {
        await sleep(failed ? retry : delay);
        failed = false;

        let lwResp: Response;
        let lwData: LunkwillData;
        try {
            lwResp = await fetch(sum, { credentials: "same-origin" });
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

    return res;
}

async function lunkwillFetch(lwRespUrl: string) {
    try {
        return await window.fetch(lwRespUrl, { credentials: "same-origin" });
    } catch (e) {
        throw new NetworksResponseError();
    }
}

export async function request<T = unknown, ReturnUrl extends boolean = false>(
    path: string,
    options: RequestOptions<ReturnUrl>
): Promise<ToReturn<T, ReturnUrl>> {
    const defaults: RequestOptions = {
        method: "GET",
        credentials: "same-origin",
        headers: {},
    };
    const { cache: useCache, ...opt } = { ...defaults, ...options };

    let urlParams = "";
    if (opt.query !== undefined) {
        const queryEntries = Object.entries(opt.query).map(([key, value]) => [
            key,
            String(value),
        ]);
        urlParams = "?" + new URLSearchParams(queryEntries).toString();
        delete opt.query;
    }

    let useLunkwill = false;
    if (opt.lunkwill !== undefined) {
        opt.lunkwill.toHeaders(opt.headers || {});
        delete opt.lunkwill;
        useLunkwill = true;
    }

    const lunkwillReturnUrl = !!opt.lunkwillReturnUrl;
    delete opt.lunkwillReturnUrl;

    if (opt.json !== undefined) {
        opt.body = JSON.stringify(opt.json);
        const headers = opt.headers || {};
        headers["Content-Type"] = "application/json";
        opt.headers = headers;
        delete opt.json;
    }

    let url: string;
    if (opt.global) {
        url = path + urlParams;
    } else {
        url =
            ngwConfig.applicationUrl +
            (path.startsWith("/") ? "" : "/") +
            path +
            urlParams;
    }

    const makeRequest = async (): Promise<ToReturn<T, ReturnUrl>> => {
        let response: Response;
        try {
            response = await fetch(url, opt);
        } catch (e) {
            if ((e as Error).name === "AbortError") {
                throw e;
            }
            throw new NetworksResponseError();
        }

        if (useLunkwill && lunkwillCheckResponse(response)) {
            const lwRespUrl = await lunkwillResponseUrl(response);
            if (lunkwillReturnUrl) {
                return lwRespUrl as ToReturn<T, ReturnUrl>;
            }
            response = await lunkwillFetch(lwRespUrl);
        }

        const respCType = response.headers.get("content-type");
        const respJSON =
            respCType &&
            (respCType.includes("application/json") ||
                respCType.includes(
                    "application/vnd.lunkwill.request-summary+json"
                ));

        if (!respJSON) {
            throw new InvalidResponseError();
        }

        let body: T | ServerResponseErrorData;
        try {
            body = await response.json();
        } catch (e) {
            throw new InvalidResponseError();
        }

        if (400 <= response.status && response.status <= 599) {
            throw new ServerResponseError(body as ServerResponseErrorData);
        }

        return body as ToReturn<T, ReturnUrl>;
    };
    if (opt.method && opt.method.toUpperCase() === "GET" && useCache) {
        const cacheToUse = useCache instanceof LoaderCache ? useCache : cache;
        return cacheToUse.promiseFor(url, makeRequest) as ToReturn<
            T,
            ReturnUrl
        >;
    }
    return makeRequest();
}