import type { LunkwillParam } from "@nextgisweb/pyramid/api";

import type { Composite } from "./Composite";

export type Operation = "create" | "update" | "delete";

export interface DumpParams {
    lunkwill: LunkwillParam;
}

export interface EditorStoreOptions {
    composite: Composite;
    operation: Operation;
    resourceId?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface EditorStore<V = any, D = V> {
    identity?: string;

    uploading?: boolean;

    load: (value: V) => unknown;

    dump: (val: DumpParams) => D;

    isValid?: boolean;

    suggestedDisplayName?: string;
}
