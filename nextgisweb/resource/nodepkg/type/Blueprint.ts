export interface Blueprint {
    resources: Resources;
    scopes: Scopes;
}

type Scopes = Record<string, Scope>;
type Permissions = Record<string, any>;

interface Scope {
    identity: string;
    label: string;
    permissions: Permissions;
}

interface Resources {
    [key: string]: Resource;
}

interface Resource {
    identity: string;
    label: string;
    base_classes: any[];
    interfaces: any[];
    scopes: string[];
}

