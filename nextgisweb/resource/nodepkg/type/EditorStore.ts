import type { LunkwillParam } from "@nextgisweb/pyramid/api/request";

export type Operations = "create" | "update" | "delete";

interface DumpParams {
    lunkwill: LunkwillParam;
}

export interface EditorStoreOptions {
    composite: unknown;
    operation: Operations;
}

export interface EditorStore {
    identity: string;

    uploading: boolean;

    load: (value: unknown) => unknown;

    dump: (val: DumpParams) => unknown;

    isValid: boolean;

    suggestedDisplayName?: string;
}
