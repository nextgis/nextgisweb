/** @deprecated It's a confusing global */
declare type Nullable<T> = { [K in keyof T]: T[K] | null };

/** @deprecated It's a confusing global */
type NullableOmit<T, K extends keyof T> = Omit<T, K> & Nullable<Pick<T, K>>;

/** Current component identity like "jsrealm" or "pyramid" */
declare const COMP_ID: string;

/** Fully quallified module name of the current file without an extension like
 * "@nextgisweb/jsrealm/plugin/registry" */
declare const MODULE_NAME: string;

declare function ngwEntry<T = unknown>(name: string): Promise<T>;

declare function ngwExternal<T = unknown>(name: string): Promise<T>;
