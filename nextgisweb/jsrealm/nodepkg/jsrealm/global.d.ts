/** Current component identity like "jsrealm" or "pyramid" */
declare const COMP_ID: string;

/** Fully quallified module name of the current file without an extension like
 * "@nextgisweb/jsrealm/plugin/registry" */
declare const MODULE_NAME: string;

declare function ngwEntry<T = unknown>(name: string): Promise<T>;

declare function ngwExternal<T = unknown>(name: string): Promise<T>;
