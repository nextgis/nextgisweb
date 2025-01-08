/* eslint-disable @typescript-eslint/no-explicit-any */

declare module "@nextgisweb/jsrealm/entrypoint" {
    const value: <T = unknown>(name: string) => Promise<T>;
    export = value;
}

declare module "@nextgisweb/jsrealm/locale-loader!" {
    const value: {
        antd: any;
    };
    export = value;
}

/** @deprecated It's a confusing global */
declare type Nullable<T> = { [K in keyof T]: T[K] | null };

/** @deprecated It's a confusing global */
type NullableOmit<T, K extends keyof T> = Omit<T, K> & Nullable<Pick<T, K>>;

/** Current component identity like "jsrealm" or "pyramid" */
declare const COMP_ID: string;

/** Fully quallified module name of the current file without an extension like
 * "@nextgisweb/jsrealm/plugin/registry" */
declare const MODULE_NAME: string;
