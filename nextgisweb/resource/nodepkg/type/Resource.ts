export type ResourceClass = string
export type ResourceInterface = string

export interface ResourceItem {
    resource: Resource;
}

export interface Resource {
    id: number;
    cls: ResourceClass;
    creation_date: string;
    parent: ResourceParent;
    owner_user: Owneruser;
    permissions: ResourcePermission[];
    keyname?: any;
    display_name: string;
    description?: any;
    children: boolean;
    interfaces: ResourceInterface[];
    scopes: string[];
}

export interface ResourcePermission {
    action: string;
    principal: Owneruser;
    identity: string;
    scope: string;
    permission: string;
    propagate: boolean;
}

interface Owneruser {
    id: number;
}

interface ResourceParent {
    id: number;
    parent: ResourceParentDeep;
}

interface ResourceParentDeep {
    id?: any;
}
