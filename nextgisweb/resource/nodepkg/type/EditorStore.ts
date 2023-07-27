import type { LunkwillParam } from "@nextgisweb/pyramid/api/request";

export type Operations = "create" | "update" | "delete";

interface DumpParams {
    lunkwill: LunkwillParam;
}

export interface EditorStoreOptions {
    composite?: unknown;
    operation?: Operations;
}

export interface EditorStore<V = unknown> {
    identity?: string;

    uploading: boolean;

    load: (value: V) => unknown;

    dump: (val: DumpParams) => V;

    isValid?: boolean;

    suggestedDisplayName?: string;
}
