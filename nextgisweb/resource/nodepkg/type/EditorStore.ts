import type { LunkwillParam } from "@nextgisweb/pyramid/api";

export type Operations = "create" | "update" | "delete";

interface DumpParams {
    lunkwill: LunkwillParam;
}

export interface EditorStoreOptions {
    composite?: unknown;
    operation?: Operations;
    resourceId?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface EditorStore<V = any> {
    identity?: string;

    uploading?: boolean;

    load: (value: V) => unknown;

    dump: (val: DumpParams) => V;

    isValid?: boolean;

    suggestedDisplayName?: string;
}
