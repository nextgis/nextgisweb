import type { LunkwillParam } from "@nextgisweb/pyramid/api";
import type { CompositeWidgetOperation } from "@nextgisweb/resource/type/api";

import type { CompositeStore } from "../composite";

/** @deprecated Use {@link CompositeWidgetOperation} instead */
export type Operation = CompositeWidgetOperation;

export interface DumpParams {
    lunkwill: LunkwillParam;
}

export interface EditorStoreOptions {
    composite: CompositeStore;
}

export interface EditorStore<READ = any, CREATE = READ, UPDATE = CREATE> {
    readonly identity: string;

    load: (value: READ) => unknown;

    getValue?: () => CREATE | UPDATE | undefined;

    dump: (val: DumpParams) => CREATE | UPDATE | undefined;

    dirty: boolean;

    counter?: number;

    validate?: boolean;

    isValid: boolean;

    suggestedDisplayName?: string;
}
