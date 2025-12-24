import { assert } from "@nextgisweb/jsrealm/error";

import { routeURL } from "../api";

const asciiDecoder = new TextDecoder("ascii");
const asciiDecode = (data: Uint8Array) => asciiDecoder.decode(data);
const blankToNull = (line: string) => (line === "" ? null : line);

let nextRequestId = 1;

const pending = new Map<
    number,
    { resolve: (resp: Response) => void; reject: (err: any) => void }
>();

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
    newWs.binaryType = "arraybuffer";

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
        const buffer = event.data as ArrayBuffer;
        const bytes = new Uint8Array(buffer);

        let pos = 0;
        const length = bytes.length;

        const readLine = () => {
            for (let i = pos; i < length; i++) {
                if (bytes[i] === 0x0a) {
                    const line = asciiDecode(bytes.slice(pos, i));
                    pos = i + 1;
                    return blankToNull(line);
                } else if (i === length - 1) {
                    const line = asciiDecode(bytes.slice(pos, length));
                    pos = length;
                    return blankToNull(line);
                }
            }
            return null;
        };

        const cmdLine = readLine();
        assert(cmdLine);

        const [cmd, ...args] = cmdLine.split(/\s+/);
        assert(cmd === "RESPONSE", `Unexpected command: ${cmd}`);
        const requestId = Number(args[0]);

        const statusLine = readLine();
        assert(statusLine, "Status line expected");
        const [statusString, statusText] = statusLine.split(/\s+/, 2);
        const status = Number(statusString);

        const headers: [string, string][] = [];
        while (true) {
            const line = readLine();
            if (!line) break;
            const [k, v] = line.split(/\s*:\s*/, 2);
            headers.push([k, v]);
        }

        const body = pos < length ? new DataView(buffer, pos) : null;
        assert(body || status === 204, `Body expected for status ${status}`);

        const pendingReq = pending.get(requestId);
        if (pendingReq) {
            pending.delete(requestId);
            pendingReq.resolve(
                new Response(body, {
                    status,
                    statusText,
                    headers,
                })
            );
        }
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
