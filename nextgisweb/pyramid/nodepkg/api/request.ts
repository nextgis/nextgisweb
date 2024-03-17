import { LoaderCache } from "@nextgisweb/pyramid/util/loader";

import { cache } from "./cache";
import {
    InvalidResponseError,
    LunkwillError,
    LunkwillRequestCancelled,
    LunkwillRequestFailed,
    NetworksResponseError,
    ServerResponseError,
} from "./error";
import type { ServerResponseErrorData } from "./error";
import type {
    LunkwillData,
    RequestOptions,
    ResponseType,
    ToReturn,
} from "./type";

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

const mediaContentTypes = [
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/tiff",
    "text/csv",
];
const mediaContentTypesRegex = new RegExp(mediaContentTypes.join("|"));

function isMediaContentType(contentType: string): boolean {
    return mediaContentTypesRegex.test(contentType);
}

type QueryScalar = string | number | boolean;
type QueryList = QueryScalar[];
type QueryRecord = Record<string, QueryScalar | QueryList>;

function encodeQuery(
    value: Record<string, QueryScalar | QueryList | QueryRecord>
): string {
    const result = [];
    for (const [k, v] of Object.entries(value)) {
        if (
            typeof v === "string" ||
            typeof v === "number" ||
            typeof v === "boolean"
        ) {
            result.push(`${k}=${encodeURIComponent(v)}`);
        } else if (Array.isArray(v)) {
            result.push(`${k}=${v.map(encodeURIComponent).join(",")}`);
        } else {
            for (const [sk, sv] of Object.entries(v)) {
                const ske = `${k}[${encodeURIComponent(sk)}]`;
                if (
                    typeof sv === "string" ||
                    typeof sv === "number" ||
                    typeof sv === "boolean"
                ) {
                    result.push(`${ske}=${encodeURIComponent(sv)}`);
                } else if (Array.isArray(sv)) {
                    const sve = sv.map(encodeURIComponent);
                    result.push(`${ske}=${sve.join(",")}`);
                }
            }
        }
    }
    return result.join("&");
}

export async function request<
    T = unknown,
    RT extends ResponseType = "json",
    ReturnUrl extends boolean = false,
>(
    path: string,
    options: RequestOptions<RT, ReturnUrl>
): Promise<ToReturn<T, RT, ReturnUrl>> {
    const defaults: RequestOptions<RT, ReturnUrl> = {
        method: "GET",
        credentials: "same-origin",
        headers: {},
    };
    const {
        cache: useCache,
        responseType,
        ...opt
    } = { ...defaults, ...options };

    let urlParams = "";
    if (opt.query !== undefined) {
        urlParams = "?" + encodeQuery(opt.query);
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

    const makeRequest = async (): Promise<ToReturn<T, RT, ReturnUrl>> => {
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
                return lwRespUrl as ToReturn<T, RT, ReturnUrl>;
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

        let body: T | ServerResponseErrorData;

        try {
            const respMedia = respCType && isMediaContentType(respCType);

            if (responseType === "blob" || respMedia) {
                body = (await response.blob()) as T;
            } else if (respJSON) {
                body = await response.json();
            } else {
                throw new InvalidResponseError();
            }
        } catch (e) {
            throw new InvalidResponseError();
        }

        if (400 <= response.status && response.status <= 599) {
            throw new ServerResponseError(body as ServerResponseErrorData);
        }
        return body as ToReturn<T, RT, ReturnUrl>;
    };
    if (opt.method && opt.method.toUpperCase() === "GET" && useCache) {
        const cacheToUse = useCache instanceof LoaderCache ? useCache : cache;
        return cacheToUse.promiseFor(url, makeRequest) as ToReturn<
            T,
            RT,
            ReturnUrl
        >;
    }
    return makeRequest();
}
