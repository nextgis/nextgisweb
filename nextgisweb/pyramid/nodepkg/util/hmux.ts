import { routeURL } from "../api";

let nextRequestId = 1;

const pending = new Map<
    number,
    { resolve: (resp: Response) => void; reject: (err: any) => void }
>();

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
    "Content-Type"?: string;
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

function parseResponse(respHeaders: string): {
    id: number;
    status: number;
    statusText: string;
    headers: ResponseHeaders;
} {
    const lines = respHeaders.split(/\r?\n/);
    const first = lines[0]?.trim() ?? "";
    const second = lines[1]?.trim() ?? "";

    const m = first.match(/^RESPONSE\s+(\d+)\s*$/);
    if (!m) {
        throw new Error("WebSocket response parse error");
    }
    const sm = second.match(/^(\d{3})\s*(.*)$/);
    const headers = parseHeaders(respHeaders);
    return {
        id: Number(m[1]),
        status: sm ? Number(sm[1]) : 200,
        statusText: sm ? sm[2] || "" : "",
        headers,
    };
}

let _ws: WebSocket | null = null;
let _wsOpenPromise: Promise<WebSocket> | null = null;

function createConnection() {
    if (_ws && _ws.readyState === WebSocket.OPEN) {
        return Promise.resolve(_ws);
    }

    if (_wsOpenPromise) {
        return _wsOpenPromise;
    }

    const newWs = new WebSocket(routeURL("lunkwill.hmux"));

    _wsOpenPromise = new Promise<WebSocket>((resolve, reject) => {
        newWs.onopen = () => {
            resolve(newWs);
        };

        newWs.onerror = () => {
            reject(new Error("WebSocket error"));
        };
    }).finally(() => {
        _wsOpenPromise = null;
    });

    newWs.onclose = () => {
        for (const [, { reject }] of pending) {
            reject(new Error("WebSocket closed"));
        }
        pending.clear();

        _ws = null;
        _wsOpenPromise = null;
    };

    newWs.onmessage = async (event: MessageEvent) => {
        const data = event.data;

        const buffer = await data.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        const headerEnd = findHeaderEnd(bytes);

        let headerBytes = bytes;
        let bodyBytes: Uint8Array<ArrayBuffer> | undefined = undefined;

        if (headerEnd !== -1) {
            headerBytes = bytes.slice(0, headerEnd);
            bodyBytes = bytes.slice(headerEnd);
        }

        const decoder = new TextDecoder("utf-8", { fatal: false });
        const respHeaders = decoder.decode(headerBytes);

        const { id, status, statusText, headers } = parseResponse(respHeaders);

        const pendingReq = pending.get(id);
        if (!pendingReq) {
            return;
        }
        pending.delete(id);

        const contentType = headers["Content-Type"];

        const resp = new Response(
            bodyBytes ? new Blob([bodyBytes], { type: contentType }) : null,
            {
                status,
                statusText,
                headers: contentType
                    ? { "Content-Type": contentType }
                    : undefined,
            }
        );
        pendingReq.resolve(resp);
    };
    _ws = newWs;
    return _wsOpenPromise;
}

export async function hmuxFetch(
    input: string | URL,
    init?: RequestInit
): Promise<Response> {
    const ws = await createConnection();

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
            if (!pendingReq) {
                return;
            }

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
