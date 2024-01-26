import type { LunkwillParam } from "@nextgisweb/pyramid/api";

import type { Composite } from "./Composite";

export type Operation = "create" | "update" | "delete";

interface DumpParams {
    lunkwill: LunkwillParam;
}

export interface EditorStoreOptions {
    composite: Composite;
    operation?: Operation;
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
