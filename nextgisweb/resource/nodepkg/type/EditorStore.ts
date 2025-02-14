import type { LunkwillParam } from "@nextgisweb/pyramid/api";
import type { ResourceWidget } from "@nextgisweb/resource/type/api";

import type { CompositeStore } from "../composite/CompositeStore";

export type Operation = ResourceWidget["operation"];

export interface DumpParams {
    lunkwill: LunkwillParam;
}

export interface EditorStoreOptions {
    composite: CompositeStore;
    operation: Operation;
    resourceId?: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface EditorStore<READ = any, CREATE = READ, UPDATE = CREATE> {
    identity: string;

    uploading?: boolean;

    load: (value: READ) => unknown;

    dump: (val: DumpParams) => CREATE | UPDATE | undefined;

    isValid?: boolean;

    validate?: boolean;

    suggestedDisplayName?: string;
}
