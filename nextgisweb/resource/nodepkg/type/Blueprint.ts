import type { ResourceClass } from "./Resource";

interface Resource {
    identity: string;
    label: string;
    base_classes: ResourceClass[];
    interfaces: string[];
    scopes: string[];
}

type Permissions = Record<string, unknown>;

interface Scope {
    identity: string;
    label: string;
    permissions: Permissions;
}

interface Resources {
    [key: string]: Resource;
}

type Scopes = Record<string, Scope>;

export interface Blueprint {
    resources: Resources;
    scopes: Scopes;
}
