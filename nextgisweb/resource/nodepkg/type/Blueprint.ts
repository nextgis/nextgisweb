import type { ResourceClass } from "./Resource";

export interface BlueprintResource {
    identity: string;
    label: string;
    base_classes: ResourceClass[];
    interfaces: string[];
    scopes: string[];
}

interface Permissions {
    identity:
        | "write"
        | "read"
        | "create"
        | "update"
        | "delete"
        | "manage_children"
        | "change_permissions";
    label: string;
}

export interface BlueprintScope {
    identity: string;
    label: string;
    permissions: Record<string, Permissions>;
}

interface Resources {
    [key: ResourceClass]: BlueprintResource;
}

type Scopes = Record<string, BlueprintScope>;

export interface Blueprint {
    resources: Resources;
    scopes: Scopes;
}
