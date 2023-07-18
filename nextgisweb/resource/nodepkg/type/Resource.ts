export type ResourceClass = string;
export type ResourceInterface = string;

interface Owneruser {
    id: number;
}

export interface ResourcePermission {
    action: string;
    principal: Owneruser;
    identity: string;
    scope: string;
    permission: string;
    propagate: boolean;
}

interface ResourceParentDeep {
    id?: number;
}
interface ResourceParent {
    id: number;
    parent: ResourceParentDeep;
}

export interface Resource {
    id: number;
    cls: ResourceClass;
    creation_date: string;
    parent: ResourceParent;
    owner_user: Owneruser;
    permissions: ResourcePermission[];
    keyname?: string;
    display_name: string;
    description?: string;
    children: boolean;
    interfaces: ResourceInterface[];
    scopes: string[];
}

export interface ResourceItem {
    resource: Resource;
}
