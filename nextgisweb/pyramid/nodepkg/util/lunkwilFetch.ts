import { routeURL } from "../api";

let nextRequestId = 1;

const pending = new Map<
    number,
    { resolve: (resp: Response) => void; reject: (err: any) => void }
>();

const ws = new WebSocket(routeURL("lunkwill.hmux"));

const wsOpenPromise = new Promise<void>((resolve, reject) => {
    ws.onopen = (event) => {
        console.info("WebSocket opened", event);
        resolve();
    };
    ws.onerror = (event) => {
        console.error("WebSocket error", event);
        reject(new Error("WebSocket error"));
    };
});

ws.onclose = (event) => {
    console.warn("closed", event);
    const err = new Error("WebSocket closed");
    for (const [, { reject }] of pending) {
        reject(err);
    }
    pending.clear();
};

function findHeaderEnd(bytes: Uint8Array): number {
    // \n\n: 0x0a 0x0a
    for (let i = 0; i < bytes.length - 1; i++) {
        if (bytes[i] === 0x0a && bytes[i + 1] === 0x0a) {
            return i + 2;
        }
    }

    return -1;
}

interface ResponseHeaders {
    "Cache-Control": string;
    "Content-Type": string;
    "Date": string;
    "Expires": string;
    "Last-Modified": string;
    "Pragma": string;
    "Server": string;
    "X-Nimbo-Language": string;
    "X-Nimbo-Route-Name": string;
    "X-Nimbo-User": string; // json
}

function parseHeaders(headersText: string): ResponseHeaders {
    const lines = headersText.split(/\r?\n/).slice(1);
    const headers = {} as ResponseHeaders;

    for (const line of lines) {
        const idx = line.indexOf(":");
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim() as keyof ResponseHeaders;
        const value = line.slice(idx + 1).trim();
        if (key in headers) headers[key] = value;
    }

    return headers;
}

ws.onmessage = async (event: MessageEvent) => {
    const data = event.data;

    const buffer = await data.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const headerEnd = findHeaderEnd(bytes);
    if (headerEnd === -1) {
        return;
    }

    const headerBytes = bytes.slice(0, headerEnd);
    const bodyBytes = bytes.slice(headerEnd);

    const decoder = new TextDecoder("utf-8", { fatal: false });
    const respHeaders = decoder.decode(headerBytes);

    const id = Number(/RESPONSE\s+(\d+)/.exec(respHeaders)?.[1]);
    const headers = parseHeaders(respHeaders);

    const pendingReq = pending.get(id);
    if (!pendingReq) return;
    pending.delete(id);

    const contentType = headers["Content-Type"];

    const blob = new Blob([bodyBytes], { type: contentType });

    const resp = new Response(blob, {
        status: 200,
        statusText: "OK",
        headers: { "Content-Type": contentType },
    });

    pendingReq.resolve(resp);
};

export async function lunkwilFetch(
    input: string | URL,
    init?: RequestInit
): Promise<Response> {
    await wsOpenPromise;

    const url =
        typeof input === "string"
            ? new URL(input, location.href)
            : new URL(input.toString(), location.href);
    const path = url.pathname + url.search;

    const id = nextRequestId++;

    const msgLines = [`REQUEST ${id}`, `GET ${path}`];
    const message = msgLines.join("\n");

    const signal = init?.signal ?? null;

    return new Promise<Response>((resolve, reject) => {
        pending.set(id, { resolve, reject });

        const onAbort = () => {
            const pendingReq = pending.get(id);
            if (!pendingReq) return;

            pending.delete(id);

            const abortMessage = `ABORT ${id}`;
            ws.send(abortMessage);

            const error = new DOMException(
                `The operation with ${id} was aborted.`,
                "AbortError"
            );

            pendingReq.reject(error);
        };

        if (signal) {
            if (signal.aborted) {
                onAbort();
                return;
            }
            signal.addEventListener("abort", onAbort, { once: true });
        }

        ws.send(message);
    });
}
