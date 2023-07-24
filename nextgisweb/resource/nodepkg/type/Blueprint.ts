import type { ResourceClass } from "./Resource";

export interface BlueprintResource {
    identity: string;
    label: string;
    base_classes: ResourceClass[];
    interfaces: string[];
    scopes: string[];
}

type Permissions = Record<string, unknown>;

export interface BlueprintScope {
    identity: string;
    label: string;
    permissions: Permissions;
}

interface Resources {
    [key: ResourceClass]: BlueprintResource;
}

type Scopes = Record<string, BlueprintScope>;

export interface Blueprint {
    resources: Resources;
    scopes: Scopes;
}
