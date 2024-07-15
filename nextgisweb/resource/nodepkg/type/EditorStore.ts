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
export interface EditorStore<READ = any, CREATE = READ, UPDATE = CREATE> {
    identity?: string;

    uploading?: boolean;

    load: (value: READ) => unknown;

    dump: (val: DumpParams) => CREATE | UPDATE | undefined;

    isValid?: boolean;

    suggestedDisplayName?: string;
}
